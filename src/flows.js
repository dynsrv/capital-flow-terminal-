// Capital Flow Monitor. Only series that measure actual supply / balance changes are shown as flows.
// Price appreciation and traded volume are reported separately and explicitly NOT treated as inflows.
import { getHistory, getQuotes } from './data.js';
import { windowSlice } from './analytics.js';
import { round } from './lib/util.js';

function changeOver(points, days) {
  if (!points || points.length < 2) return null;
  const c = windowSlice(points, days);
  const last = points[points.length - 1];
  const base = points.filter(p => p[0] < c[0]?.[0]).slice(-1)[0] || c[0];
  if (!base || base === last) return null;
  return { from: base[0], to: last[0], abs: last[1] - base[1], pct: base[1] ? (last[1] / base[1] - 1) * 100 : null, latest: last[1] };
}

export async function flows(ctx) {
  const out = { asOf: new Date().toISOString(), sections: [] };

  // 1. Stablecoin supply (USDT + USDC market cap ≈ circulating supply × $1). Measured on-chain supply.
  const stables = [];
  for (const id of ['USDT', 'USDC']) {
    try {
      const h = await getHistory(ctx, id);
      const mc = h.marketCaps || [];
      stables.push({ id, name: id === 'USDT' ? 'Tether (USDT)' : 'USD Coin (USDC)', latest: mc.length ? mc[mc.length - 1][1] : null, d7: changeOver(mc, 7), d30: changeOver(mc, 30), d90: changeOver(mc, 90), series: windowSlice(mc, 180).map(p => [p[0], round(p[1] / 1e9, 2)]), source: 'coingecko', stale: h.stale, error: h.error });
    } catch (e) { stables.push({ id, error: e.message }); }
  }
  out.sections.push({ id: 'stablecoins', title: 'Stablecoin supply (USD bn)', type: 'flow', measure: 'Circulating supply × $1 — net issuance/redemption is a measured capital flow into/out of crypto dollars', items: stables });

  // 2. Fed net liquidity = Fed assets − reverse repo − Treasury General Account (weekly, FRED).
  try {
    const [w, r, t] = await Promise.all([getHistory(ctx, 'WALCL'), getHistory(ctx, 'RRP'), getHistory(ctx, 'TGA')]);
    // Align on WALCL weekly dates (Wednesdays) using the nearest prior observation of the other two.
    const nearest = (pts, date) => { let v = null; for (const p of pts) { if (p[0] <= date) v = p[1]; else break; } return v; };
    const series = [];
    for (const [d, assetsMn] of windowSlice(w.points, 365 * 2)) {
      const rrp = nearest(r.points, d), tga = nearest(t.points, d);
      if (rrp == null || tga == null) continue;
      series.push([d, round(assetsMn / 1e3 - rrp - tga / 1e3, 1)]); // USD bn (WALCL & WTREGEN in $mn, RRP in $bn)
    }
    out.sections.push({ id: 'fed_liquidity', title: 'US net liquidity proxy (USD bn)', type: 'liquidity', measure: 'Fed total assets − overnight reverse repo − Treasury General Account. Weekly, FRED (WALCL, RRPONTSYD, WTREGEN).', items: [
      { id: 'NETLIQ', name: 'Net liquidity', latest: series.length ? series[series.length - 1][1] : null, d7: changeOver(series, 7), d30: changeOver(series, 30), d90: changeOver(series, 90), series, source: 'fred', stale: w.stale || r.stale || t.stale },
      { id: 'WALCL', name: 'Fed total assets', latest: w.points.length ? round(w.points[w.points.length - 1][1] / 1e3, 1) : null, d30: changeOver(w.points.map(p => [p[0], p[1] / 1e3]), 30), d90: changeOver(w.points.map(p => [p[0], p[1] / 1e3]), 90), series: windowSlice(w.points, 365).map(p => [p[0], round(p[1] / 1e3, 1)]), source: 'fred' },
      { id: 'RRP', name: 'Reverse repo · drains', latest: r.points.length ? r.points[r.points.length - 1][1] : null, d30: changeOver(r.points, 30), d90: changeOver(r.points, 90), series: windowSlice(r.points, 365).map(p => [p[0], p[1]]), source: 'fred' },
      { id: 'TGA', name: 'Treasury account (TGA) · drains', latest: t.points.length ? round(t.points[t.points.length - 1][1] / 1e3, 1) : null, d30: changeOver(t.points.map(p => [p[0], p[1] / 1e3]), 30), d90: changeOver(t.points.map(p => [p[0], p[1] / 1e3]), 90), series: windowSlice(t.points, 365).map(p => [p[0], round(p[1] / 1e3, 1)]), source: 'fred' },
    ] });
  } catch (e) {
    out.sections.push({ id: 'fed_liquidity', title: 'US net liquidity proxy', type: 'liquidity', error: e.message, items: [] });
  }

  // 3. Crypto exchange turnover — VOLUME, explicitly not a flow.
  try {
    const q = await getQuotes(ctx, ['BTC', 'ETH', 'SOL']);
    out.sections.push({ id: 'crypto_volume', title: 'Crypto 24h traded volume (USD) — turnover, not a capital flow', type: 'volume', measure: 'Exchange-reported 24h volume aggregated by CoinGecko. Volume measures activity, not net buying.', items: q.map(x => ({ id: x.id, name: x.name, latest: x.volume, marketCap: x.marketCap, turnover: x.volume && x.marketCap ? round(x.volume / x.marketCap * 100, 2) : null, asOf: x.asOf, source: x.source, stale: x.stale })) });
  } catch (e) {}

  // 4. ETF / fund flows and exchange net flows require a licensed provider — reported as unavailable, never estimated.
  out.sections.push({ id: 'etf_flows', title: 'ETF & fund flows', type: 'flow', unavailable: true, reason: 'No free, licensed source for daily ETF creations/redemptions or fund flows is configured. Candidates: ETF.com / FactSet / ICI (weekly, lagged) / Farside (spot BTC ETFs). Add a connector in src/adapters and register it in Admin. Price moves and volume are NOT substituted for flows.', items: [] });

  return out;
}
