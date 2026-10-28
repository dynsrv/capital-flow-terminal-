// Usage meter: every upstream API call, model token use, storage operation and our own function invocations,
// with an estimated cost. Counts are kept in memory per server instance and saved to the persistent store as one
// shard per instance per day (usage/d/<day>/<instance>), at most once per flush interval and only when something
// new happened. The daily job folds yesterday's shards into one document (usage/day/<day>).
// Estimates use published list prices (editable in Admin); provider and Vercel dashboards remain the billing record.

/* ───────── list prices (USD), checked 2026-10-28 ─────────
   Anthropic: platform.claude.com/docs/en/about-claude/pricing (per million tokens; cache write = 5-minute write)
   Exa: exa.ai/docs/reference/pricing (/search auto or fast, up to 10 results: $7 per 1k requests)
   Parallel: docs.parallel.ai/getting-started/pricing (Search API fast: $1 per 1k requests)
   Vercel: vercel.com/pricing and vercel.com/docs/vercel-blob/usage-and-pricing */
export const DEFAULT_PRICES = {
  anthropic: {
    'claude-fable-5-1': { in: 10, out: 50, cw: 12.5, cr: 0.25 },
    'claude-mythos-5-1': { in: 10, out: 50, cw: 12.5, cr: 0.25 },
    'claude-opus-5-5': { in: 4, out: 20, cw: 5, cr: 0.2 },
    'claude-sonnet-5-5': { in: 2, out: 10, cw: 2.5, cr: 0.1 },
    'claude-haiku-5-5': { in: 0.1, out: 0.5, cw: 0.125, cr: 0.01, long: { over: 100000, in: 0.5, out: 2.5, cw: 0.625, cr: 0.05 } },
    'claude-opus-5': { in: 5, out: 25, cw: 6.25, cr: 0.5 },
    'claude-sonnet-5': { in: 2, out: 10, cw: 2.5, cr: 0.2 },
    'claude-opus-4': { in: 5, out: 25, cw: 6.25, cr: 0.5 },
    'claude-sonnet-4': { in: 3, out: 15, cw: 3.75, cr: 0.3 },
    'claude-haiku-4-5': { in: 1, out: 5, cw: 1.25, cr: 0.1 },
  },
  perUnit: { exa: 0.007, parallel: 0.001, 'vercel-fn': 0.6 / 1e6, 'blob-advanced': 5 / 1e6, 'blob-simple': 0.4 / 1e6 },
  // flat monthly subscriptions you pay regardless of calls (enter yours in Admin)
  plans: { anthropic: 0, exa: 0, parallel: 0, massive: 0, alpaca: 0, finnhub: 0, twelvedata: 0, vercel: 0 },
};

