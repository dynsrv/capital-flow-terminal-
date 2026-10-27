// Optional real-time layer. Off by default; an admin switches it on and adds provider keys.
//
// Two delivery paths, chosen so that no provider key ever reaches the browser:
//  1. Server-proxied fast quotes (/api/rt/quotes): keyed providers (Massive/Polygon, Alpaca, Finnhub, Twelve Data)
//     are polled from the edge at the configured interval and cached for that long, so every visitor shares one
//     upstream request per interval. The browser polls this route.
//  2. Keyless crypto stream: the browser connects straight to Coinbase's public WebSocket ticker channel.
//
// Each quote is labelled with its provider and timestamp. Instruments a configured provider cannot price in real
// time keep their normal (delayed / end-of-day) source and badge. Index levels are only taken from a provider that
// publishes the index itself (Massive indices); an ETF is never shown in place of an index.
import { fetchText } from './lib/util.js';

/** Universe id → provider symbol. Only direct equivalents; no proxies. Which of these a given key can actually price
 *  depends on the plan; the router learns that at run time and the Admin "Scan my plans" button tests it explicitly. */
export const RT_MAP = {
  SPX: { massive: 'I:SPX', finnhub: '^GSPC' }, NDX: { massive: 'I:NDX', finnhub: '^NDX' }, RUT: { massive: 'I:RUT', finnhub: '^RUT' }, VIX: { massive: 'I:VIX', finnhub: '^VIX' },
  EEM: { massive: 'EEM', alpaca: 'EEM', finnhub: 'EEM', twelvedata: 'EEM' },
  TLT: { massive: 'TLT', alpaca: 'TLT', finnhub: 'TLT', twelvedata: 'TLT' },
  LQD: { massive: 'LQD', alpaca: 'LQD', finnhub: 'LQD', twelvedata: 'LQD' },
  HYG: { massive: 'HYG', alpaca: 'HYG', finnhub: 'HYG', twelvedata: 'HYG' },
  EMB: { massive: 'EMB', alpaca: 'EMB', finnhub: 'EMB', twelvedata: 'EMB' },
  DBA: { massive: 'DBA', alpaca: 'DBA', finnhub: 'DBA', twelvedata: 'DBA' },
  EURUSD: { massive: 'C:EURUSD', finnhub: 'OANDA:EUR_USD', twelvedata: 'EUR/USD' },
  USDJPY: { massive: 'C:USDJPY', finnhub: 'OANDA:USD_JPY', twelvedata: 'USD/JPY' },
  GBPUSD: { massive: 'C:GBPUSD', finnhub: 'OANDA:GBP_USD', twelvedata: 'GBP/USD' },
  USDCNY: { massive: 'C:USDCNY', twelvedata: 'USD/CNY' },
  USDIDR: { massive: 'C:USDIDR', twelvedata: 'USD/IDR' },
  GOLD: { massive: 'C:XAUUSD', finnhub: 'OANDA:XAU_USD', twelvedata: 'XAU/USD' },
  SILVER: { massive: 'C:XAGUSD', finnhub: 'OANDA:XAG_USD', twelvedata: 'XAG/USD' },
  BTC: { coinbase: 'BTC-USD', massive: 'X:BTCUSD', alpaca: 'BTC/USD', twelvedata: 'BTC/USD' },
  ETH: { coinbase: 'ETH-USD', massive: 'X:ETHUSD', alpaca: 'ETH/USD', twelvedata: 'ETH/USD' },
  SOL: { coinbase: 'SOL-USD', massive: 'X:SOLUSD', alpaca: 'SOL/USD', twelvedata: 'SOL/USD' },
};

