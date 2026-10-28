// Credential + settings resolution.
// Priority: value saved on the Admin page (KV `admin:keys`) > environment secret > none.
// Admin values are stored in KV only; they are never written into logs or responses in full.

export const CREDENTIAL_FIELDS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API key', group: 'AI', help: 'Enables AI explanations in Intelligence (signal, evidence, cause, impact, confidence, what to watch).', test: true },
  { key: 'ANTHROPIC_MODEL', label: 'Anthropic model', group: 'AI', help: 'Model ID used for explanations. Default: claude-sonnet-5-5.', secret: false, placeholder: 'claude-sonnet-5-5' },
  { key: 'AI_AUTO_REFRESH', label: 'Automatic AI refresh', group: 'AI', help: 'off: only when you press Refresh. daily: once a day after the US close. on-change: on the daily run, only if the regime, stress band or high-severity anomalies changed since the last reading.', secret: false, placeholder: 'off', options: ['off', 'daily', 'on-change'] },
  { key: 'NEWS_AI_CURATION', label: 'AI news curation', group: 'AI', help: 'off: keyword rules only. manual: curate when you press the button in Admin. daily: also run with the daily job.', secret: false, placeholder: 'off', options: ['off', 'manual', 'daily'] },
  { key: 'ANOMALY_SCHEDULE', label: 'Anomaly scan', group: 'AI', help: 'live: detected anomalies are computed when someone opens the page. daily: one stored scan a day after the US close (22:00 UTC). twice-daily: also at 09:15 UTC after the Asian closes. Scheduled scans record what is new or cleared since the previous scan.', secret: false, placeholder: 'live', options: ['live', 'daily', 'twice-daily'] },
  { key: 'OUTLOOK_SCHEDULE', label: 'Market outlook', group: 'AI', help: 'daily: the five-scenario outlook on the Intelligence page is rewritten by the model with the nightly job (22:00 UTC), one model call plus up to five news searches. off: only when you press Refresh outlook in Admin.', secret: false, placeholder: 'daily', options: ['daily', 'off'] },
  { key: 'EXA_API_KEY', label: 'Exa API key', group: 'Search', help: 'News search for AI citations via exa.ai.', test: true },
  { key: 'PARALLEL_API_KEY', label: 'Parallel API key', group: 'Search', help: 'News search for AI citations via parallel.ai.', test: true },
  { key: 'SEARCH_PROVIDER', label: 'Preferred search provider', group: 'Search', help: 'auto (Exa first, Parallel as fallback), exa, or parallel.', secret: false, placeholder: 'auto', options: ['auto', 'exa', 'parallel'] },
  { key: 'FRED_API_KEY', label: 'FRED API key', group: 'Data', help: 'Optional. Without it the keyless FRED CSV export is used (same data, lower rate limit).', test: true },
  { key: 'EIA_API_KEY', label: 'EIA API key', group: 'Data', help: 'Optional. Adds official EIA spot prices for WTI, Brent and Henry Hub.', test: true },
  { key: 'COINGECKO_API_KEY', label: 'CoinGecko API key', group: 'Data', help: 'Optional. Raises crypto rate limits and unlocks history beyond 365 days.', test: true },
  { key: 'UI_FONT', label: 'Font', group: 'Appearance', help: 'terminal: JetBrains Mono throughout (current look). classic: IBM Plex Sans with Plex Mono figures (the original). modern: Inter for text with JetBrains Mono figures, easiest to read in long sessions. Applies to every visitor.', secret: false, placeholder: 'terminal', options: ['terminal', 'classic', 'modern'] },
  { key: 'UI_FONT_SIZE', label: 'Text size', group: 'Appearance', help: 'small 92%, default 100%, large 108%, x-large 116%. Scales all text and chart labels; layout spacing stays the same.', secret: false, placeholder: 'default', options: ['small', 'default', 'large', 'x-large'] },
  { key: 'REALTIME_MODE', label: 'Real-time updates', group: 'Real-time', help: 'off: quotes refresh every 60 s from the standard (delayed / end-of-day) sources. on: for signed-in members (and Admin), instruments a configured provider can price in real time update at the interval below, and crypto streams live. Visitors always see the delayed feed, so they never trigger paid provider calls.', secret: false, placeholder: 'off', options: ['off', 'on'] },
  { key: 'REALTIME_INTERVAL', label: 'Update interval (seconds)', group: 'Real-time', help: 'How often real-time prices are pulled from keyed providers. All visitors share one upstream request per interval.', secret: false, placeholder: '10', options: ['5', '10', '15', '30', '60'] },
  { key: 'REALTIME_CRYPTO', label: 'Crypto stream', group: 'Real-time', help: 'coinbase: BTC, ETH and SOL stream tick-by-tick from Coinbase’s public WebSocket (free, no key). off: crypto uses the polled providers or CoinGecko.', secret: false, placeholder: 'coinbase', options: ['coinbase', 'off'] },
  { key: 'WS_MASSIVE', label: 'Massive WebSocket', group: 'Real-time', help: 'Tick-by-tick trades for the US ETFs your Massive plan covers (wss://socket.massive.com/stocks; falls back to per-second bars from the delayed feed when real-time is not on the plan). Massive allows one stream connection per asset class, so this streams only in an unlocked Admin browser.', secret: false, placeholder: 'off', options: ['off', 'admin'] },
  { key: 'WS_ALPACA', label: 'Alpaca WebSocket', group: 'Real-time', help: 'IEX trades for the US ETFs (wss://stream.data.alpaca.markets/v2/iex). The free plan allows one connection, so this streams only in an unlocked Admin browser.', secret: false, placeholder: 'off', options: ['off', 'admin'] },
  { key: 'WS_FINNHUB', label: 'Finnhub WebSocket', group: 'Real-time', help: 'Trades for the US ETFs (wss://ws.finnhub.io). admin: only in an unlocked Admin browser. members: every signed-in member streams directly, which puts your Finnhub key in their browser.', secret: false, placeholder: 'off', options: ['off', 'admin', 'members'] },
  { key: 'WS_TWELVEDATA', label: 'Twelve Data WebSocket', group: 'Real-time', help: 'Price stream for FX, gold, silver and crypto (wss://ws.twelvedata.com). admin or members as for Finnhub; members puts the key in every member browser.', secret: false, placeholder: 'off', options: ['off', 'admin', 'members'] },
  { key: 'MASSIVE_API_KEY', label: 'Massive (Polygon.io) API key', group: 'Real-time', help: 'US indices (S&P 500, Nasdaq 100, Russell 2000, VIX), US ETFs, FX, gold, silver and crypto in one call. Real-time needs the Developer tier per asset class (about $79/mo); lower tiers are 15-minute delayed and are labelled so.', test: true },
  { key: 'ALPACA_KEY_ID', label: 'Alpaca key ID', group: 'Real-time', help: 'Free Basic plan gives real-time US ETF prices from the IEX venue. Enter the key ID and secret, save, then test.', test: true },
  { key: 'ALPACA_SECRET_KEY', label: 'Alpaca secret key', group: 'Real-time', help: 'Secret paired with the key ID above.' },
  { key: 'FINNHUB_API_KEY', label: 'Finnhub API key', group: 'Real-time', help: 'Free plan: real-time US ETF quotes, about 60 calls/min, personal non-commercial use.', test: true },
  { key: 'TWELVEDATA_API_KEY', label: 'Twelve Data API key', group: 'Real-time', help: 'FX (EUR, JPY, GBP, CNY, IDR), gold, silver and crypto. Free tier: 8 credits/min and internal non-display use only; Grow ($29/mo) or above for a displayed dashboard.', test: true },
  { key: 'TWELVEDATA_CREDITS', label: 'Twelve Data credits per minute', group: 'Real-time', help: 'Your plan’s per-minute credit allowance. The update interval for Twelve Data is stretched so it never exceeds it (free = 8, Grow = 55+).', secret: false, placeholder: '8', options: ['8', '55', '144', '377', '610'] },
  { key: 'ID_10Y_YIELD', label: 'Indonesia 10Y yield (%)', group: 'Indonesia bonds', help: 'No free feed publishes it. Enter the latest 10-year SUN benchmark yield from PHEI / DJPPR; shown on Flows → World Bonds with the as-of date.', secret: false, placeholder: 'e.g. 6.45' },
  { key: 'ID_10Y_ASOF', label: 'Indonesia 10Y as of', group: 'Indonesia bonds', help: 'Date of that yield (YYYY-MM-DD).', secret: false, placeholder: 'YYYY-MM-DD' },
  { key: 'ID_SBN_FOREIGN_TN', label: 'Foreign holdings of SBN (Rp trillion)', group: 'Indonesia bonds', help: 'Latest "Posisi Kepemilikan SBN Rupiah yang Dapat Diperdagangkan" foreign (Asing) total from DJPPR.', secret: false, placeholder: 'e.g. 880' },
  { key: 'ID_SBN_FOREIGN_PCT', label: 'Foreign share of SBN (%)', group: 'Indonesia bonds', help: 'Foreign share of tradable rupiah government securities.', secret: false, placeholder: 'e.g. 14.2' },
  { key: 'ID_SBN_ASOF', label: 'SBN holdings as of', group: 'Indonesia bonds', help: 'Date of the DJPPR position (YYYY-MM-DD).', secret: false, placeholder: 'YYYY-MM-DD' },
  { key: 'ID_BOND_SOURCE', label: 'Source note', group: 'Indonesia bonds', help: 'Where the figures came from, shown next to them.', secret: false, placeholder: 'DJPPR, PHEI' },
  { key: 'USAGE_METER', label: 'Usage meter', group: 'Usage', help: 'Counts every upstream API call, model tokens and storage operation, with an estimated cost (Admin → Usage & API logs). off stops counting and saving.', secret: false, placeholder: 'on', options: ['on', 'off'] },
  { key: 'USAGE_FLUSH_MIN', label: 'Usage save interval (minutes)', group: 'Usage', help: 'How often each server instance saves its counts to storage, only when something new happened. Each save is one Blob write (Hobby includes 2,000 a month); model calls save on the next request. Default 60.', secret: false, placeholder: '60' },
];

