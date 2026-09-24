// Berth function `auth-exchange` (verify: key). Trades a verified Apple or Google ID token for a Berth session.
// Env: IRONMATH_AUTH_PEPPER (random, write only), GOOGLE_IOS_CLIENT_IDS (comma separated).
// Berth injects BERTH_API_URL, BERTH_APP, BERTH_SECRET_KEY. None of these reach the phone.

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_AUDIENCE = 'app.ironmath.mobile';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_JWKS = 'https://appleid.apple.com/auth/keys';
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';

export type Provider = 'apple' | 'google';

export interface Claims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  email?: unknown;
  email_verified?: unknown;
  is_private_email?: unknown;
}

export interface Identity {
  provider: Provider;
  sub: string;
  email: string | null;
  emailVerified: boolean;
  privateRelay: boolean;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const truthy = (value: unknown) => value === true || value === 'true';

/**
 * Claim checks on top of the signature check. Pure, so it is unit tested.
 * Apple always needs the nonce; Google needs it when the app sent one.
 */
export async function checkClaims(
  provider: Provider,
  claims: Claims,
  opts: { nowSec: number; nonce?: string | null; googleAudiences: string[] }
): Promise<Identity> {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (provider === 'apple') {
    if (claims.iss !== APPLE_ISSUER) throw new Error('bad_issuer');
    if (!audiences.includes(APPLE_AUDIENCE)) throw new Error('bad_audience');
  } else {
    if (!GOOGLE_ISSUERS.includes(String(claims.iss))) throw new Error('bad_issuer');
    if (!audiences.some((aud) => opts.googleAudiences.includes(String(aud)))) throw new Error('bad_audience');
  }
  if (typeof claims.exp !== 'number' || claims.exp + 60 < opts.nowSec) throw new Error('expired');
  if (typeof claims.iat === 'number' && claims.iat - 300 > opts.nowSec) throw new Error('not_yet_valid');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('no_subject');

  if (provider === 'apple' || opts.nonce) {
    if (!opts.nonce || typeof claims.nonce !== 'string') throw new Error('nonce_missing');
    const expected = provider === 'apple' ? await sha256Hex(opts.nonce) : opts.nonce;
    if (claims.nonce !== expected && claims.nonce !== opts.nonce) throw new Error('nonce_mismatch');
  }

  const email = typeof claims.email === 'string' && claims.email.includes('@') ? claims.email.toLowerCase() : null;
  return {
    provider,
    sub: claims.sub,
    email,
    emailVerified: Boolean(email) && truthy(claims.email_verified),
    privateRelay: truthy(claims.is_private_email) || Boolean(email?.endsWith('@privaterelay.appleid.com')),
  };
}

async function hmacHex(key: string, text: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const env = (name: string) => (globalThis as any).Deno.env.get(name) as string | undefined;
  const pepper = env('IRONMATH_AUTH_PEPPER');
  const secret = env('BERTH_SECRET_KEY');
  const base = `${env('BERTH_API_URL')}/apps/${env('BERTH_APP')}`;
  if (!pepper || pepper.length < 32 || !secret) return json({ error: 'not_configured' }, 500);

  let body: { provider?: string; idToken?: string; nonce?: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const provider = body.provider === 'apple' || body.provider === 'google' ? body.provider : null;
  if (!provider || typeof body.idToken !== 'string' || body.idToken.length > 8192) {
    return json({ error: 'invalid_body' }, 400);
  }

  let identity: Identity;
  try {
    const { createRemoteJWKSet, jwtVerify } = await import('npm:jose@5.9.6');
    const jwks = createRemoteJWKSet(new URL(provider === 'apple' ? APPLE_JWKS : GOOGLE_JWKS));
    const { payload } = await jwtVerify(body.idToken, jwks, { algorithms: ['RS256'] });
    const googleAudiences = (env('GOOGLE_IOS_CLIENT_IDS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    identity = await checkClaims(provider, payload as Claims, {
      nowSec: Math.floor(Date.now() / 1000),
      nonce: typeof body.nonce === 'string' ? body.nonce : null,
      googleAudiences,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid_token';
    return json({ error: 'invalid_token', reason: reason.slice(0, 80) }, 401);
  }

  const admin = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(base + path, {
      ...init,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  };
  const q = encodeURIComponent;

  type Link = { user_id: string; login_email: string; email: string | null };
  const found = await admin(
    `/tables/identities/rows?provider=eq.${q(provider)}&sub=eq.${q(identity.sub)}&select=user_id,login_email,email&limit=1`
  );
  let link: Link | null = found.data?.rows?.[0] ?? null;

  if (!link && identity.emailVerified && identity.email && !identity.privateRelay) {
    const byEmail = await admin(
      `/tables/identities/rows?email=eq.${q(identity.email)}&email_verified=eq.true&select=user_id,login_email,email&limit=1`
    );
    link = byEmail.data?.rows?.[0] ?? null;
  }

  const name = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
  if (!link) {
    const handle = (await hmacHex(pepper, `id:${provider}:${identity.sub}`)).slice(0, 32);
    const loginEmail = `u${handle}@users.ironmath.app`;
    const created = await admin('/auth/users', {
      method: 'POST',
      body: JSON.stringify({
        email: loginEmail,
        password: await hmacHex(pepper, `pw:${loginEmail}`),
        data: { email: identity.email, name: name || null },
      }),
    });
    let userId: string | undefined = created.data?.user?.id;
    if (!userId) {
      if (created.status !== 409) return json({ error: 'create_failed' }, 502);
      const users = await admin(`/auth/users?email=${q(loginEmail)}`);
      userId = (users.data?.users ?? []).find((u: { email: string }) => u.email === loginEmail)?.id;
      if (!userId) return json({ error: 'create_failed' }, 502);
    }
    link = { user_id: userId, login_email: loginEmail, email: identity.email };
  }

  const saved = await admin('/tables/identities/rows?upsert=true&on_conflict=provider,sub', {
    method: 'POST',
    body: JSON.stringify([
      {
        provider,
        sub: identity.sub,
        user_id: link.user_id,
        login_email: link.login_email,
        email: identity.email,
        email_verified: identity.emailVerified,
        last_seen: Date.now(),
      },
    ]),
  });
  if (saved.status >= 300) return json({ error: 'link_failed' }, 502);

  if (name) {
    await admin(`/auth/users/${q(link.user_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: { email: identity.email ?? link.email, name } }),
    });
  }

  const session = await admin('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: link.login_email, password: await hmacHex(pepper, `pw:${link.login_email}`) }),
  });
  if (session.status !== 200 || !session.data?.access_token) return json({ error: 'session_failed' }, 502);

  return json({
    access_token: session.data.access_token,
    refresh_token: session.data.refresh_token,
    expires_in: session.data.expires_in,
    user: { id: link.user_id, email: identity.email ?? link.email ?? null, name: name || null, provider },
  });
};
