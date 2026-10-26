// Data service: resolves quotes and histories for the universe through the adapters,
// with per-source caching and explicit freshness / staleness metadata.
import { ASSETS, ASSET_MAP, SIZE_REFERENCES } from './universe.js';
import * as yahoo from './adapters/yahoo.js';
import * as fred from './adapters/fred.js';
import * as cg from './adapters/coingecko.js';
import * as goldapi from './adapters/goldapi.js';
import * as eia from './adapters/eia.js';
import { DEMO_QUOTES, demoHistory } from './demo.js';

export const SOURCES = { yahoo: yahoo.SOURCE, fred: fred.SOURCE, coingecko: cg.SOURCE, goldapi: goldapi.SOURCE, eia: eia.SOURCE };

/** Simple concurrency pool */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function finalize(asset, res, extra = {}) {
  const q = res.data || {};
  const asOf = q.asOf || null;
  const ageMin = asOf ? Math.round((Date.now() - new Date(asOf).getTime()) / 60000) : null;
  return {
    id: asset.id, name: asset.name, cls: asset.cls, region: asset.region, kind: asset.kind, unit: asset.unit,
    source: q.source || asset.source, symbol: asset.symbol,
    price: q.price ?? null, prevClose: q.prevClose ?? null, change: q.change ?? null, pct1d: q.pct1d ?? null,
    volume: q.volume ?? null, high: q.high ?? null, low: q.low ?? null, marketCap: q.marketCap ?? null,
    currency: q.currency || 'USD',
    asOf, ageMinutes: ageMin,
    freshness: q.freshness || asset.freshness,
    fetchedAt: res.fetchedAt ? new Date(res.fetchedAt).toISOString() : null,
    cacheHit: !!res.cacheHit,
    stale: !!res.stale,
    error: res.error || null,
    available: q.price != null,
    ...extra,
  };
}

/* ───────────────────────────── Histories ───────────────────────────── */

export async function getHistory(ctx, id) {
  const asset = ASSET_MAP[id];
  if (!asset) throw new Error(`Unknown asset ${id}`);
  const { cache, config } = ctx;
  if (config.demoMode) return { id, ...demoHistory(asset), demo: true };

  const src = asset.history ? asset.history.source : asset.source;
  const sym = asset.history ? asset.history.symbol : asset.symbol;

  if (src === 'yahoo') {
    const r = await cache.resolve(`h:yahoo:${sym}`, config.ttl.history, () => yahoo.history(sym, '10y'));
    return { id, points: r.data ? r.data.points : [], volumes: r.data ? r.data.volumes : [], source: 'yahoo', freshness: 'eod', stale: r.stale, error: r.error || null, fetchedAt: r.fetchedAt };
  }
  if (src === 'fred') {
    const r = await cache.resolve(`h:fred:${sym}`, config.ttl.macro, () => fred.series(sym, { apiKey: config.keys.FRED_API_KEY, years: 12 }));
    let points = r.data ? r.data.points : [];
    if (asset.transform === 'yoy') points = fred.yoy(points);
    return { id, points, source: 'fred', freshness: asset.freshness, stale: r.stale, error: r.error || null, fetchedAt: r.fetchedAt, url: r.data && r.data.url };
  }
  if (src === 'coingecko') {
    const key = config.keys.COINGECKO_API_KEY;
    const days = key ? 'max' : 365;
    const r = await cache.resolve(`h:cg:${sym}:${days}`, Math.max(config.ttl.history, 1800), () => cg.marketChart(sym, key, days));
    return { id, points: r.data ? r.data.points : [], marketCaps: r.data ? r.data.marketCaps : [], volumes: r.data ? r.data.volumes : [], source: 'coingecko', freshness: 'eod', stale: r.stale, error: r.error || null, fetchedAt: r.fetchedAt, coverageNote: key ? null : 'CoinGecko free tier: 365 days max; add an API key in Admin for longer history' };
  }
  throw new Error(`No history adapter for ${src}`);
}

/* ───────────────────────────── Quotes ───────────────────────────── */