export const PROVIDERS = {
  massive: { name: 'Massive (Polygon.io)', keys: ['MASSIVE_API_KEY'], covers: 'US indices (S&P 500, Nasdaq 100, Russell 2000, VIX), US ETFs, FX, metals, crypto', note: 'Real-time needs the Developer tier or above for each asset class; Basic/Starter are 15-minute delayed.' },
  alpaca: { name: 'Alpaca (IEX)', keys: ['ALPACA_KEY_ID', 'ALPACA_SECRET_KEY'], covers: 'US-listed ETFs, crypto (BTC, ETH, SOL)', note: 'Free Basic plan: real-time IEX venue only (not the consolidated tape). Algo Trader Plus ($99/mo) adds all US exchanges.' },
  finnhub: { name: 'Finnhub', keys: ['FINNHUB_API_KEY'], covers: 'US-listed ETFs; FX, gold, silver and US indices on paid plans', note: 'Free plan: real-time US quotes, about 60 calls/min, personal non-commercial use.' },
  twelvedata: { name: 'Twelve Data', keys: ['TWELVEDATA_API_KEY'], covers: 'FX, gold, silver, crypto, US ETFs', note: 'Free Basic: 8 credits/min (one per symbol), internal non-display use only. Grow from $29/mo for display use.' },
  coinbase: { name: 'Coinbase Exchange (public WebSocket)', keys: [], covers: 'BTC, ETH, SOL', note: 'Free, no key. Streams straight to the browser.' },
};
const ORDER = ['massive', 'alpaca', 'finnhub', 'twelvedata'];

export function rtSettings(config) {
  const k = config.keys;
  const enabled = String(k.REALTIME_MODE || 'off') === 'on';
  const intervalSec = Math.max(3, Math.min(120, Number(k.REALTIME_INTERVAL || 10) || 10));
  const crypto = String(k.REALTIME_CRYPTO || 'coinbase');
  const configured = {
    massive: !!k.MASSIVE_API_KEY, alpaca: !!(k.ALPACA_KEY_ID && k.ALPACA_SECRET_KEY), finnhub: !!k.FINNHUB_API_KEY, twelvedata: !!k.TWELVEDATA_API_KEY,
  };
  return { enabled, intervalSec, crypto, configured, tdCredits: Math.max(1, Number(k.TWELVEDATA_CREDITS || 8) || 8) };
}

/* Routing settings (admin): provider priority and per-instrument choice ('auto' | provider | 'off'). */
const ROUTE_DOC = 'rt/routing';
export async function loadRouting(ctx) {
  let d = null; try { d = ctx.env.__store ? await ctx.env.__store.getJSON(ROUTE_DOC, { maxAgeMs: 30e3 }) : null; } catch (e) {}
  if (!d) { const c = await ctx.cache.read('rt:routing'); d = c ? c.data : null; }
  d = d || {};
  const priority = (Array.isArray(d.priority) ? d.priority : []).filter(p => ORDER.includes(p));
  for (const p of ORDER) if (!priority.includes(p)) priority.push(p);
  return { priority, overrides: d.overrides && typeof d.overrides === 'object' ? d.overrides : {}, scan: d.scan || null, updatedAt: d.updatedAt || null };
}
export async function saveRouting(ctx, patch) {
  const cur = await loadRouting(ctx);
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  if (patch.overrides) next.overrides = Object.fromEntries(Object.entries(patch.overrides).filter(([id, v]) => RT_MAP[id] && (v === 'off' || v === 'auto' || RT_MAP[id][v])).filter(([, v]) => v !== 'auto'));
  if (ctx.env.__store && ctx.env.__store.persistent) await ctx.env.__store.putJSON(ROUTE_DOC, next);
  else await ctx.cache.write('rt:routing', { data: next, fetchedAt: Date.now() }, 30 * 86400);
  return next;
}
// Plan gaps learned at run time: a provider that answered but returned no price for a symbol is skipped for 6 hours.
const gapKey = (p, sym) => `rt:gap:${p}:${sym}`;
async function knownGaps(ctx) {
  const out = new Set();
  await Promise.all(Object.values(RT_MAP).flatMap(m => Object.entries(m).filter(([p]) => p !== 'coinbase').map(async ([p, sym]) => { try { const e = await ctx.cache.read(gapKey(p, sym)); if (e && e.fetchedAt && Date.now() - e.fetchedAt < 6 * 3600e3) out.add(p + '|' + sym); } catch (e) {} })));
  return out;
}

