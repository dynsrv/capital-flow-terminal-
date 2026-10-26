// Cross-asset analytics computed from aligned daily histories.
// Everything here is a *measured statistic* of past data (returns, vols, correlations, OLS betas),
// never a forecast. The API labels each output with its window and sample size.
import { ASSET_MAP } from './universe.js';
import { getHistory, getQuotes } from './data.js';
import { WINDOWS, round } from './lib/util.js';

/** Is this instrument quoted in levels where differences (not % returns) are meaningful? */
export function isDiffKind(asset) { return asset.kind === 'yield' || asset.kind === 'spread' || (asset.kind === 'level' && typeof asset.unit === 'string' && asset.unit.startsWith('%')); }

/** daily change series: [[date, r]] — log returns for prices, simple differences (percentage points) for yields/spreads */
export function changes(points, diff) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1][1], b = points[i][1];
    if (a == null || b == null) continue;
    if (diff) out.push([points[i][0], b - a]);
    else if (a > 0 && b > 0) out.push([points[i][0], Math.log(b / a)]);
  }
  return out;
}

export function cutoffDate(days) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }

export function windowSlice(points, days) { const c = cutoffDate(days); return points.filter(p => p[0] >= c); }

export function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }
export function std(xs) { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); }

export function pearson(x, y) {
  const n = Math.min(x.length, y.length); if (n < 3) return null;
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** OLS y = a + b·x → { beta, alpha, r2, n } */
export function ols(x, y) {
  const n = Math.min(x.length, y.length); if (n < 10) return null;
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (!sxx) return null;
  const beta = sxy / sxx; const alpha = my - beta * mx; const r2 = syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { beta, alpha, r2, n };
}

/** Align change series on common dates → { dates, matrix: id → number[] } */
export function align(seriesById) {
  const ids = Object.keys(seriesById);
  if (!ids.length) return { dates: [], cols: {} };
  const maps = ids.map(id => new Map(seriesById[id]));
  let dates = [...maps[0].keys()];
  for (let i = 1; i < maps.length; i++) dates = dates.filter(d => maps[i].has(d));
  dates.sort();
  const cols = {};
  ids.forEach((id, i) => { cols[id] = dates.map(d => maps[i].get(d)); });
  return { dates, cols };
}

async function loadChanges(ctx, ids, days) {
  const out = {}; const meta = {};
  await Promise.all(ids.map(async (id) => {
    const a = ASSET_MAP[id]; if (!a) return;
    try {
      const h = await getHistory(ctx, id);
      const pts = windowSlice(h.points, days + 3);
      out[id] = changes(pts, isDiffKind(a));
      meta[id] = { source: h.source, n: pts.length, firstDate: pts[0] ? pts[0][0] : null, lastDate: pts.length ? pts[pts.length - 1][0] : null, stale: h.stale, error: h.error, coverageNote: h.coverageNote || null };
    } catch (e) { out[id] = []; meta[id] = { error: e.message, n: 0 }; }
  }));
  return { series: out, meta };
}

/* ───────────── Performance / volatility table ───────────── */
export async function performance(ctx, ids) {
  const quotes = await getQuotes(ctx, ids);
  const rows = await Promise.all(quotes.map(async (q) => {
    const a = ASSET_MAP[q.id];
    const row = { id: q.id, name: q.name, cls: q.cls, region: q.region, unit: q.unit, kind: q.kind, price: q.price, pct1d: q.pct1d, change: q.change, volume: q.volume, marketCap: q.marketCap, freshness: q.freshness, source: q.source, asOf: q.asOf, stale: q.stale, error: q.error, available: q.available, perf: {}, vol: {}, sparkline: [] };
    try {
      const h = await getHistory(ctx, q.id);
      const pts = h.points; const n = pts.length;
      if (!n) return row;
      const last = q.price ?? pts[n - 1][1];
      const diff = isDiffKind(a);
      // YTD
      const ytdStart = `${new Date().getFullYear()}-01-01`;
      const ytdBase = pts.filter(p => p[0] < ytdStart).slice(-1)[0];
      if (ytdBase) row.perf.YTD = diff ? last - ytdBase[1] : (last / ytdBase[1] - 1) * 100;
      for (const [w, days] of Object.entries(WINDOWS)) {
        const c = cutoffDate(days);
        const base = pts.filter(p => p[0] <= c).slice(-1)[0] || (pts[0][0] > c ? null : pts[0]);
        if (!base) { row.perf[w] = null; continue; }
        row.perf[w] = diff ? last - base[1] : (last / base[1] - 1) * 100;
      }
      // realised vol (annualised) over 30D and 1Y
      const ann = a.cls === 'crypto' ? Math.sqrt(365) : Math.sqrt(252);
      for (const w of ['30D', '1Y']) {
        const ch = changes(windowSlice(pts, WINDOWS[w] + 3), diff).map(x => x[1]);
        const s = std(ch);
        row.vol[w] = s == null ? null : diff ? s * ann * 100 /* bp-ish: pct-pt stdev annualised, ×100 → bp */ : s * ann * 100;
      }
      // 52-week range position & drawdown
      const yr = windowSlice(pts, 365).map(p => p[1]);
      if (yr.length) {
        const hi = Math.max(...yr), lo = Math.min(...yr);
        row.range52w = { high: hi, low: lo, pos: hi > lo ? (last - lo) / (hi - lo) : null };
        let peak = -Infinity, mdd = 0; for (const v of yr) { peak = Math.max(peak, v); if (!diff && peak > 0) mdd = Math.min(mdd, v / peak - 1); }
        row.maxDrawdown1Y = diff ? null : mdd * 100;
      }
      row.sparkline = windowSlice(pts, 30).map(p => round(p[1], 4));
      row.historyFrom = pts[0][0]; row.historyPoints = n;
      if (h.coverageNote) row.coverageNote = h.coverageNote;
    } catch (e) { row.historyError = e.message; }
    for (const k of Object.keys(row.perf)) row.perf[k] = round(row.perf[k], 3);
    for (const k of Object.keys(row.vol)) row.vol[k] = round(row.vol[k], 2);
    return row;
  }));
  return rows;
}

/* ───────────── Correlation matrix ───────────── */
export async function correlation(ctx, ids, window = '30D') {
  const days = WINDOWS[window] || 30;
  const { series, meta } = await loadChanges(ctx, ids, days);
  const valid = ids.filter(id => series[id] && series[id].length >= 5);
  // Align pairwise (not globally) so one short series (e.g. crypto 365d) doesn't shrink everyone's sample.
  const matrix = []; const samples = [];
  for (const a of valid) {
    const row = []; const srow = [];
    for (const b of valid) {
      if (a === b) { row.push(1); srow.push(series[a].length); continue; }
      const al = align({ a: series[a], b: series[b] });
      const r = pearson(al.cols.a, al.cols.b);
      row.push(r == null ? null : round(r, 3)); srow.push(al.dates.length);
    }
    matrix.push(row); samples.push(srow);
  }
  return { window, days, ids: valid, labels: valid.map(id => ASSET_MAP[id].name), matrix, samples, meta, excluded: ids.filter(id => !valid.includes(id)), method: 'Pearson correlation of daily log returns (yields/spreads: daily changes), pairwise-aligned on common dates' };
}

/* ───────────── Rolling correlation ───────────── */
export async function rolling(ctx, a, b, window = '1Y', lookback = 30) {
  const days = WINDOWS[window] || 365;
  const { series, meta } = await loadChanges(ctx, [a, b], days + lookback);
  const al = align({ a: series[a] || [], b: series[b] || [] });
  const out = [];
  for (let i = lookback; i <= al.dates.length; i++) {
    const r = pearson(al.cols.a.slice(i - lookback, i), al.cols.b.slice(i - lookback, i));
    out.push([al.dates[i - 1], r == null ? null : round(r, 3)]);
  }
  const c = cutoffDate(days);
  return { a, b, window, lookback, points: out.filter(p => p[0] >= c), meta, method: `${lookback}-observation rolling Pearson correlation of daily changes` };
}

/* ───────────── Relative performance (rebased to 100) ───────────── */
export async function relative(ctx, ids, window = '1Y') {
  const days = WINDOWS[window] || 365;
  const out = {}; const meta = {};
  await Promise.all(ids.map(async (id) => {
    const a = ASSET_MAP[id]; if (!a) return;
    try {
      const h = await getHistory(ctx, id);
      const pts = windowSlice(h.points, days);
      if (!pts.length) { out[id] = []; return; }
      const base = pts[0][1];
      out[id] = isDiffKind(a) ? pts.map(p => [p[0], round(p[1], 3)]) : pts.map(p => [p[0], round(p[1] / base * 100, 3)]);
      meta[id] = { name: a.name, rebased: !isDiffKind(a), unit: a.unit, source: h.source, n: pts.length, coverageNote: h.coverageNote || null };
    } catch (e) { out[id] = []; meta[id] = { error: e.message }; }
  }));
  return { window, series: out, meta };
}

/* ───────────── Rules-based regime indicator ───────────── */
export async function regime(ctx) {
  const ids = ['VIX', 'HYOAS', 'SPX', 'DXY', 'BTC', 'COPPER', 'GOLD', 'T10Y2Y', 'EEM', 'HYG', 'TLT'];
  const perf = await performance(ctx, ids);
  const P = Object.fromEntries(perf.map(r => [r.id, r]));
  const comps = [];
  const add = (id, label, score, detail) => comps.push({ id, label, score, detail, available: score != null });

  const vix = P.VIX;
  if (vix && vix.price != null) add('VIX', 'VIX level', vix.price < 15 ? 1 : vix.price < 20 ? 0.5 : vix.price < 30 ? -0.5 : -1, `VIX ${round(vix.price, 1)} (${vix.perf['30D'] != null ? (vix.perf['30D'] > 0 ? '+' : '') + round(vix.perf['30D'], 0) + '% 30D' : ''})`);
  else add('VIX', 'VIX level', null, 'unavailable');
  const hy = P.HYOAS;
  if (hy && hy.perf['30D'] != null) add('HYOAS', 'HY spread 30D change', hy.perf['30D'] < -0.15 ? 1 : hy.perf['30D'] < 0.15 ? 0 : hy.perf['30D'] < 0.5 ? -0.5 : -1, `HY OAS ${round(hy.price, 2)}% (${hy.perf['30D'] > 0 ? '+' : ''}${round(hy.perf['30D'] * 100, 0)} bp 30D)`);
  else add('HYOAS', 'HY spread 30D change', null, 'unavailable');
  const spx = P.SPX;
  if (spx && spx.perf['30D'] != null) add('SPX', 'S&P 500 30D momentum', spx.perf['30D'] > 2 ? 1 : spx.perf['30D'] > 0 ? 0.5 : spx.perf['30D'] > -3 ? -0.5 : -1, `SPX ${spx.perf['30D'] > 0 ? '+' : ''}${round(spx.perf['30D'], 1)}% 30D`);
  const dxy = P.DXY;
  if (dxy && dxy.perf['30D'] != null) add('DXY', 'USD 30D trend (strong USD = risk-off)', dxy.perf['30D'] < -1 ? 0.5 : dxy.perf['30D'] < 1 ? 0 : -0.5, `DXY ${dxy.perf['30D'] > 0 ? '+' : ''}${round(dxy.perf['30D'], 1)}% 30D`);
  const btc = P.BTC;
  if (btc && btc.perf['30D'] != null) add('BTC', 'Bitcoin 30D (speculative appetite)', btc.perf['30D'] > 5 ? 0.5 : btc.perf['30D'] > -5 ? 0 : -0.5, `BTC ${btc.perf['30D'] > 0 ? '+' : ''}${round(btc.perf['30D'], 1)}% 30D`);
  const cu = P.COPPER, au = P.GOLD;
  if (cu && au && cu.perf['30D'] != null && au.perf['30D'] != null) { const d = cu.perf['30D'] - au.perf['30D']; add('CUAU', 'Copper/Gold 30D (growth vs fear)', d > 3 ? 0.5 : d > -3 ? 0 : -0.5, `Copper ${round(cu.perf['30D'], 1)}% vs Gold ${round(au.perf['30D'], 1)}% 30D`); }
  const em = P.EEM;
  if (em && spx && em.perf['30D'] != null && spx.perf['30D'] != null) add('EM', 'EM vs US 30D', em.perf['30D'] - spx.perf['30D'] > 1 ? 0.5 : em.perf['30D'] - spx.perf['30D'] > -1 ? 0 : -0.5, `EEM ${round(em.perf['30D'], 1)}% vs SPX ${round(spx.perf['30D'], 1)}%`);
  const hyg = P.HYG, tlt = P.TLT;
  if (hyg && tlt && hyg.perf['30D'] != null && tlt.perf['30D'] != null) add('HYTLT', 'HY bonds vs Treasuries 30D', hyg.perf['30D'] - tlt.perf['30D'] > 1 ? 0.5 : hyg.perf['30D'] - tlt.perf['30D'] > -1 ? 0 : -0.5, `HYG ${round(hyg.perf['30D'], 1)}% vs TLT ${round(tlt.perf['30D'], 1)}%`);

  const avail = comps.filter(c => c.score != null);
  const maxAbs = avail.reduce((s, c) => s + (Math.abs(c.id === 'VIX' || c.id === 'HYOAS' || c.id === 'SPX' ? 1 : 0.5)), 0) || 1;
  const score = avail.reduce((s, c) => s + c.score, 0) / maxAbs; // −1 … +1
  const label = score > 0.3 ? 'RISK-ON' : score < -0.3 ? 'RISK-OFF' : 'NEUTRAL / MIXED';
  return { label, score: round(score, 2), components: comps, method: 'Rules-based composite of volatility, credit, momentum, USD, crypto and growth-vs-fear ratios. Heuristic classification, not a forecast.', asOf: new Date().toISOString() };
}

/* ───────────── Anomaly detection ───────────── */
export async function anomalies(ctx, ids) {
  const out = [];
  await Promise.all(ids.map(async (id) => {
    const a = ASSET_MAP[id]; if (!a) return;
    try {
      const h = await getHistory(ctx, id);
      const pts = windowSlice(h.points, 400); if (pts.length < 60) return;
      const diff = isDiffKind(a);
      const ch = changes(pts, diff);
      const vals = ch.map(x => x[1]);
      const base = vals.slice(0, -1); const s = std(base); const m = mean(base);
      if (!s) return;
      const last = vals[vals.length - 1];
      const z1 = (last - m) / s;
      const last5 = vals.slice(-5).reduce((x, y) => x + y, 0);
      const z5 = (last5 - 5 * m) / (s * Math.sqrt(5));
      // realised-vol regime: 10d vs 1y
      const v10 = std(vals.slice(-10)); const volRatio = v10 && s ? v10 / s : null;
      const sev = Math.max(Math.abs(z1), Math.abs(z5));
      if (sev >= 2 || (volRatio && volRatio >= 2)) {
        out.push({ id, name: a.name, cls: a.cls, date: ch[ch.length - 1][0], move1d: diff ? round(last * 100, 1) : round((Math.exp(last) - 1) * 100, 2), move5d: diff ? round(last5 * 100, 1) : round((Math.exp(last5) - 1) * 100, 2), unit: diff ? 'bp' : '%', z1: round(z1, 2), z5: round(z5, 2), volRatio: round(volRatio, 2), severity: sev >= 4 ? 'extreme' : sev >= 3 ? 'high' : 'notable', sample: base.length, source: h.source });
      }
    } catch (e) { /* skip */ }
  }));
  out.sort((a, b) => Math.max(Math.abs(b.z1), Math.abs(b.z5)) - Math.max(Math.abs(a.z1), Math.abs(a.z5)));
  return { items: out, method: 'z-score of latest 1-day and 5-day change vs the trailing ~1-year distribution of daily changes (≥2σ flagged); vol ratio = 10-day realised vol ÷ 1-year realised vol', asOf: new Date().toISOString() };
}

/* ───────────── Shock sensitivities (OLS betas) ───────────── */
export const SHOCK_DRIVERS = [
  { id: 'SPX', label: 'S&P 500', unit: '%', step: 1, range: [-30, 30] },
  { id: 'UST10Y', label: 'US 10Y yield', unit: 'bp', step: 5, range: [-200, 200] },
  { id: 'BTC', label: 'Bitcoin', unit: '%', step: 1, range: [-50, 50] },
  { id: 'GOLD', label: 'Gold', unit: '%', step: 1, range: [-30, 30] },
  { id: 'WTI', label: 'WTI crude', unit: '%', step: 1, range: [-50, 50] },
  { id: 'DXY', label: 'US Dollar Index', unit: '%', step: 0.5, range: [-10, 10] },
];

export async function betas(ctx, driverId, targetIds, window = '1Y') {
  const days = WINDOWS[window] || 365;
  const driver = ASSET_MAP[driverId];
  const { series, meta } = await loadChanges(ctx, [driverId, ...targetIds], days);
  const out = [];
  for (const t of targetIds) {
    if (t === driverId) continue;
    const ta = ASSET_MAP[t]; if (!ta) continue;
    const al = align({ x: series[driverId] || [], y: series[t] || [] });
    const fit = ols(al.cols.x, al.cols.y);
    // Units: driver in % (log-return×100) or bp (pct-pt change×100); target in % or bp
    const xScale = isDiffKind(driver) ? 100 : 100; const yScale = isDiffKind(ta) ? 100 : 100;
    out.push({ id: t, name: ta.name, cls: ta.cls, unit: isDiffKind(ta) ? 'bp' : '%', beta: fit ? round(fit.beta * yScale / xScale, 4) : null, r2: fit ? round(fit.r2, 3) : null, n: fit ? fit.n : al.dates.length, corr: fit ? round(Math.sign(fit.beta) * Math.sqrt(fit.r2), 3) : null, meta: meta[t] });
  }
  return { driver: driverId, driverUnit: isDiffKind(driver) ? 'bp' : '%', window, targets: out, method: 'OLS of daily target changes on daily driver changes over the window. β is the historical average co-movement per 1 unit driver move; R² indicates how much of the target variance it explained. Scenario estimate only — relationships break in crises.' };
}

/* ───────────── Historical crisis pattern library ───────────── */
// Each pattern lists observable signatures. The engine checks which are currently present
// using measured data and reports a *resemblance count*, never a probability of recurrence.
export const CRISIS_PATTERNS = [
  { id: 'BLACK_MONDAY_1987', name: 'Black Monday (Oct 1987)', summary: 'Equities fell ~20% in one session after a sharp rise in yields and the dollar; portfolio insurance amplified selling. Bonds rallied as a safe haven.', signatures: [
    { key: 'spx_1d', label: 'S&P 500 single-day drop ≥ 5%', test: (P) => P.SPX && P.SPX.pct1d != null && P.SPX.pct1d <= -5 },
    { key: 'vix_spike', label: 'VIX ≥ 40', test: (P) => P.VIX && P.VIX.price >= 40 },
    { key: 'yield_rise', label: 'US 10Y up ≥ 50 bp over 30D before the shock', test: (P) => P.UST10Y && P.UST10Y.perf['30D'] != null && P.UST10Y.perf['30D'] >= 0.5 },
    { key: 'usd_strength', label: 'USD stronger over 30D', test: (P) => P.DXY && P.DXY.perf['30D'] != null && P.DXY.perf['30D'] > 0 },
  ], sources: ['https://www.federalreservehistory.org/essays/stock-market-crash-of-1987'] },
  { id: 'DOTCOM_2000', name: 'Dot-com bubble (2000–02)', summary: 'Tech-concentrated equity valuations unwound over ~2.5 years; Nasdaq fell ~78%. Credit was secondary; Fed cut rates aggressively from 2001.', signatures: [
    { key: 'ndx_vs_spx', label: 'Nasdaq 100 underperforming S&P 500 by ≥ 5% over 30D', test: (P) => P.NDX && P.SPX && P.NDX.perf['30D'] != null && P.SPX.perf['30D'] != null && P.NDX.perf['30D'] - P.SPX.perf['30D'] <= -5 },
    { key: 'ndx_dd', label: 'Nasdaq 100 drawdown from 1Y high ≥ 20%', test: (P) => P.NDX && P.NDX.maxDrawdown1Y != null && P.NDX.maxDrawdown1Y <= -20 },
    { key: 'curve_inverted', label: '10Y–2Y curve inverted (was inverted in 2000)', test: (P) => P.T10Y2Y && P.T10Y2Y.price != null && P.T10Y2Y.price < 0 },
    { key: 'fed_cutting', label: 'Fed funds lower than 180D ago', test: (P) => P.FEDFUNDS && P.FEDFUNDS.perf['180D'] != null && P.FEDFUNDS.perf['180D'] < -0.2 },
  ], sources: ['https://www.federalreservehistory.org/essays/dot-com-bubble'] },
  { id: 'GFC_2008', name: 'Global Financial Crisis (2007–09)', summary: 'Subprime mortgage losses propagated through leveraged banks; credit spreads blew out, interbank funding froze, equities fell >50%, commodities collapsed after mid-2008, USD and Treasuries rallied.', signatures: [
    { key: 'hy_wide', label: 'HY OAS ≥ 6% or +150 bp over 30D', test: (P) => P.HYOAS && (P.HYOAS.price >= 6 || (P.HYOAS.perf['30D'] != null && P.HYOAS.perf['30D'] >= 1.5)) },
    { key: 'ig_wide', label: 'IG OAS +50 bp over 30D', test: (P) => P.IGOAS && P.IGOAS.perf['30D'] != null && P.IGOAS.perf['30D'] >= 0.5 },
    { key: 'vix_30', label: 'VIX ≥ 30', test: (P) => P.VIX && P.VIX.price >= 30 },
    { key: 'spx_dd', label: 'S&P 500 drawdown from 1Y high ≥ 15%', test: (P) => P.SPX && P.SPX.maxDrawdown1Y != null && P.SPX.maxDrawdown1Y <= -15 },
    { key: 'usd_flight', label: 'DXY up ≥ 3% over 30D (flight to USD)', test: (P) => P.DXY && P.DXY.perf['30D'] != null && P.DXY.perf['30D'] >= 3 },
    { key: 'oil_crash', label: 'WTI down ≥ 25% over 90D', test: (P) => P.WTI && P.WTI.perf['90D'] != null && P.WTI.perf['90D'] <= -25 },
    { key: 'curve_steepening', label: 'Curve bull-steepening (10Y–2Y up ≥ 40 bp over 90D)', test: (P) => P.T10Y2Y && P.T10Y2Y.perf['90D'] != null && P.T10Y2Y.perf['90D'] >= 0.4 },
  ], sources: ['https://www.federalreservehistory.org/essays/great-recession-of-200709', 'https://www.fcic.gov/report'] },
];

export async function patterns(ctx) {
  const ids = ['SPX', 'NDX', 'VIX', 'UST10Y', 'DXY', 'T10Y2Y', 'FEDFUNDS', 'HYOAS', 'IGOAS', 'WTI'];
  const perf = await performance(ctx, ids);
  const P = Object.fromEntries(perf.map(r => [r.id, r]));
  return {
    items: CRISIS_PATTERNS.map(p => {
      const checks = p.signatures.map(s => { let hit = false; try { hit = !!s.test(P); } catch (e) {} return { key: s.key, label: s.label, hit }; });
      const hits = checks.filter(c => c.hit).length;
      return { id: p.id, name: p.name, summary: p.summary, checks, hits, total: checks.length, resemblance: hits / checks.length, sources: p.sources };
    }),
    method: 'Each historical episode is reduced to observable market signatures; the engine reports how many are present today. Resemblance is descriptive, not a probability of recurrence.',
    inputs: Object.fromEntries(perf.map(r => [r.id, { price: r.price, pct1d: r.pct1d, perf: r.perf, dd: r.maxDrawdown1Y, asOf: r.asOf }])),
  };
}
