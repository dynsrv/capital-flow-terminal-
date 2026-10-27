// Credential tests for the Admin page. Each test makes the smallest read-only request the provider offers
// and reports pass/fail, latency and a short human-readable message. Keys are never echoed back.
import { fetchText } from './lib/util.js';
import { exaSearch, parallelSearch } from './ai.js';

async function timed(fn) {
  const t = Date.now();
  try { const message = await fn(); return { ok: true, ms: Date.now() - t, message }; }
  catch (e) {
    const status = e.status; const raw = String(e.message || e);
    const hint = status === 401 || status === 403 ? 'The key was rejected (unauthorised). Check that it is copied in full and active.'
      : status === 429 ? 'The key works but the provider is rate-limiting requests right now.'
      : status === 400 ? 'The provider rejected the request format: ' + raw.replace(/^HTTP \d+ from [^:]+: /, '').slice(0, 140)
      : /abort/i.test(raw) ? 'The provider did not respond within the time limit.' : raw.slice(0, 180);
    return { ok: status === 429, ms: Date.now() - t, message: hint, status };
  }
}

const json = async (url, opts) => JSON.parse(await fetchText(url, { timeoutMs: 20000, ...opts }));

export const TESTS = {
  async ANTHROPIC_API_KEY(key, keys) {
    return timed(async () => {
      const j = await json('https://api.anthropic.com/v1/models?limit=20', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
      const ids = (j.data || []).map(m => m.id); const want = keys.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
      return `Key accepted. ${ids.length} models available${ids.length ? `; configured model "${want}" ${ids.includes(want) ? 'is available' : 'was not in the first page of results, check the ID'}` : ''}.`;
    });
  },
  async EXA_API_KEY(key) { return timed(async () => { const r = await exaSearch(key, 'global markets today', 1); return `Key accepted. Search returned ${r.length} result${r.length === 1 ? '' : 's'}${r[0] ? `: "${String(r[0].title || '').slice(0, 60)}"` : ''}.`; }); },
  async PARALLEL_API_KEY(key) { return timed(async () => { const r = await parallelSearch(key, 'global markets today', 1); return `Key accepted. Search returned ${r.length} result${r.length === 1 ? '' : 's'}${r[0] ? `: "${String(r[0].title || '').slice(0, 60)}"` : ''}.`; }); },
  async FRED_API_KEY(key) { return timed(async () => { const j = await json(`https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=1`); const o = (j.observations || [])[0]; return `Key accepted. Latest US 10Y yield: ${o ? `${o.value}% on ${o.date}` : 'n/a'}.`; }); },
  async EIA_API_KEY(key) { return timed(async () => { const j = await json(`https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${encodeURIComponent(key)}&frequency=daily&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&length=1`); const r = ((j.response || {}).data || [])[0]; return `Key accepted. Latest WTI spot: ${r ? `$${r.value} on ${r.period}` : 'n/a'}.`; }); },
  async COINGECKO_API_KEY(key) {
    return timed(async () => {
      try { await json('https://pro-api.coingecko.com/api/v3/ping', { headers: { 'x-cg-pro-api-key': key } }); return 'Pro key accepted.'; }
      catch (e) { await json('https://api.coingecko.com/api/v3/ping', { headers: { 'x-cg-demo-api-key': key } }); return 'Demo key accepted.'; }
    });
  },
  async MARKET_DATA_API_KEY(key) { return timed(async () => { const j = await json(`https://api.polygon.io/v3/reference/tickers?ticker=SPY&limit=1&apiKey=${encodeURIComponent(key)}`); return `Key accepted. Reference lookup returned ${(j.results || []).length} ticker.`; }); },
};

export async function testCredential(name, value, config) {
  const fn = TESTS[name];
  if (!fn) return { ok: false, message: 'No test is available for this setting.' };
  const key = value || config.keys[name];
  if (!key) return { ok: false, message: 'No key entered or saved yet.' };
  const r = await fn(key, config.keys);
  return { ...r, tested: value ? 'entered value' : 'saved value' };
}
