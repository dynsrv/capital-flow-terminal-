// CoinGecko public API. Free tier: ~30 req/min, 365d history max. Demo/Pro keys raise limits.
import { fetchJSON, isoDate } from '../lib/util.js';

export const SOURCE = { id: 'coingecko', name: 'CoinGecko', url: 'https://www.coingecko.com', license: 'CoinGecko API terms; attribution required' };

function base(apiKey) { return apiKey && apiKey.startsWith('CG-') && apiKey.length > 20 && apiKey.includes('pro') ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3'; }
function headers(apiKey) { return apiKey ? { 'x-cg-demo-api-key': apiKey, 'x-cg-pro-api-key': apiKey } : {}; }

/** Batch quotes for coin ids → map id → quote */
export async function markets(ids, apiKey = '') {
  const u = `${base(apiKey)}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d,30d`;
  const arr = await fetchJSON(u, { headers: headers(apiKey) });
  const out = {};
  for (const c of arr) {
    out[c.id] = {
      price: c.current_price,
      prevClose: c.current_price != null && c.price_change_percentage_24h != null ? c.current_price / (1 + c.price_change_percentage_24h / 100) : null,
      change: c.price_change_24h ?? null,
      pct1d: c.price_change_percentage_24h ?? null,
      pct7d: c.price_change_percentage_7d_in_currency ?? null,
      pct30d: c.price_change_percentage_30d_in_currency ?? null,
      volume: c.total_volume ?? null,            // 24h traded volume (USD) — NOT a capital flow
      marketCap: c.market_cap ?? null,
      circulatingSupply: c.circulating_supply ?? null,
      high: c.high_24h ?? null,
      low: c.low_24h ?? null,
      currency: 'USD',
      asOf: c.last_updated || null,
      freshness: 'realtime',
      source: SOURCE.id,
    };
  }
  return out;
}

export async function global(apiKey = '') {
  const j = await fetchJSON(`${base(apiKey)}/global`, { headers: headers(apiKey) });
  const d = j.data || {};
  return {
    totalMarketCapUsd: d.total_market_cap && d.total_market_cap.usd,
    totalVolume24hUsd: d.total_volume && d.total_volume.usd,
    btcDominance: d.market_cap_percentage && d.market_cap_percentage.btc,
    ethDominance: d.market_cap_percentage && d.market_cap_percentage.eth,
    mcapChange24hPct: d.market_cap_change_percentage_24h_usd,
    asOf: d.updated_at ? new Date(d.updated_at * 1000).toISOString() : null,
    source: SOURCE.id,
  };
}

/** Daily history: prices, market caps, volumes. days: up to 365 on free tier ('max' with key). */
export async function marketChart(id, apiKey = '', days = 365) {
  const u = `${base(apiKey)}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const j = await fetchJSON(u, { headers: headers(apiKey), timeoutMs: 20000 });
  const dedupe = (arr) => {
    const out = [];
    for (const [ts, v] of arr || []) {
      const d = isoDate(ts);
      if (out.length && out[out.length - 1][0] === d) out[out.length - 1][1] = v; else out.push([d, v]);
    }
    return out;
  };
  return { points: dedupe(j.prices), marketCaps: dedupe(j.market_caps), volumes: dedupe(j.total_volumes), source: SOURCE.id, freshness: 'eod' };
}
