import { afterEach, describe, expect, it, vi } from 'vitest';
import { BerthClient, type BerthSession, type SessionStore } from './berthClient';

function memoryStore(initial: BerthSession | null = null): SessionStore {
  let session = initial;
  return {
    load: async () => session,
    save: async (next) => {
      session = next;
    },
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('BerthClient session', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes on 401 then signs out when refresh fails', async () => {
    const store = memoryStore({
      user: { id: 'u1', email: 'a@b.com', data: {} },
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 60_000,
    });
    const client = new BerthClient('https://example.test/v1/apps/ironmath', 'bpk_test', store);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/me') && init?.headers && String((init.headers as Record<string, string>).Authorization).includes('old-access')) {
        return jsonResponse(401, { error: 'unauthorized', message: 'expired' });
      }
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse(401, { error: 'unauthorized', message: 'bad refresh' });
      }
      return jsonResponse(500, { error: 'unexpected' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(client.me()).rejects.toMatchObject({ code: 'signed_out' });
    expect(await client.currentSession()).toBeNull();
  });

  it('refreshes and retries an authed call', async () => {
    const store = memoryStore({
      user: { id: 'u1', email: 'a@b.com', data: {} },
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 60_000,
    });
    const client = new BerthClient('https://example.test/v1/apps/ironmath', 'bpk_test', store);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
      if (url.endsWith('/auth/me') && auth.includes('old-access')) {
        return jsonResponse(401, { error: 'unauthorized', message: 'expired' });
      }
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse(200, {
          user: { id: 'u1', email: 'a@b.com', data: { name: 'Mike' } },
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        });
      }
      if (url.endsWith('/auth/me') && auth.includes('new-access')) {
        return jsonResponse(200, { user: { id: 'u1', email: 'a@b.com', data: { name: 'Mike' } } });
      }
      return jsonResponse(500, { error: 'unexpected', url, auth });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = await client.me();
    expect(user.data.name).toBe('Mike');
    const session = await client.currentSession();
    expect(session?.accessToken).toBe('new-access');
    expect(session?.refreshToken).toBe('new-refresh');
  });

  it('logout all=true posts all true then clears local session', async () => {
    const store = memoryStore({
      user: { id: 'u1', email: 'a@b.com', data: {} },
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
    });
    const client = new BerthClient('https://example.test/v1/apps/ironmath', 'bpk_test', store);
    const fetchMock = vi.fn(async () => jsonResponse(200, { signed_out: true }));
    vi.stubGlobal('fetch', fetchMock);

    await client.signOut(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/apps/ironmath/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ all: true }),
      })
    );
    expect(await client.currentSession()).toBeNull();
  });

  it('reset prefers recover then falls back to code, and exchange stores the session', async () => {
    const store = memoryStore();
    const client = new BerthClient('https://example.test/v1/apps/ironmath', 'bpk_test', store);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/recover')) {
        return jsonResponse(404, { error: 'not_found' });
      }
      if (url.endsWith('/auth/code')) {
        return jsonResponse(404, { error: 'user_not_found', message: 'no such user' });
      }
      if (url.endsWith('/functions/auth-exchange')) {
        const body = JSON.parse(String(init?.body));
        expect(body.provider).toBe('apple');
        expect(body.idToken).toBe('id-token');
        return jsonResponse(200, {
          access_token: 'apple-access',
          refresh_token: 'apple-refresh',
          expires_in: 3600,
          user: { id: 'u-apple', email: 'a@icloud.com', name: 'Mike' },
        });
      }
      return jsonResponse(500, { error: 'unexpected', url });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.requestReset('missing@example.com');
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      'https://example.test/v1/apps/ironmath/auth/recover',
      'https://example.test/v1/apps/ironmath/auth/code',
    ]);
    const session = await client.exchangeIdToken('apple', 'id-token', 'nonce', 'Mike');
    expect(session.user.email).toBe('a@icloud.com');
    expect(session.user.data.name).toBe('Mike');
    expect(session.accessToken).toBe('apple-access');
  });

  it('maps signup verification_required without storing a session', async () => {
    const store = memoryStore();
    const client = new BerthClient('https://example.test/v1/apps/ironmath', 'bpk_test', store);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(201, {
          verification_required: true,
          access_token: 'should-not-store',
          refresh_token: 'nope',
          expires_in: 3600,
          user: { id: 'u1', email: 'a@b.com', data: {} },
        })
      )
    );
    const result = await client.signUp('a@b.com', 'IronMath1', { name: 'Mike' });
    expect(result.verificationRequired).toBe(true);
    expect(result.session).toBeNull();
    expect(await client.currentSession()).toBeNull();
  });
});