/** Ordered candidate providers for each instrument. */
export function routeFor(s, routing, gaps, scan) {
  const out = {};
  for (const [id, m] of Object.entries(RT_MAP)) {
    const ov = routing.overrides[id];
    if (ov === 'off') { out[id] = { off: true, chain: [] }; continue; }
    if (m.coinbase && s.crypto === 'coinbase' && (!ov || ov === 'coinbase')) { out[id] = { provider: 'coinbase', symbol: m.coinbase, path: 'stream', chain: [] }; continue; }
    const scanned = (p) => scan && scan.results && scan.results[id] && scan.results[id][p];
    const ok = (p) => s.configured[p] && m[p] && (ov === p || (!gaps.has(p + '|' + m[p]) && !(scanned(p) && scanned(p).ok === false)));
    const chain = (ov && ov !== 'auto' ? [ov] : routing.priority).filter(ok);
    if (chain.length) out[id] = { provider: chain[0], symbol: m[chain[0]], path: 'poll', chain, forced: !!(ov && ov !== 'auto') };
  }
  return out;
}
/** Back-compatible synchronous view (no routing settings). */
export function coverage(s) { return routeFor(s, { priority: ORDER.slice(), overrides: {} }, new Set(), null); }

export async function publicConfig(ctx) {
  const s = rtSettings(ctx.config);
  const routing = await loadRouting(ctx); const cov = routeFor(s, routing, await knownGaps(ctx), routing.scan);
  return {
    enabled: s.enabled, intervalSec: s.intervalSec,
    stream: s.enabled && s.crypto === 'coinbase' ? { provider: 'coinbase', url: 'wss://ws-feed.exchange.coinbase.com', products: Object.fromEntries(Object.entries(cov).filter(([, v]) => v.provider === 'coinbase').map(([id, v]) => [id, v.symbol])) } : null,
    polled: s.enabled ? Object.entries(cov).filter(([, v]) => v.path === 'poll').map(([id, v]) => ({ id, provider: v.provider })) : [],
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, v]) => [k, { name: v.name, configured: k === 'coinbase' ? s.crypto === 'coinbase' : !!s.configured[k] }])),
    sockets: s.enabled ? await socketsFor(ctx, 'everyone') : [],
  };
}

const J = async (url, opts = {}) => JSON.parse(await fetchText(url, { timeoutMs: 8000, ...opts }));
const num = (v) => (v == null || v === '' || !isFinite(Number(v)) ? null : Number(v));