export async function getQuotes(ctx, ids = null) {
  const { cache, config } = ctx;
  const assets = ids ? ids.map(i => ASSET_MAP[i]).filter(Boolean) : ASSETS;
  if (config.demoMode) return assets.map(a => ({ ...DEMO_QUOTES[a.id], id: a.id, name: a.name, cls: a.cls, region: a.region, kind: a.kind, unit: a.unit, demo: true, freshness: 'demo', source: 'demo', available: true }));

  // CoinGecko batch (one call for all coins)
  const cgAssets = assets.filter(a => a.source === 'coingecko');
  let cgRes = null;
  if (cgAssets.length) {
    const allIds = ASSETS.filter(a => a.source === 'coingecko').map(a => a.symbol);
    cgRes = await cache.resolve('q:cg:markets', config.ttl.quotes, () => cg.markets(allIds, config.keys.COINGECKO_API_KEY));
  }

  const results = await pool(assets, 6, async (a) => {
    try {
      if (a.source === 'yahoo') {
        const r = await cache.resolve(`q:yahoo:${a.symbol}`, config.ttl.quotes, () => yahoo.quote(a.symbol));
        return finalize(a, r);
      }
      if (a.source === 'goldapi') {
        const r = await cache.resolve(`q:gold:${a.symbol}`, config.ttl.quotes, () => goldapi.spot(a.symbol));
        // previous close from the futures history so we can show a daily change
        let prev = null;
        try { const h = await getHistory(ctx, a.id); if (h.points.length >= 2) prev = h.points[h.points.length - 2][1]; } catch (e) {}
        const q = r.data ? { ...r.data, prevClose: prev, change: prev != null ? r.data.price - prev : null, pct1d: prev ? (r.data.price / prev - 1) * 100 : null } : null;
        return finalize(a, { ...r, data: q }, { changeNote: prev != null ? 'Change vs prior futures settlement (Yahoo GC=F/SI=F)' : null });
      }
      if (a.source === 'coingecko') {
        const q = cgRes && cgRes.data ? cgRes.data[a.symbol] : null;
        return finalize(a, { ...cgRes, data: q });
      }
      if (a.source === 'fred') {
        const h = await getHistory(ctx, a.id);
        const n = h.points.length;
        const last = n ? h.points[n - 1] : null;
        const prev = n > 1 ? h.points[n - 2] : null;
        const q = last ? { price: last[1], prevClose: prev ? prev[1] : null, change: prev ? last[1] - prev[1] : null, pct1d: prev && prev[1] ? (last[1] / prev[1] - 1) * 100 : null, asOf: last[0] + 'T00:00:00Z', freshness: a.freshness, source: 'fred' } : null;
        return finalize(a, { data: q, fetchedAt: h.fetchedAt, stale: h.stale, error: h.error, cacheHit: true }, { sourceUrl: h.url });
      }
      return finalize(a, { data: null, error: `No adapter for ${a.source}` });
    } catch (e) {
      return finalize(a, { data: null, error: e.message });
    }
  });

  // Optional official EIA overlay for energy
  if (config.keys.EIA_API_KEY) {
    for (const r of results) {
      const s = eia.SERIES[r.id];
      if (!s) continue;
      try {
        const o = await cache.resolve(`q:eia:${s.id}`, config.ttl.macro, () => eia.latest(s.id, config.keys.EIA_API_KEY));
        if (o.data) r.official = { label: s.label, price: o.data.price, asOf: o.data.asOf, source: 'eia' };
      } catch (e) { /* ignore */ }
    }
  }
  return results;
}

/* ───────────────────────────── Market sizes ───────────────────────────── */

export async function getSizes(ctx, quotes) {
  const { cache, config } = ctx;
  const out = [];
  let overrides = {};
  try { overrides = (await ctx.env.CACHE?.get('admin:sizes', 'json')) || {}; } catch (e) {}

  let cgGlobal = null;
  if (!config.demoMode) {
    const r = await cache.resolve('q:cg:global', config.ttl.quotes, () => cg.global(config.keys.COINGECKO_API_KEY));
    cgGlobal = r.data ? { ...r.data, stale: r.stale, fetchedAt: r.fetchedAt } : { error: r.error };
  }
  const gold = quotes.find(q => q.id === 'GOLD');
  const usdt = quotes.find(q => q.id === 'USDT');
  const usdc = quotes.find(q => q.id === 'USDC');

  for (const ref of SIZE_REFERENCES) {
    const o = overrides[ref.id] || {};
    if (ref.id === 'GOLD_STOCK') {
      const tonnes = o.tonnes || ref.tonnes;
      const oz = tonnes * 32150.7466;
      const usd = gold && gold.price ? oz * gold.price : null;
      out.push({ ...ref, tonnes, usd, computed: true, live: !!usd, note: usd ? `${tonnes.toLocaleString()} t × $${gold.price.toLocaleString()} /oz` : 'Gold spot unavailable', children: [] });
      continue;
    }
    if (ref.id === 'CRYPTO_TOTAL') {
      const usd = cgGlobal && cgGlobal.totalMarketCapUsd || null;
      const children = [];
      for (const q of quotes.filter(q => q.cls === 'crypto' && q.marketCap)) children.push({ id: q.id, label: q.name.replace(' (stablecoin supply)', ''), usd: q.marketCap });
      if (usd) { const known = children.reduce((s, c) => s + c.usd, 0); if (usd > known) children.push({ id: 'CRYPTO_OTHER', label: 'Other crypto', usd: usd - known }); }
      out.push({ ...ref, usd, live: !!usd, asOf: cgGlobal && cgGlobal.asOf, stale: cgGlobal && cgGlobal.stale, error: cgGlobal && cgGlobal.error, children, extra: cgGlobal ? { volume24h: cgGlobal.totalVolume24hUsd, btcDominance: cgGlobal.btcDominance, mcapChange24hPct: cgGlobal.mcapChange24hPct, stablecoinSupply: (usdt?.marketCap || 0) + (usdc?.marketCap || 0) } : null });
      continue;
    }
    out.push({ ...ref, usd: o.usd || ref.usd, source: o.source || ref.source, asOf: o.asOf || ref.asOf, live: false, children: (ref.children || []).map(c => ({ ...c })) });
  }
  return out;
}