const HOSTS = [
  [/(^|\.)anthropic\.com$/, 'anthropic'], [/(^|\.)exa\.ai$/, 'exa'], [/(^|\.)parallel\.ai$/, 'parallel'],
  [/(^|\.)(polygon\.io|massive\.com)$/, 'massive'], [/(^|\.)alpaca\.markets$/, 'alpaca'], [/(^|\.)finnhub\.io$/, 'finnhub'],
  [/(^|\.)twelvedata\.com$/, 'twelvedata'], [/(^|\.)stlouisfed\.org$/, 'fred'], [/(^|\.)yahoo\.com$/, 'yahoo'],
  [/(^|\.)coingecko\.com$/, 'coingecko'], [/(^|\.)eia\.gov$/, 'eia'], [/gold-api\.com$/, 'goldapi'], [/(^|\.)llama\.fi$/, 'defillama'],
];
export const SERVICE_INFO = {
  anthropic: { name: 'Anthropic (AI)', kind: 'AI' }, exa: { name: 'Exa search', kind: 'Search' }, parallel: { name: 'Parallel search', kind: 'Search' },
  massive: { name: 'Massive', kind: 'Market data' }, alpaca: { name: 'Alpaca', kind: 'Market data' }, finnhub: { name: 'Finnhub', kind: 'Market data' },
  twelvedata: { name: 'Twelve Data', kind: 'Market data', unit: 'credits' }, fred: { name: 'FRED', kind: 'Public data' }, yahoo: { name: 'Yahoo Finance', kind: 'Public data' },
  coingecko: { name: 'CoinGecko', kind: 'Public data' }, eia: { name: 'EIA', kind: 'Public data' }, goldapi: { name: 'gold-api.com', kind: 'Public data' },
  defillama: { name: 'DefiLlama', kind: 'Public data' }, news: { name: 'News feeds (RSS)', kind: 'Public data' }, 'hls-relay': { name: 'Live TV relay', kind: 'Platform' },
  'vercel-fn': { name: 'Function invocations', kind: 'Platform' }, 'vercel-blob': { name: 'Blob storage operations', kind: 'Platform' }, postgres: { name: 'Postgres (Neon) queries', kind: 'Platform' },
};
export function serviceOf(host, path = '') {
  for (const [re, s] of HOSTS) if (re.test(host)) return s;
  return /rss|feed|xml|news\.google/i.test(host + path) ? 'news' : host;
}
/** Path with symbols, ids and query removed, so a log line never carries a key or a ticker list. */
export function opOf(method, pathname) {
  const seg = pathname.split('/').filter(Boolean).slice(0, 4).map(s => (/[A-Z0-9%^=:.,]/.test(s) && !/^v\d+(beta\d+)?$/.test(s) ? ':x' : s));
  return `${method || 'GET'} /${seg.join('/')}`;
}
const scrub = (s) => String(s || '').replace(/[A-Za-z0-9_\-]{24,}/g, '…').slice(0, 160);

/* ───────── per-instance state ───────── */
const INSTANCE = Math.random().toString(36).slice(2, 10);
const state = { day: null, agg: {}, log: [], dirty: false, lastFlush: 0, windowStart: Date.now(), writes: 0, startedAt: new Date().toISOString() };
let prices = { v: DEFAULT_PRICES, at: 0 };
let settings = { enabled: true, flushMin: 60 };
const today = () => new Date().toISOString().slice(0, 10);
function roll() { const d = today(); if (state.day !== d) { state.day = d; state.agg = {}; state.log = []; state.writes = 0; } }

export function configure(keys = {}) {
  settings.enabled = String(keys.USAGE_METER || 'on') !== 'off';
  settings.flushMin = Math.max(5, Math.min(720, Number(keys.USAGE_FLUSH_MIN || 60) || 60));
}

function priceFor(model) {
  const t = prices.v.anthropic || {}; const id = String(model || '').replace(/-\d{8}$/, '');
  if (t[id]) return t[id];
  const keys = Object.keys(t).sort((a, b) => b.length - a.length); const k = keys.find(k => id.startsWith(k));
  return k ? t[k] : null;
}
export function anthropicCost(model, u) {
  const p = priceFor(model); if (!p || !u) return null;
  const tin = u.input_tokens || 0, tout = u.output_tokens || 0, cw = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0;
  const r = p.long && tin + cw + cr > p.long.over ? p.long : p;
  return (tin * r.in + tout * r.out + cw * r.cw + cr * r.cr) / 1e6 + ((u.server_tool_use && u.server_tool_use.web_search_requests) || 0) * 0.01;
}

