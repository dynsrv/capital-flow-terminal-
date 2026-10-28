// Measures for two pre-crash conditions that earlier needed licensed data.
//
// 1. Valuation, from official aggregates (no earnings feed needed):
//    - Market value of US corporate equities ÷ GDP ("Buffett indicator")
//        FRED NCBEILQ027S (Fed Z.1, nonfinancial corporate equities, USD mn, quarterly, end-of-quarter level) ÷ FRED GDP (USD bn, SAAR)
//    - Market value ÷ after-tax corporate profits (an economy-wide price/earnings multiple)
//        NCBEILQ027S ÷ FRED CP (corporate profits after tax, USD bn, SAAR)
//    Both are ranked against their full history (1951 onward). The latest quarter is about three months old,
//    so the ratio is carried forward with the S&P 500's move since that quarter end (GDP and profits held flat):
//    that nowcast is labelled as an estimate.
//
// 2. Mechanical (systematic) selling, from public prices. No public series reports systematic positioning,
//    so this models the mechanism instead of the position:
//    - Volatility-targeting exposure: a fund targeting 10% annualised volatility holds 10 / realised-vol
//      (21-day, capped at 1.5×). When realised volatility is low the model is fully levered and a volatility
//      jump forces selling — the modern counterpart of 1987 portfolio insurance.
//    - VIX term structure: VIX ÷ VIX3M above 1 (backwardation) marks active hedging demand and de-risking.
//    - Trend proximity: distance of the S&P 500 from its 50-day average, where trend-following signals flip.
import * as fred from './adapters/fred.js';
import * as yahoo from './adapters/yahoo.js';

const DAY = 86400;
async function fredLong(ctx, id) {
  const r = await ctx.cache.resolve(`val:fred:${id}`, DAY, () => fred.series(id, { apiKey: ctx.config.keys.FRED_API_KEY || '', years: 80 }));
  if (!r.data) throw new Error(r.error || `FRED ${id} unavailable`);
  return r.data.points;
}
const quarterEnd = (d) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 3); x.setUTCDate(0); return x.toISOString().slice(0, 10); };
const at = (points, date) => { let v = null; for (const p of points) { if (p[0] <= date) v = p[1]; else break; } return v; };
const rank = (arr, v) => (arr.length && v != null ? arr.filter(x => x <= v).length / arr.length : null);
function joinRatio(num, den, k) { const m = new Map(den.map(p => [p[0], p[1]])); return num.filter(p => m.has(p[0]) && m.get(p[0])).map(p => [p[0], p[1] / (m.get(p[0]) * k)]); }

/** Valuation ratios with history, percentile ranks and episode reference points. */
export async function valuation(ctx, spxPoints) {
  const [mv, gdp, cp] = await Promise.all([fredLong(ctx, 'NCBEILQ027S'), fredLong(ctx, 'GDP'), fredLong(ctx, 'CP')]);
  const toGdp = joinRatio(mv, gdp, 1000).map(([d, v]) => [d, v * 100]);   // %
  const toProfits = joinRatio(mv, cp, 1000);                                // ×
  const last = toGdp[toGdp.length - 1]; const lastP = toProfits[toProfits.length - 1];
  const qEnd = quarterEnd(last[0]);
  const spxQ = spxPoints && spxPoints.length ? at(spxPoints, qEnd) : null;
  const spxNow = spxPoints && spxPoints.length ? spxPoints[spxPoints.length - 1][1] : null;
  const carry = spxQ && spxNow ? spxNow / spxQ : 1;
  const ref = (series, date) => { const p = series.filter(x => x[0] <= date).pop(); return p ? { quarter: p[0], value: p[1] } : null; };
  const histG = toGdp.map(p => p[1]); const histP = toProfits.map(p => p[1]);
  const nowG = last[1] * carry; const nowP = lastP ? lastP[1] * carry : null;
  return {
    toGdp: { quarter: last[0], quarterEnd: qEnd, reported: last[1], nowcast: nowG, pctile: rank(histG, nowG), max: Math.max(...histG), since: toGdp[0][0] },
    toProfits: lastP ? { quarter: lastP[0], reported: lastP[1], nowcast: nowP, pctile: rank(histP, nowP), since: toProfits[0][0] } : null,
    spxSinceQuarter: (carry - 1) * 100,
    episodes: {
      1987: { toGdp: ref(toGdp, '1987-07-01'), toProfits: ref(toProfits, '1987-07-01') },
      2000: { toGdp: ref(toGdp, '2000-01-01'), toProfits: ref(toProfits, '2000-01-01') },
      2007: { toGdp: ref(toGdp, '2007-07-01'), toProfits: ref(toProfits, '2007-07-01') },
      2020: { toGdp: ref(toGdp, '2019-10-01'), toProfits: ref(toProfits, '2019-10-01') },
      2022: { toGdp: ref(toGdp, '2021-10-01'), toProfits: ref(toProfits, '2021-10-01') },
    },
    history: toGdp.slice(-120),
    sources: ['https://fred.stlouisfed.org/series/NCBEILQ027S', 'https://fred.stlouisfed.org/series/GDP', 'https://fred.stlouisfed.org/series/CP'],
  };
}

/** Systematic-selling model from S&P 500, VIX and VIX3M closes. */
export async function systematic(ctx, spxPoints, vixPoints) {
  let vix3m = [];
  try { const r = await ctx.cache.resolve('val:yahoo:^VIX3M', 3600, () => yahoo.history('^VIX3M', '2y')); vix3m = r.data ? r.data.points : []; } catch (e) { vix3m = []; }
  const px = spxPoints || []; if (px.length < 300) return null;
  const rets = []; for (let i = 1; i < px.length; i++) rets.push([px[i][0], Math.log(px[i][1] / px[i - 1][1])]);
  const rv = (end) => { const w = rets.slice(Math.max(0, end - 20), end + 1).map(r => r[1]); if (w.length < 15) return null; const m = w.reduce((a, b) => a + b, 0) / w.length; return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / (w.length - 1)) * Math.sqrt(252) * 100; };
  const expo = (v) => (v ? Math.min(1.5, 10 / v) : null);
  const series = []; for (let i = 20; i < rets.length; i++) series.push([rets[i][0], expo(rv(i))]);
  const five = series.slice(-1260).map(p => p[1]).filter(v => v != null);
  const nowE = series[series.length - 1][1]; const e10 = series.length > 10 ? series[series.length - 11][1] : null;
  const rvNow = rv(rets.length - 1);
  const ma50 = px.slice(-50).reduce((a, p) => a + p[1], 0) / Math.min(50, px.length);
  const spx = px[px.length - 1][1];
  const vixNow = vixPoints && vixPoints.length ? vixPoints[vixPoints.length - 1][1] : null;
  const v3 = vix3m.length ? vix3m[vix3m.length - 1][1] : null;
  const term = vixNow && v3 ? vixNow / v3 : null;
  const exposurePct = rank(five, nowE);
  const dist50 = (spx / ma50 - 1) * 100;
  const cut10 = e10 ? (nowE / e10 - 1) * 100 : null;
  const primed = exposurePct != null && exposurePct >= 0.75; // fully levered: a volatility jump forces selling
  const active = (term != null && term > 1) || (cut10 != null && cut10 <= -30);
  return { realisedVol: rvNow, exposure: nowE, exposurePct, exposureChange10d: cut10, vix: vixNow, vix3m: v3, term, dist50, primed, active, state: active ? 'under way' : primed ? 'primed' : 'not primed', asOf: px[px.length - 1][0] };
}
