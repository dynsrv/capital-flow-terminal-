// Credential + settings resolution.
// Priority: value saved on the Admin page (KV `admin:keys`) > environment secret > none.
// Admin values are stored in KV only; they are never written into logs or responses in full.

export const CREDENTIAL_FIELDS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API key', group: 'AI', help: 'Enables AI explanations in Intelligence (signal, evidence, cause, impact, confidence, what to watch).', test: true },
  { key: 'ANTHROPIC_MODEL', label: 'Anthropic model', group: 'AI', help: 'Model ID used for explanations. Default: claude-sonnet-5-5.', secret: false, placeholder: 'claude-sonnet-5-5' },
  { key: 'AI_AUTO_REFRESH', label: 'Automatic AI refresh', group: 'AI', help: 'off: only when you press Refresh. daily: once a day after the US close. on-change: on the daily run, only if the regime, stress band or high-severity anomalies changed since the last reading.', secret: false, placeholder: 'off', options: ['off', 'daily', 'on-change'] },
  { key: 'NEWS_AI_CURATION', label: 'AI news curation', group: 'AI', help: 'off: keyword rules only. manual: curate when you press the button in Admin. daily: also run with the daily job.', secret: false, placeholder: 'off', options: ['off', 'manual', 'daily'] },
  { key: 'EXA_API_KEY', label: 'Exa API key', group: 'Search', help: 'News search for AI citations via exa.ai.', test: true },
  { key: 'PARALLEL_API_KEY', label: 'Parallel API key', group: 'Search', help: 'News search for AI citations via parallel.ai.', test: true },
  { key: 'SEARCH_PROVIDER', label: 'Preferred search provider', group: 'Search', help: 'auto (Exa first, Parallel as fallback), exa, or parallel.', secret: false, placeholder: 'auto', options: ['auto', 'exa', 'parallel'] },
  { key: 'FRED_API_KEY', label: 'FRED API key', group: 'Data', help: 'Optional. Without it the keyless FRED CSV export is used (same data, lower rate limit).', test: true },
  { key: 'EIA_API_KEY', label: 'EIA API key', group: 'Data', help: 'Optional. Adds official EIA spot prices for WTI, Brent and Henry Hub.', test: true },
  { key: 'COINGECKO_API_KEY', label: 'CoinGecko API key', group: 'Data', help: 'Optional. Raises crypto rate limits and unlocks history beyond 365 days.', test: true },
  { key: 'MARKET_DATA_API_KEY', label: 'Market data key (Massive / Polygon)', group: 'Data', help: 'Optional. Reserved for a licensed real-time equities feed.', test: true },
];

const ADMIN_DOC = 'admin/keys';
export async function loadAdminKeys(env) {
  if (env.__store) { try { return (await env.__store.getJSON(ADMIN_DOC, { secure: true })) || {}; } catch (e) { /* fall back */ } }
  if (!env.CACHE || typeof env.CACHE.get !== 'function') return {};
  try { return (await env.CACHE.get('admin:keys', 'json')) || {}; } catch (e) { return {}; }
}

export async function saveAdminKeys(env, updates) {
  const current = await loadAdminKeys(env);
  for (const [k, v] of Object.entries(updates)) {
    if (!CREDENTIAL_FIELDS.find(f => f.key === k)) continue;
    if (v === null || v === '') delete current[k]; else current[k] = String(v).trim();
  }
  if (env.__store && env.__store.persistent) { await env.__store.putJSON(ADMIN_DOC, current, { secure: true }); return current; }
  if (!env.CACHE || typeof env.CACHE.put !== 'function') throw new Error('No persistent store is configured; credentials cannot be saved');
  await env.CACHE.put('admin:keys', JSON.stringify(current));
  return current;
}

export async function getConfig(env) {
  const admin = await loadAdminKeys(env);
  const get = (k) => admin[k] || env[k] || '';
  // legacy single search key → provider-specific slot
  const legacy = admin.SEARCH_API_KEY || env.SEARCH_API_KEY || '';
  const legacyProv = (admin.SEARCH_PROVIDER || env.SEARCH_PROVIDER || 'exa').toLowerCase();
  return {
    appName: env.APP_NAME || 'Capital Flow Terminal',
    demoMode: String(env.DEMO_MODE || '').toLowerCase() === 'true',
    ttl: {
      quotes: Number(env.TTL_QUOTES || 60),
      history: Number(env.TTL_HISTORY || 900),
      macro: Number(env.TTL_MACRO || 3600),
    },
    keys: (() => { const k = Object.fromEntries(CREDENTIAL_FIELDS.map(f => [f.key, get(f.key)])); if (legacy) { if (legacyProv === 'parallel' && !k.PARALLEL_API_KEY) k.PARALLEL_API_KEY = legacy; else if (!k.EXA_API_KEY) k.EXA_API_KEY = legacy; } return k; })(),
    adminConfigured: Boolean(env.ADMIN_TOKEN),
  };
}

export function maskSecret(v) {
  if (!v) return '';
  if (v.length <= 8) return '••••';
  return v.slice(0, 3) + '••••' + v.slice(-4);
}

export function checkAdminAuth(request, env) {
  if (!env.ADMIN_TOKEN) return { ok: false, reason: 'ADMIN_TOKEN secret is not set. Run: wrangler secret put ADMIN_TOKEN (or set it in .dev.vars / local env).' };
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : new URL(request.url).searchParams.get('token') || '';
  if (token !== env.ADMIN_TOKEN) return { ok: false, reason: 'Invalid admin token' };
  return { ok: true };
}