/** Record one event. quiet events count but do not make the shard dirty (the meter's own writes). */
export function record(e) {
  if (!settings.enabled) return;
  roll();
  const svc = e.svc; const op = e.op || ''; const key = `${svc}|${op}|${e.model || ''}`;
  let cost = e.cost;
  if (cost == null && svc === 'anthropic' && e.usage) cost = anthropicCost(e.model, e.usage);
  if (cost == null && prices.v.perUnit[svc] != null && (svc === 'vercel-fn' || (e.status && e.status < 400))) cost = prices.v.perUnit[svc] * (e.units || 1);
  if (cost == null && svc === 'vercel-blob') cost = (/put|list|copy/.test(op) ? prices.v.perUnit['blob-advanced'] : /get/.test(op) ? prices.v.perUnit['blob-simple'] : 0);
  const a = state.agg[key] ||= { svc, op, model: e.model || null, n: 0, err: 0, ms: 0, bytes: 0, units: 0, tin: 0, tout: 0, tcw: 0, tcr: 0, cost: 0, tags: {} };
  a.n++; if (!e.status || e.status >= 400) a.err++; a.ms += e.ms || 0; a.bytes += e.bytes || 0; a.units += e.units || 1; a.cost += cost || 0;
  if (e.tag) a.tags[e.tag] = (a.tags[e.tag] || 0) + 1;
  const u = e.usage; if (u) { a.tin += u.input_tokens || 0; a.tout += u.output_tokens || 0; a.tcw += u.cache_creation_input_tokens || 0; a.tcr += u.cache_read_input_tokens || 0; }
  if (svc !== 'vercel-fn' && svc !== 'vercel-blob' && svc !== 'postgres' || (e.status && e.status >= 400)) {
    state.log.push({ t: new Date().toISOString(), svc, op, st: e.status || 0, ms: Math.round(e.ms || 0), b: e.bytes || 0, units: e.units || 1, tag: e.tag || null, model: e.model || null,
      tin: u ? u.input_tokens || 0 : undefined, tout: u ? u.output_tokens || 0 : undefined, tcr: u ? u.cache_read_input_tokens || 0 : undefined, tcw: u ? u.cache_creation_input_tokens || 0 : undefined,
      cost: cost || 0, err: e.err ? scrub(e.err) : undefined, inst: INSTANCE });
    if (state.log.length > 250) state.log.splice(0, state.log.length - 250);
  }
  if (!e.quiet) state.dirty = true;
  if (svc === 'anthropic') state.urgent = true; // model calls are rare and costly: save on the next request
}

/** Wrap for fetchText: records one upstream call. */
export function recordFetch(url, method, status, ms, text, err, tag) {
  let host = '', path = ''; try { const u = new URL(url); host = u.hostname; path = u.pathname; } catch (e) { return; }
  const svc = serviceOf(host, path); const e = { svc, op: opOf(method, path), status, ms, bytes: text ? text.length : 0, err, tag };
  try {
    if (svc === 'twelvedata') { const sym = new URL(url).searchParams.get('symbol'); e.units = sym ? sym.split(',').length : 1; }
    if (text && status < 400 && (svc === 'anthropic' || svc === 'exa' || svc === 'parallel')) {
      const j = JSON.parse(text);
      if (svc === 'anthropic' && j.usage) { e.usage = j.usage; e.model = j.model; }
      if (svc === 'exa' && j.costDollars && j.costDollars.total != null) e.cost = Number(j.costDollars.total);
    }
  } catch (x) {}
  record(e);
}

/* ───────── persistence ───────── */
function snapshot() { return { v: 1, day: state.day, instance: INSTANCE, startedAt: state.startedAt, savedAt: new Date().toISOString(), writes: state.writes, agg: state.agg, log: state.log }; }
export async function flush(store, { force = false } = {}) {
  if (!settings.enabled || !store || !store.persistent) return { skipped: true };
  roll();
  const due = Date.now() - (state.lastFlush || state.windowStart) > settings.flushMin * 60e3 || state.urgent;
  if (!force && (!state.dirty || !due)) return { skipped: true };
  state.dirty = false; state.urgent = false; state.lastFlush = Date.now(); state.writes++;
  try { await store.putJSON(`usage/d/${state.day}/${INSTANCE}`, snapshot(), { quiet: true }); return { saved: true }; }
  catch (e) { state.dirty = true; return { error: e.message }; }
}
export function maybeFlush(store, waitUntil) {
  if (!settings.enabled || !store || !store.persistent) return;
  const due = state.dirty && (state.urgent || Date.now() - (state.lastFlush || state.windowStart) > settings.flushMin * 60e3);
  if (!due) return;
  const p = flush(store); if (waitUntil) try { waitUntil(p); } catch (e) {}
}

