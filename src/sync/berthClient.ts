export interface BerthUser {
  id: string;
  email: string | null;
  data: Record<string, unknown>;
}

export interface BerthSession {
  user: BerthUser;
  accessToken: string;
  refreshToken: string;
  /** Unix ms when the access token stops working. */
  expiresAt: number;
}

export interface SessionStore {
  load(): Promise<BerthSession | null>;
  save(session: BerthSession | null): Promise<void>;
}

export class BerthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSec: number | null = null
  ) {
    super(message);
  }
}

type RawSession = {
  user: { id: string; email: string | null; data?: Record<string, unknown> };
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

const PAGE = 500;

export function friendlyAuthError(error: unknown): string {
  if (error instanceof BerthError) {
    const code = error.code.toLowerCase();
    const message = (error.message || '').toLowerCase();
    if (code === 'invalid_token' || code === 'signed_out') {
      return 'Sign-in could not be verified. Try again.';
    }
    if (
      code === 'invalid_code' ||
      code === 'code_invalid' ||
      message.includes('invalid code') ||
      message.includes('wrong code') ||
      (message.includes('code') && (message.includes('wrong') || message.includes('expired')))
    ) {
      if (message.includes('expired') && !message.includes('wrong')) {
        return 'That code expired. Request a new one.';
      }
      return 'That code is wrong. Check the email and try again.';
    }
    if (code === 'expired_code' || code === 'code_expired' || (message.includes('expired') && message.includes('code'))) {
      return 'That code expired. Request a new one.';
    }
    if (error.status === 409 || code === 'conflict' || code === 'email_taken') {
      return 'That email already has an account. Sign in instead.';
    }
    if (code === 'email_not_verified') {
      return 'Confirm your email before signing in. We can send a new code.';
    }
    if (error.status === 429 || code === 'rate_limited' || code === 'too_many_requests') {
      const wait = error.retryAfterSec && error.retryAfterSec > 0 ? error.retryAfterSec : 60;
      return `Too many tries. Wait ${wait} seconds and try again.`;
    }
    if (error.status === 401 || code === 'invalid_credentials' || code === 'unauthorized') {
      return 'That email and password do not match.';
    }
    if (error.status === 400 && (message.includes('password') || code.includes('password'))) {
      return 'Use a stronger password: at least 8 characters with a letter and a number.';
    }
    return error.message || 'Something went wrong. Try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No connection to the sync server. Your data is safe on this phone.';
}

function asUser(raw: RawSession['user']): BerthUser {
  return {
    id: raw.id,
    email: raw.email,
    data: raw.data && typeof raw.data === 'object' ? raw.data : {},
  };
}

export class BerthClient {
  private session: BerthSession | null = null;
  private loaded = false;
  private refreshing: Promise<BerthSession | null> | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly publishableKey: string,
    private readonly store: SessionStore
  ) {}

  async currentSession(): Promise<BerthSession | null> {
    if (!this.loaded) {
      this.session = await this.store.load();
      this.loaded = true;
    }
    return this.session;
  }

  private async setSession(session: BerthSession | null) {
    this.session = session;
    this.loaded = true;
    await this.store.save(session);
  }

  private async raw(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) {
    const headers: Record<string, string> = { apikey: this.publishableKey };
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (init.token) {
      headers.Authorization = `Bearer ${init.token}`;
    }
    const res = await fetch(this.baseUrl + path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const retry = Number(res.headers.get('retry-after'));
      throw new BerthError(
        data?.message ?? `Request failed (${res.status})`,
        res.status,
        data?.error ?? 'http_error',
        Number.isFinite(retry) && retry > 0 ? retry : null
      );
    }
    return data;
  }

  private async adopt(raw: RawSession): Promise<BerthSession> {
    const session: BerthSession = {
      user: asUser(raw.user),
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      expiresAt: Date.now() + Math.max(60, Number(raw.expires_in) || 3600) * 1000,
    };
    await this.setSession(session);
    return session;
  }

  async signUp(email: string, password: string, data?: Record<string, unknown>) {
    const body: Record<string, unknown> = { email: email.trim(), password };
    if (data && Object.keys(data).length > 0) {
      body.data = data;
    }
    const raw = await this.raw('/auth/signup', { method: 'POST', body });
    // Do not adopt an unverified session: sync waits until the email code succeeds.
    if (raw?.verification_required || !raw?.access_token) {
      return { session: null as BerthSession | null, verificationRequired: true as const };
    }
    return { session: await this.adopt(raw), verificationRequired: false as const };
  }

  async signIn(email: string, password: string) {
    const raw = await this.raw('/auth/login', { method: 'POST', body: { email: email.trim(), password } });
    if (raw?.verification_required) {
      return { session: null as BerthSession | null, verificationRequired: true as const };
    }
    return { session: await this.adopt(raw), verificationRequired: false as const };
  }

  async requestCode(email: string) {
    await this.raw('/auth/code', { method: 'POST', body: { email: email.trim() } });
  }

  /**
   * Forgot-password request. Prefers /auth/recover (same 202 whether or not the
   * address exists). Falls back to /auth/code when recover is not deployed yet.
   */
  async requestReset(email: string) {
    try {
      await this.raw('/auth/recover', { method: 'POST', body: { email: email.trim() } });
      return;
    } catch (error) {
      if (!(error instanceof BerthError && error.status === 404)) {
        throw error;
      }
    }
    try {
      await this.requestCode(email);
    } catch (error) {
      if (
        error instanceof BerthError &&
        (error.status === 404 || error.code === 'not_found' || error.code === 'user_not_found' || error.code === 'no_user')
      ) {
        return;
      }
      throw error;
    }
  }

  /** Apple or Google id token, checked by the auth-exchange function. Secret stays on Berth. */
  async exchangeIdToken(provider: 'apple' | 'google', idToken: string, nonce: string | null, fullName?: string) {
    const raw = await this.raw('/functions/auth-exchange', {
      method: 'POST',
      body: {
        provider,
        idToken,
        nonce,
        fullName: fullName?.trim() || undefined,
      },
    });
    const user = raw?.user ?? {};
    const data =
      user.data && typeof user.data === 'object'
        ? { ...user.data, ...(user.name ? { name: user.name } : {}) }
        : { name: typeof user.name === 'string' ? user.name : null };
    return this.adopt({
      user: { id: user.id, email: user.email ?? null, data },
      access_token: raw.access_token,
      refresh_token: raw.refresh_token,
      expires_in: raw.expires_in,
    });
  }

  async verifyCode(email: string, code: string) {
    return this.adopt(
      await this.raw('/auth/verify', { method: 'POST', body: { email: email.trim(), code: code.replace(/\D/g, '') } })
    );
  }

  /** Test helper: force a refresh of the stored session. */
  async refreshSession(): Promise<BerthSession | null> {
    return this.refresh();
  }

  /** Refresh tokens rotate and a reused one revokes the whole chain, so only one refresh runs at a time. */
  private refresh(): Promise<BerthSession | null> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        const current = await this.currentSession();
        if (!current) {
          return null;
        }
        try {
          return await this.adopt(
            await this.raw('/auth/refresh', { method: 'POST', body: { refresh_token: current.refreshToken } })
          );
        } catch (error) {
          if (error instanceof BerthError && (error.status === 401 || error.status === 400)) {
            await this.setSession(null);
            return null;
          }
          throw error;
        }
      })().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async token(): Promise<string> {
    let session = await this.currentSession();
    if (session && session.expiresAt - Date.now() < 60_000) {
      session = await this.refresh();
    }
    if (!session) {
      throw new BerthError('Signed out', 401, 'signed_out');
    }
    return session.accessToken;
  }

  /** A signed-in request. One retry after a refresh if the token was rejected. */
  async authed(path: string, init: { method?: string; body?: unknown } = {}) {
    try {
      return await this.raw(path, { ...init, token: await this.token() });
    } catch (error) {
      if (error instanceof BerthError && error.status === 401 && error.code !== 'signed_out') {
        const next = await this.refresh();
        if (!next) {
          throw new BerthError('Signed out', 401, 'signed_out');
        }
        return this.raw(path, { ...init, token: next.accessToken });
      }
      throw error;
    }
  }

  async me(): Promise<BerthUser> {
    const data = await this.authed('/auth/me');
    const user = asUser(data?.user ?? data);
    const session = await this.currentSession();
    if (session) {
      session.user = user;
      await this.setSession(session);
    }
    return user;
  }

  async updateMe(patch: { password?: string; data?: Record<string, unknown> }): Promise<BerthUser> {
    const body: Record<string, unknown> = {};
    if (patch.password) {
      body.password = patch.password;
    }
    if (patch.data) {
      body.data = patch.data;
    }
    const data = await this.authed('/auth/me', { method: 'PATCH', body });
    const user = asUser(data?.user ?? data);
    const session = await this.currentSession();
    if (session) {
      session.user = user;
      await this.setSession(session);
    }
    return user;
  }

  async signOut(all = false) {
    const session = await this.currentSession();
    if (session) {
      try {
        await this.raw('/auth/logout', { method: 'POST', body: { all }, token: session.accessToken });
      } catch {
        // Signing out locally still counts when the network is gone.
      }
    }
    await this.setSession(null);
  }

  async deleteAccount() {
    await this.authed('/functions/delete-account', { method: 'POST', body: {} });
    await this.setSession(null);
  }

  async listAll<T>(table: string, select: string): Promise<T[]> {
    const rows: T[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 100; page += 1) {
      const query = new URLSearchParams({ select, limit: String(PAGE) });
      if (cursor) {
        query.set('cursor', cursor);
      }
      const data = await this.authed(`/tables/${table}/rows?${query.toString()}`);
      rows.push(...((data?.rows ?? []) as T[]));
      cursor = data?.next_cursor ?? null;
      if (!cursor) {
        break;
      }
    }
    return rows;
  }

  async upsert(table: string, rows: object[], onConflict: string) {
    for (let i = 0; i < rows.length; i += PAGE) {
      await this.authed(`/tables/${table}/rows?upsert=true&on_conflict=${onConflict}`, {
        method: 'POST',
        body: rows.slice(i, i + PAGE),
      });
    }
  }
}