/* ───────── provider adapters: symbols[] → [{ symbol, price, prevClose, ts }] ───────── */
const FETCH = {
  async massive(symbols, k) {
    // Unified v3 snapshot: one request for indices, stocks, FX and crypto tickers together.
    const j = await J(`https://api.polygon.io/v3/snapshot?ticker.any_of=${encodeURIComponent(symbols.join(','))}&limit=250&apiKey=${encodeURIComponent(k.MASSIVE_API_KEY)}`);
    return (j.results || []).filter(r => !r.error).map(r => {
      const sess = r.session || {};
      const price = num(r.value) ?? num(r.last_trade && r.last_trade.price) ?? num(r.last_quote && (r.last_quote.midpoint ?? r.last_quote.ask)) ?? num(sess.close) ?? num(sess.price);
      const prev = num(sess.previous_close) ?? (price != null && num(sess.change) != null ? price - num(sess.change) : null);
      const tsRaw = r.last_updated || (r.last_trade && r.last_trade.sip_timestamp) || r.updated;
      const ts = tsRaw ? new Date(Number(tsRaw) > 1e15 ? Number(tsRaw) / 1e6 : Number(tsRaw) > 1e12 ? Number(tsRaw) : Number(tsRaw) * 1000).toISOString() : new Date().toISOString();
      return { symbol: r.ticker, price, prevClose: prev, ts, delayed: r.timeframe === 'DELAYED' };
    });
  },
  async alpaca(symbols, k) {
    const h = { headers: { 'APCA-API-KEY-ID': k.ALPACA_KEY_ID, 'APCA-API-SECRET-KEY': k.ALPACA_SECRET_KEY } };
    const stocks = symbols.filter(x => !x.includes('/')); const crypto = symbols.filter(x => x.includes('/'));
    const snap = (sym, sn) => { const t = sn && sn.latestTrade; const prev = sn && sn.prevDailyBar ? num(sn.prevDailyBar.c) : null; return { symbol: sym, price: t ? num(t.p) : null, prevClose: prev, ts: t ? t.t : new Date().toISOString() }; };
    const out = [];
    if (stocks.length) { const j = await J(`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(stocks.join(','))}&feed=iex`, h); for (const [sym, sn] of Object.entries(j || {})) out.push(snap(sym, sn)); }
    if (crypto.length) { const j = await J(`https://data.alpaca.markets/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(crypto.join(','))}`, h); for (const [sym, sn] of Object.entries((j && j.snapshots) || {})) out.push(snap(sym, sn)); }
    return out;
  },
  async finnhub(symbols, k) {
    // One call per symbol; the cache TTL keeps us well inside the free 60 calls/min for the six ETFs mapped.
    const out = await Promise.all(symbols.map(async (sym) => {
      try { const q = await J(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(k.FINNHUB_API_KEY)}`); return { symbol: sym, price: num(q.c) || null, prevClose: num(q.pc), ts: q.t ? new Date(q.t * 1000).toISOString() : new Date().toISOString() }; }
      catch (e) { return { symbol: sym, error: e.message, status: e.status }; }
    }));
    // a rejected key fails the whole group; 'no access to this symbol' (403 on a premium symbol) stays per symbol so it can be learned as a plan gap
    if (out.length && out.every(x => x.error) && out.some(x => x.status === 401)) throw Object.assign(new Error(out[0].error), { status: out[0].status });
    return out;
  },
  async twelvedata(symbols, k) {
    const j = await J(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${encodeURIComponent(k.TWELVEDATA_API_KEY)}`);
    if (j && j.status === 'error') { const e = new Error(j.message || 'Twelve Data error'); e.status = j.code; throw e; }
    const list = symbols.length === 1 ? [[symbols[0], j]] : Object.entries(j || {});
    return list.map(([sym, q]) => q && q.status !== 'error'
      ? { symbol: sym, price: num(q.close), prevClose: num(q.previous_close), ts: q.timestamp ? new Date(q.timestamp * 1000).toISOString() : (q.datetime || new Date().toISOString()) }
      : { symbol: sym, error: (q && q.message) || 'no data' });
  },
};

/** Fetch polled quotes. Each instrument tries its providers in priority order: anything the first provider could not
 *  price moves to the next one in the same request, and the gap is remembered for 6 hours. Each provider group is
 *  cached for the interval, so all visitors share one upstream call per provider per interval. */
export async function rtQuotes(ctx) {
  const { config, cache } = ctx; const s = rtSettings(config);
  if (!s.enabled) return { enabled: false, quotes: [], providers: {} };
  const routing = await loadRouting(ctx); const gaps = await knownGaps(ctx);
  const cov = routeFor(s, routing, gaps, routing.scan);
  let pending = Object.entries(cov).filter(([, v]) => v.path === 'poll').map(([id, v]) => ({ id, chain: v.chain, step: 0, forced: v.forced }));
  const providers = {}; const quotes = []; const unpriced = [];
  for (let pass = 0; pass < ORDER.length && pending.length; pass++) {
    const groups = {};
    for (const it of pending) { const p = it.chain[it.step]; if (p) (groups[p] ||= []).push({ ...it, symbol: RT_MAP[it.id][p] }); }
    const next = [];
    await Promise.all(Object.entries(groups).map(async ([p, items]) => {
      const ttl = p === 'twelvedata' ? Math.max(s.intervalSec, Math.ceil(items.length * 60 / s.tdCredits)) : s.intervalSec;
      const syms = items.map(i => i.symbol);
      const r = await cache.resolve(`rt:${p}:${syms.join(',')}`, ttl, () => FETCH[p](syms, config.keys));
      const prev = providers[p];
      providers[p] = { name: PROVIDERS[p].name, ok: !r.error || !!(prev && prev.ok), error: r.error || (prev && prev.error) || null, stale: !!r.stale, ttl, fetchedAt: r.fetchedAt ? new Date(r.fetchedAt).toISOString() : null, priced: (prev ? prev.priced : 0), missed: (prev ? prev.missed : []) };
      const bySym = new Map((r.data || []).map(x => [x.symbol, x]));
      for (const it of items) {
        const x = bySym.get(it.symbol);
        if (x && x.price != null && !x.error) { providers[p].priced++; quotes.push({ id: it.id, price: x.price, prevClose: x.prevClose ?? null, pct1d: x.prevClose ? (x.price / x.prevClose - 1) * 100 : null, ts: x.ts, source: p, delayed: !!x.delayed, stale: !!r.stale }); continue; }
        providers[p].missed.push(it.id);
        if ((!r.error || (x && x.error)) && !it.forced) { try { await cache.write(gapKey(p, it.symbol), { data: 1, fetchedAt: Date.now() }, 6 * 3600); } catch (e) {} }
        if (it.step + 1 < it.chain.length) next.push({ ...it, step: it.step + 1 }); else unpriced.push(it.id);
      }
    }));
    pending = next;
  }
  return { enabled: true, intervalSec: s.intervalSec, quotes, providers, unpriced: [...unpriced, ...pending.map(x => x.id)] };
}

/** Admin "Scan my plans": ask every configured provider for every symbol it maps, once, and record what came back. */
export async function scanPlans(ctx) {
  const s = rtSettings(ctx.config); const results = {}; const summary = {};
  await Promise.all(ORDER.filter(p => s.configured[p]).map(async (p) => {
    const pairs = Object.entries(RT_MAP).filter(([, m]) => m[p]).map(([id, m]) => [id, m[p]]);
    let data = []; let error = null;
    try { data = await FETCH[p](pairs.map(x => x[1]), ctx.config.keys); } catch (e) { error = e.message; }
    const bySym = new Map((data || []).map(x => [x.symbol, x]));
    let ok = 0;
    for (const [id, sym] of pairs) {
      const x = bySym.get(sym); const priced = !!(x && x.price != null && !x.error);
      (results[id] ||= {})[p] = error ? { ok: null, error } : priced ? { ok: true, price: x.price, delayed: !!x.delayed } : { ok: false, error: (x && x.error) ? String(x.error).slice(0, 80) : 'not in plan' };
      if (priced) { ok++; try { await ctx.cache.del(gapKey(p, sym)); } catch (e) {} }
    }
    summary[p] = { name: PROVIDERS[p].name, priced: ok, of: pairs.length, error };
  }));
  const scan = { at: new Date().toISOString(), results, summary };
  await saveRouting(ctx, { scan });
  return scan;
}

/* ───────── credential tests (Admin "Test" buttons) ───────── */
export const RT_TESTS = {
  async MASSIVE_API_KEY(key) {
    const r = await FETCH.massive(['I:SPX', 'EEM', 'C:EURUSD'], { MASSIVE_API_KEY: key });
    const got = r.filter(x => x.price != null).map(x => `${x.symbol} ${x.price}${x.delayed ? ' (delayed)' : ''}`);
    return got.length ? `Key accepted. ${got.join(' · ')}. Tickers your plan does not cover are skipped.` : 'Key accepted, but your plan returned no prices for I:SPX, EEM or C:EURUSD.';
  },
  async ALPACA_KEY_ID(key, keys) {
    const id = key; const secret = keys.ALPACA_SECRET_KEY;
    if (!secret) throw new Error('Save the Alpaca secret key as well, then test again.');
    const r = await FETCH.alpaca(['EEM', 'TLT'], { ALPACA_KEY_ID: id, ALPACA_SECRET_KEY: secret });
    return `Keys accepted (IEX feed). ${r.map(x => `${x.symbol} ${x.price ?? 'n/a'}`).join(' · ')}.`;
  },
  async FINNHUB_API_KEY(key) {
    const [r] = await FETCH.finnhub(['EEM'], { FINNHUB_API_KEY: key });
    if (r.error) throw Object.assign(new Error(r.error), { status: /401|403/.test(r.error) ? 401 : undefined });
    return `Key accepted. EEM ${r.price} (prev close ${r.prevClose}).`;
  },
  async TWELVEDATA_API_KEY(key) {
    const r = await FETCH.twelvedata(['EUR/USD'], { TWELVEDATA_API_KEY: key });
    if (!r[0] || r[0].error) throw new Error((r[0] && r[0].error) || 'No data');
    return `Key accepted. EUR/USD ${r[0].price}.`;
  },
};

/* ───────── WebSocket options ─────────
   Every provider below authenticates its stream with the API key, and an edge function cannot hold a stream open
   for visitors, so a socket runs in the browser. 'admin' hands the key only to an unlocked Admin browser;
   'everyone' puts it in the public config (offered only for providers without a one-connection limit). */
const WS_DEF = {
  massive: { key: 'WS_MASSIVE', modes: ['off', 'admin'], url: () => 'wss://socket.polygon.io/stocks', stocksOnly: true },
  alpaca: { key: 'WS_ALPACA', modes: ['off', 'admin'], url: () => 'wss://stream.data.alpaca.markets/v2/iex', stocksOnly: true },
  finnhub: { key: 'WS_FINNHUB', modes: ['off', 'admin', 'everyone'], url: (k) => `wss://ws.finnhub.io?token=${encodeURIComponent(k.FINNHUB_API_KEY)}` },
  twelvedata: { key: 'WS_TWELVEDATA', modes: ['off', 'admin', 'everyone'], url: (k) => `wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(k.TWELVEDATA_API_KEY)}` },
};
/** Socket descriptors for the given audience ('everyone' or 'admin'). Each lists id → provider symbol for the
 *  instruments currently routed to that provider (or whose chain includes it). */
export async function socketsFor(ctx, audience) {
  const s = rtSettings(ctx.config); if (!s.enabled) return [];
  const routing = await loadRouting(ctx); const cov = routeFor(s, routing, await knownGaps(ctx), routing.scan);
  const k = ctx.config.keys; const out = [];
  for (const [p, d] of Object.entries(WS_DEF)) {
    const mode = d.modes.includes(k[d.key]) ? k[d.key] : 'off';
    if (mode === 'off' || !s.configured[p]) continue;
    if (audience === 'everyone' && mode !== 'everyone') continue;
    const symbols = {};
    for (const [id, v] of Object.entries(cov)) {
      if (v.path !== 'poll' || !(v.chain || []).includes(p)) continue;
      const sym = RT_MAP[id][p]; if (!sym) continue;
      if (d.stocksOnly && /[:/]/.test(sym)) continue;
      symbols[id] = sym;
    }
    if (!Object.keys(symbols).length) continue;
    const desc = { provider: p, mode, url: d.url(k), symbols };
    if (p === 'massive') desc.auth = { action: 'auth', params: k.MASSIVE_API_KEY };
    if (p === 'alpaca') desc.auth = { action: 'auth', key: k.ALPACA_KEY_ID, secret: k.ALPACA_SECRET_KEY };
    out.push(desc);
  }
  return out;
}
export const WS_INFO = Object.fromEntries(Object.entries(WS_DEF).map(([p, d]) => [p, { key: d.key, modes: d.modes }]));