export async function loadPrices(store) {
  if (Date.now() - prices.at < 10 * 60e3) return prices.v;
  let o = null; try { o = store && store.persistent ? await store.getJSON('usage/prices', { maxAgeMs: 10 * 60e3 }) : null; } catch (e) {}
  const v = JSON.parse(JSON.stringify(DEFAULT_PRICES));
  if (o) { Object.assign(v.anthropic, o.anthropic || {}); Object.assign(v.perUnit, o.perUnit || {}); Object.assign(v.plans, o.plans || {}); }
  prices = { v, at: Date.now(), custom: o || null }; return v;
}
export async function savePrices(store, patch) {
  const cur = (store && store.persistent ? await store.getJSON('usage/prices') : null) || {};
  const next = { anthropic: { ...(cur.anthropic || {}), ...(patch.anthropic || {}) }, perUnit: { ...(cur.perUnit || {}), ...(patch.perUnit || {}) }, plans: { ...(cur.plans || {}), ...(patch.plans || {}) }, updatedAt: new Date().toISOString() };
  for (const g of ['perUnit', 'plans']) for (const [k, v] of Object.entries(next[g])) { if (v === '' || v == null || !isFinite(Number(v))) delete next[g][k]; else next[g][k] = Number(v); }
  if (store && store.persistent) await store.putJSON('usage/prices', next);
  prices.at = 0; return loadPrices(store);
}

function mergeAgg(into, agg) {
  for (const [k, a] of Object.entries(agg || {})) {
    const t = into[k] ||= { svc: a.svc, op: a.op, model: a.model, n: 0, err: 0, ms: 0, bytes: 0, units: 0, tin: 0, tout: 0, tcw: 0, tcr: 0, cost: 0, tags: {} };
    for (const f of ['n', 'err', 'ms', 'bytes', 'units', 'tin', 'tout', 'tcw', 'tcr', 'cost']) t[f] += a[f] || 0;
    for (const [g, c] of Object.entries(a.tags || {})) t.tags[g] = (t.tags[g] || 0) + c;
  }
  return into;
}