const ADMIN_DOC = 'admin/keys';
export async function loadAdminKeys(env) {
  if (env.__store) { try { return (await env.__store.getJSON(ADMIN_DOC, { secure: true, maxAgeMs: 30e3 })) || {}; } catch (e) { /* fall back */ } }
  if (!env.CACHE || typeof env.CACHE.get !== 'function') return {};
  try { return (await env.CACHE.get('admin:keys', 'json')) || {}; } catch (e) { return {}; }
}

export async function saveAdminKeys(env, updates) {
  // read the stored document itself (not the 30-second memo) so a save never overwrites a newer one
  let current; try { current = env.__store ? (await env.__store.getJSON(ADMIN_DOC, { secure: true })) || {} : await loadAdminKeys(env); } catch (e) { current = await loadAdminKeys(env); }
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
    keys: (() => { const k = Object.fromEntries(CREDENTIAL_FIELDS.map(f => [f.key, get(f.key)])); if (!k.MASSIVE_API_KEY && k.MARKET_DATA_API_KEY) k.MASSIVE_API_KEY = k.MARKET_DATA_API_KEY; if (legacy) { if (legacyProv === 'parallel' && !k.PARALLEL_API_KEY) k.PARALLEL_API_KEY = legacy; else if (!k.EXA_API_KEY) k.EXA_API_KEY = legacy; } return k; })(),
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
