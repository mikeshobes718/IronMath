// Deployed with verify=user, so Berth only runs it for a signed-in user and
// sets Berth-User-Id itself. The secret key is injected by Berth and never
// leaves the server.
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }
  const userId = req.headers.get('Berth-User-Id');
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const base = Deno.env.get('BERTH_API_URL');
  const app = Deno.env.get('BERTH_APP');
  const headers = { Authorization: `Bearer ${Deno.env.get('BERTH_SECRET_KEY')}` };
  const links = await fetch(
    `${base}/apps/${app}/tables/identities/rows?user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers }
  );
  if (!links.ok && links.status !== 404) {
    return Response.json({ error: 'delete_failed', status: links.status }, { status: 502 });
  }
  const res = await fetch(`${base}/apps/${app}/auth/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 404) {
    return Response.json({ error: 'delete_failed', status: res.status }, { status: 502 });
  }
  return Response.json({ deleted: true });
};
