const MAX_SEARCH = 4000;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

function memory() {
  if (!globalThis.__ironmathHud) {
    globalThis.__ironmathHud = { body: null };
  }
  return globalThis.__ironmathHud;
}

function json(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function gistId() {
  return String(process.env.IRONMATH_HUD_GIST_ID || '').trim();
}

function gistToken() {
  return String(process.env.IRONMATH_HUD_GITHUB_TOKEN || '').trim();
}

function loadEngine() {
  try {
    return require('../engine.js');
  } catch {
    return null;
  }
}

function normalizeTimer(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const duration = Number(raw.duration);
  const remaining = Number(raw.remaining);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) {
    return null;
  }
  if (!Number.isFinite(remaining) || remaining < 0) {
    return null;
  }
  let end = raw.end === null || raw.end === undefined ? null : Number(raw.end);
  if (end !== null && !Number.isFinite(end)) {
    end = null;
  }
  return {
    end,
    remaining: Math.min(remaining, duration),
    duration,
    running: raw.running === true,
  };
}

function enrich(body) {
  if (!body || !body.search) {
    return body;
  }
  const engine = loadEngine();
  if (!engine || typeof engine.hudFromSearch !== 'function') {
    return body;
  }
  try {
    const parsed = engine.hudFromSearch(body.search);
    const hud = parsed.hud || {};
    return {
      ok: true,
      search: body.search,
      view: body.view === 'convert' ? 'convert' : parsed.view || 'load',
      ts: body.ts,
      targetLabel: hud.targetLabel || '',
      loadedLabel: hud.loadedLabel || '',
      otherLoadedLabel: hud.otherLoadedLabel || '',
      eachSide: hud.eachSide || '',
      miss: hud.miss || '',
      exact: !!hud.exact,
      plates: Array.isArray(hud.plates) ? hud.plates : [],
      warmup: hud.warmup || '',
      timer: normalizeTimer(body.timer),
    };
  } catch {
    return body;
  }
}

function normalizeSearch(raw) {
  let value = String(raw || '').trim();
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).search;
    } catch {
      return '';
    }
  }
  if (value.charAt(0) !== '?') {
    value = '?' + value;
  }
  if (value.length > MAX_SEARCH) {
    return '';
  }
  try {
    void new URLSearchParams(value.slice(1)).toString();
  } catch {
    return '';
  }
  return value;
}

function normalizeBody(input) {
  const search = normalizeSearch(input && input.search);
  if (!search) {
    return null;
  }
  const view = input && input.view === 'convert' ? 'convert' : 'load';
  const ts = Number(input && input.ts);
  return enrich({
    ok: true,
    search,
    view,
    ts: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
    timer: normalizeTimer(input && input.timer),
  });
}

async function readGist() {
  const id = gistId();
  const token = gistToken();
  if (!id || !token) {
    return null;
  }
  const response = await fetch('https://api.github.com/gists/' + id + '?t=' + Date.now(), {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'User-Agent': 'ironmath-glasses',
      'Cache-Control': 'no-cache',
    },
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const raw = data && data.files && data.files['hud.json'] && data.files['hud.json'].content;
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeGist(body) {
  const id = gistId();
  const token = gistToken();
  if (!id || !token) {
    return false;
  }
  const response = await fetch('https://api.github.com/gists/' + id, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'ironmath-glasses',
    },
    body: JSON.stringify({
      files: {
        'hud.json': { content: JSON.stringify(body) },
      },
    }),
  });
  return response.ok;
}

function newer(left, right) {
  const a = left && Number(left.ts) ? Number(left.ts) : 0;
  const b = right && Number(right.ts) ? Number(right.ts) : 0;
  if (a === b) {
    return left && left.search ? left : right;
  }
  return a > b ? left : right;
}

async function readHud() {
  const slot = memory();
  let stored = null;
  try {
    stored = await readGist();
  } catch {
    stored = null;
  }
  const picked = newer(stored && stored.search ? stored : null, slot.body);
  if (picked && picked.search) {
    const snapshot = enrich(picked);
    slot.body = snapshot;
    return snapshot;
  }
  return null;
}

async function writeHud(body) {
  const snapshot = enrich(body);
  memory().body = snapshot;
  try {
    await writeGist(snapshot);
  } catch {
    // Shared gist is best effort. GET still prefers gist when it is readable.
  }
  return snapshot;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return null;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    if (req.method === 'GET') {
      const body = await readHud();
      json(res, 200, body || { ok: true, search: '', view: 'load', ts: 0, plates: [], timer: null });
      return;
    }
    if (req.method === 'POST') {
      const incoming = await readBody(req);
      const body = normalizeBody(incoming || {});
      if (!body) {
        json(res, 400, { ok: false, error: 'search required' });
        return;
      }
      const stored = await writeHud(body);
      json(res, 200, stored);
      return;
    }
    json(res, 405, { ok: false, error: 'GET or POST only' });
  } catch (error) {
    json(res, 200, { ok: false, error: String((error && error.message) || error) });
  }
};
