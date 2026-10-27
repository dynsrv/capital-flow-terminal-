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

/** Universe id → provider symbol. Only direct equivalents; no proxies. */
export const RT_MAP = {
  SPX: { massive: 'I:SPX' }, NDX: { massive: 'I:NDX' }, RUT: { massive: 'I:RUT' }, VIX: { massive: 'I:VIX' },
  EEM: { massive: 'EEM', alpaca: 'EEM', finnhub: 'EEM', twelvedata: 'EEM' },
  TLT: { massive: 'TLT', alpaca: 'TLT', finnhub: 'TLT', twelvedata: 'TLT' },
  LQD: { massive: 'LQD', alpaca: 'LQD', finnhub: 'LQD', twelvedata: 'LQD' },
  HYG: { massive: 'HYG', alpaca: 'HYG', finnhub: 'HYG', twelvedata: 'HYG' },
  EMB: { massive: 'EMB', alpaca: 'EMB', finnhub: 'EMB', twelvedata: 'EMB' },
  DBA: { massive: 'DBA', alpaca: 'DBA', finnhub: 'DBA', twelvedata: 'DBA' },
  EURUSD: { massive: 'C:EURUSD', twelvedata: 'EUR/USD' },
  USDJPY: { massive: 'C:USDJPY', twelvedata: 'USD/JPY' },
  GBPUSD: { massive: 'C:GBPUSD', twelvedata: 'GBP/USD' },
  USDCNY: { massive: 'C:USDCNY', twelvedata: 'USD/CNY' },
  USDIDR: { massive: 'C:USDIDR', twelvedata: 'USD/IDR' },
  GOLD: { massive: 'C:XAUUSD', twelvedata: 'XAU/USD' },
  SILVER: { massive: 'C:XAGUSD', twelvedata: 'XAG/USD' },
  BTC: { coinbase: 'BTC-USD', massive: 'X:BTCUSD', twelvedata: 'BTC/USD' },
  ETH: { coinbase: 'ETH-USD', massive: 'X:ETHUSD', twelvedata: 'ETH/USD' },
  SOL: { coinbase: 'SOL-USD', massive: 'X:SOLUSD', twelvedata: 'SOL/USD' },
};

export const PROVIDERS = {
  massive: { name: 'Massive (Polygon.io)', keys: ['MASSIVE_API_KEY'], covers: 'US indices (S&P 500, Nasdaq 100, Russell 2000, VIX), US ETFs, FX, metals, crypto', note: 'Real-time needs the Developer tier or above for each asset class; Basic/Starter are 15-minute delayed.' },
  alpaca: { name: 'Alpaca (IEX)', keys: ['ALPACA_KEY_ID', 'ALPACA_SECRET_KEY'], covers: 'US-listed ETFs', note: 'Free Basic plan: real-time IEX venue only (not the consolidated tape). Algo Trader Plus ($99/mo) adds all US exchanges.' },
  finnhub: { name: 'Finnhub', keys: ['FINNHUB_API_KEY'], covers: 'US-listed ETFs', note: 'Free plan: real-time US quotes, about 60 calls/min, personal non-commercial use.' },
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

/** Which provider serves each id, given the configured keys. Crypto goes to the browser stream when enabled. */
export function coverage(s) {
  const out = {};
  for (const [id, m] of Object.entries(RT_MAP)) {
    if (m.coinbase && s.crypto === 'coinbase') { out[id] = { provider: 'coinbase', symbol: m.coinbase, path: 'stream' }; continue; }
    const p = ORDER.find(p => s.configured[p] && m[p]);
    if (p) out[id] = { provider: p, symbol: m[p], path: 'poll' };
  }
  return out;
}

export function publicConfig(config) {
  const s = rtSettings(config);
  const cov = coverage(s);
  return {
    enabled: s.enabled, intervalSec: s.intervalSec,
    stream: s.enabled && s.crypto === 'coinbase' ? { provider: 'coinbase', url: 'wss://ws-feed.exchange.coinbase.com', products: Object.fromEntries(Object.entries(cov).filter(([, v]) => v.provider === 'coinbase').map(([id, v]) => [id, v.symbol])) } : null,
    polled: s.enabled ? Object.entries(cov).filter(([, v]) => v.path === 'poll').map(([id, v]) => ({ id, provider: v.provider })) : [],
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, v]) => [k, { name: v.name, configured: k === 'coinbase' ? s.crypto === 'coinbase' : !!s.configured[k] }])),
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
    const j = await J(`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(','))}&feed=iex`, { headers: { 'APCA-API-KEY-ID': k.ALPACA_KEY_ID, 'APCA-API-SECRET-KEY': k.ALPACA_SECRET_KEY } });
    return Object.entries(j || {}).map(([sym, s]) => {
      const t = s && s.latestTrade; const prev = s && s.prevDailyBar ? num(s.prevDailyBar.c) : null;
      return { symbol: sym, price: t ? num(t.p) : null, prevClose: prev, ts: t ? t.t : new Date().toISOString() };
    });
  },
  async finnhub(symbols, k) {
    // One call per symbol; the cache TTL keeps us well inside the free 60 calls/min for the six ETFs mapped.
    const out = await Promise.all(symbols.map(async (sym) => {
      try { const q = await J(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(k.FINNHUB_API_KEY)}`); return { symbol: sym, price: num(q.c) || null, prevClose: num(q.pc), ts: q.t ? new Date(q.t * 1000).toISOString() : new Date().toISOString() }; }
      catch (e) { return { symbol: sym, error: e.message, status: e.status }; }
    }));
    if (out.length && out.every(x => x.error)) throw Object.assign(new Error(out[0].error), { status: out[0].status });
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

/** Fetch polled quotes for every covered id, grouped by provider, each group cached for the interval. */
export async function rtQuotes(ctx) {
  const { config, cache } = ctx; const s = rtSettings(config);
  if (!s.enabled) return { enabled: false, quotes: [], providers: {} };
  const cov = coverage(s);
  const groups = {};
  for (const [id, v] of Object.entries(cov)) if (v.path === 'poll') (groups[v.provider] ||= []).push({ id, symbol: v.symbol });
  const providers = {}; const quotes = [];
  await Promise.all(Object.entries(groups).map(async ([p, items]) => {
    // Twelve Data's free tier is 8 credits/min (1 credit per symbol): stretch its TTL so we never exceed the budget.
    const ttl = p === 'twelvedata' ? Math.max(s.intervalSec, Math.ceil(items.length * 60 / s.tdCredits)) : s.intervalSec;
    const r = await cache.resolve(`rt:${p}:${items.map(i => i.symbol).join(',')}`, ttl, () => FETCH[p](items.map(i => i.symbol), config.keys));
    providers[p] = { name: PROVIDERS[p].name, ok: !r.error, error: r.error || null, stale: !!r.stale, ttl, fetchedAt: r.fetchedAt ? new Date(r.fetchedAt).toISOString() : null };
    const bySym = new Map((r.data || []).map(x => [x.symbol, x]));
    for (const it of items) {
      const x = bySym.get(it.symbol); if (!x || x.price == null || x.error) continue;
      quotes.push({ id: it.id, price: x.price, prevClose: x.prevClose ?? null, pct1d: x.prevClose ? (x.price / x.prevClose - 1) * 100 : null, ts: x.ts, source: p, delayed: !!x.delayed, stale: !!r.stale });
    }
  }));
  return { enabled: true, intervalSec: s.intervalSec, quotes, providers };
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
