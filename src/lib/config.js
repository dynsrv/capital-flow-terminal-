// Credential + settings resolution.
// Priority: value saved on the Admin page (KV `admin:keys`) > environment secret > none.
// Admin values are stored in KV only; they are never written into logs or responses in full.

export const CREDENTIAL_FIELDS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API key', group: 'AI', help: 'Enables AI Market Intelligence explanations (Signal → Evidence → Cause → Impact).' },
  { key: 'SEARCH_API_KEY', label: 'Web search API key (Exa or Parallel)', group: 'Search', help: 'Lets the AI module cite recent news as evidence. Set SEARCH_PROVIDER to exa or parallel.' },
  { key: 'SEARCH_PROVIDER', label: 'Search provider (exa | parallel)', group: 'Search', help: 'Which search API the key above belongs to.', secret: false },
  { key: 'FRED_API_KEY', label: 'FRED API key', group: 'Data', help: 'Optional. Without it the keyless fredgraph CSV endpoint is used (same data, lower rate limit).' },
  { key: 'EIA_API_KEY', label: 'EIA API key', group: 'Data', help: 'Optional. Adds EIA official spot prices for WTI, Brent and Henry Hub.' },
  { key: 'COINGECKO_API_KEY', label: 'CoinGecko demo/pro API key', group: 'Data', help: 'Optional. Raises crypto rate limits and unlocks >365d history.' },
  { key: 'MARKET_DATA_API_KEY', label: 'Market data provider key (Massive / Polygon-compatible)', group: 'Data', help: 'Optional. Reserved for a licensed real-time equities feed.' },
];

export async function loadAdminKeys(env) {
  if (!env.CACHE || typeof env.CACHE.get !== 'function') return {};
  try { return (await env.CACHE.get('admin:keys', 'json')) || {}; } catch (e) { return {}; }
}

export async function saveAdminKeys(env, updates) {
  if (!env.CACHE || typeof env.CACHE.put !== 'function') throw new Error('KV binding CACHE is not configured; cannot persist credentials');
  const current = await loadAdminKeys(env);
  for (const [k, v] of Object.entries(updates)) {
    if (!CREDENTIAL_FIELDS.find(f => f.key === k)) continue;
    if (v === null || v === '') delete current[k]; else current[k] = String(v).trim();
  }
  await env.CACHE.put('admin:keys', JSON.stringify(current));
  return current;
}

export async function getConfig(env) {
  const admin = await loadAdminKeys(env);
  const get = (k) => admin[k] || env[k] || '';
  return {
    appName: env.APP_NAME || 'Capital Flow Terminal',
    demoMode: String(env.DEMO_MODE || '').toLowerCase() === 'true',
    ttl: {
      quotes: Number(env.TTL_QUOTES || 60),
      history: Number(env.TTL_HISTORY || 900),
      macro: Number(env.TTL_MACRO || 3600),
    },
    keys: Object.fromEntries(CREDENTIAL_FIELDS.map(f => [f.key, get(f.key)])),
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