/** Fold finished days' shards into one document per day (daily job). */
export async function compact(store) {
  if (!store || !store.persistent) return { skipped: true };
  const list = await store.list('usage/d/'); const byDay = {};
  for (const b of list) { const m = b.key.match(/^usage\/d\/(\d{4}-\d{2}-\d{2})\//); if (m && m[1] < today()) (byDay[m[1]] ||= []).push(b.key); }
  const out = {};
  for (const [day, keys] of Object.entries(byDay)) {
    const prev = await store.getJSON('usage/day/' + day).catch(() => null);
    const agg = mergeAgg({}, prev && prev.agg); let log = (prev && prev.log) || []; let writes = (prev && prev.writes) || 0;
    for (const k of keys) { const s = await store.getJSON(k).catch(() => null); if (s) { mergeAgg(agg, s.agg); log = log.concat(s.log || []); writes += s.writes || 0; } }
    log.sort((a, b) => (a.t < b.t ? 1 : -1));
    await store.putJSON('usage/day/' + day, { v: 1, day, compactedAt: new Date().toISOString(), shards: keys.length, writes, agg, log: log.slice(0, 300) });
    for (const k of keys) { try { await store.del(k); } catch (e) {} }
    out[day] = keys.length;
  }
  return { compacted: out };
}

/** Admin report for the last N days, including this instance's unsaved counts. */
export async function report(store, days = 7) {
  const p = await loadPrices(store); roll();
  const from = new Date(Date.now() - (days - 1) * 86400e3).toISOString().slice(0, 10);
  const monthStart = today().slice(0, 8) + '01'; const lo = from < monthStart ? from : monthStart;
  const docs = []; let listed = [];
  if (store && store.persistent) {
    listed = (await store.list('usage/').catch(() => [])).map(b => b.key);
    const want = listed.filter(k => { const m = k.match(/^usage\/(?:d|day)\/(\d{4}-\d{2}-\d{2})/); return m && m[1] >= lo && k !== `usage/d/${state.day}/${INSTANCE}`; });
    for (const k of want) { const d = await store.getJSON(k, { maxAgeMs: 60e3 }).catch(() => null); if (d) docs.push(d); }
  }
  docs.push(snapshot()); // this instance, live
  const byDay = {}; const logs = [];
  for (const d of docs) { byDay[d.day] = mergeAgg(byDay[d.day] || {}, d.agg); for (const l of d.log || []) logs.push(l); }
  const inRange = Object.keys(byDay).filter(d => d >= from).sort();
  const total = {}; for (const d of inRange) mergeAgg(total, byDay[d]);
  const svc = {};
  for (const a of Object.values(total)) {
    const s = svc[a.svc] ||= { svc: a.svc, name: (SERVICE_INFO[a.svc] || {}).name || a.svc, kind: (SERVICE_INFO[a.svc] || {}).kind || 'Other', unit: (SERVICE_INFO[a.svc] || {}).unit || 'calls', n: 0, err: 0, ms: 0, bytes: 0, units: 0, tin: 0, tout: 0, tcw: 0, tcr: 0, cost: 0, ops: [] };
    for (const f of ['n', 'err', 'ms', 'bytes', 'units', 'tin', 'tout', 'tcw', 'tcr', 'cost']) s[f] += a[f];
    s.ops.push({ op: a.op, model: a.model, n: a.n, err: a.err, avgMs: a.n ? a.ms / a.n : 0, units: a.units, tin: a.tin, tout: a.tout, tcw: a.tcw, tcr: a.tcr, cost: a.cost, tags: a.tags });
  }
  const daily = inRange.map(d => { const o = { day: d, total: 0, bySvc: {}, calls: {} }; for (const a of Object.values(byDay[d])) { o.bySvc[a.svc] = (o.bySvc[a.svc] || 0) + a.cost; o.calls[a.svc] = (o.calls[a.svc] || 0) + a.n; o.total += a.cost; } return o; });
  // month to date and a straight-line projection; plan fees are added in full
  const mtd = Object.entries(byDay).filter(([d]) => d >= monthStart).reduce((t, [, agg]) => t + Object.values(agg).reduce((x, a) => x + a.cost, 0), 0);
  const now = new Date(); const dim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate(); const elapsed = now.getUTCDate() - 1 + (now.getUTCHours() * 60 + now.getUTCMinutes()) / 1440;
  const planFees = Object.values(p.plans).reduce((t, v) => t + (Number(v) || 0), 0);
  const tokens = Object.values(total).filter(a => a.svc === 'anthropic' && a.model).map(a => ({ model: a.model, calls: a.n, tin: a.tin, tout: a.tout, tcw: a.tcw, tcr: a.tcr, cost: a.cost, tags: a.tags }));
  logs.sort((a, b) => (a.t < b.t ? 1 : -1));
  const meterWrites = docs.reduce((t, d) => t + (d.day >= monthStart ? d.writes || 0 : 0), 0);
  return {
    days, from, to: today(), services: Object.values(svc).sort((a, b) => b.cost - a.cost || b.n - a.n), daily, tokens,
    month: { start: monthStart, usage: mtd, projected: elapsed > 0.25 ? mtd / elapsed * dim : null, planFees, daysInMonth: dim, elapsedDays: elapsed },
    logs: logs.filter(l => l.t.slice(0, 10) >= from).slice(0, 400), prices: p, defaults: DEFAULT_PRICES,
    meter: { enabled: settings.enabled, flushMin: settings.flushMin, instance: INSTANCE, instanceStarted: state.startedAt, lastFlush: state.lastFlush ? new Date(state.lastFlush).toISOString() : null, unsaved: state.dirty, writesThisMonth: meterWrites, shards: listed.filter(k => k.startsWith('usage/d/')).length, persistent: !!(store && store.persistent) },
  };
}
