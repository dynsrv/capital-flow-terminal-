// Risk, inflection-point and correlation-leader analytics.
// All outputs are measured statistics of historical data. Nothing here forecasts; labels say so.
import { ASSETS, ASSET_MAP } from './universe.js';
import { getHistory } from './data.js';
import { isDiffKind, changes, windowSlice, std, mean, pearson, align, cutoffDate } from './analytics.js';
import { WINDOWS, round } from './lib/util.js';

const RISK_UNIVERSE = ASSETS.filter(a => a.cls !== 'macro' && !a.stablecoin && a.freshness !== 'monthly').map(a => a.id).concat(['VIX']);

const annFactor = (a) => (a.cls === 'crypto' ? Math.sqrt(365) : Math.sqrt(252));

/** simple moving average aligned to points: returns [[date, ma|null]] */
function sma(points, n) {
  const out = []; let s = 0;
  for (let i = 0; i < points.length; i++) {
    s += points[i][1]; if (i >= n) s -= points[i - n][1];
    out.push([points[i][0], i >= n - 1 ? s / n : null]);
  }
  return out;
}

/** Wilder RSI(14) on the last value */
function rsi(points, n = 14) {
  if (points.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = points[i][1] - points[i - 1][1]; if (d > 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let i = n + 1; i < points.length; i++) { const d = points[i][1] - points[i - 1][1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function percentileRank(arr, v) { if (!arr.length || v == null) return null; let c = 0; for (const x of arr) if (x <= v) c++; return c / arr.length; }

/* ───────────── Per-asset risk table ───────────── */
export async function riskTable(ctx, ids = RISK_UNIVERSE) {
  const rows = await Promise.all(ids.map(async (id) => {
    const a = ASSET_MAP[id]; if (!a) return null;
    try {
      const h = await getHistory(ctx, id);
      const pts = h.points; if (pts.length < 60) return { id, name: a.name, cls: a.cls, unavailable: true };
      const diff = isDiffKind(a); const ann = annFactor(a);
      const ch = changes(pts, diff).map(x => x[1]);
      const last250 = ch.slice(-252);
      const vol30 = std(ch.slice(-21)), vol1y = std(last250);
      // rolling 21-obs vol history over up to 5 years → percentile of today's vol
      const hist = []; const look = ch.slice(-252 * 5);
      for (let i = 21; i <= look.length; i += 5) hist.push(std(look.slice(i - 21, i)));
      const volPct = percentileRank(hist, vol30);
      // historical 1-day VaR / CVaR (95%) over last year; reported as loss in % (or bp)
      const sorted = [...last250].sort((x, y) => x - y);
      const k = Math.max(1, Math.floor(sorted.length * 0.05));
      const var95 = sorted[k - 1]; const cvar95 = mean(sorted.slice(0, k));
      const toUnit = (r) => (r == null ? null : diff ? r * 100 : (Math.exp(r) - 1) * 100);
      // drawdown from 1Y high and max drawdown 1Y (prices only)
      const yr = windowSlice(pts, 365).map(p => p[1]);
      const last = pts[pts.length - 1][1];
      const hi = Math.max(...yr), lo = Math.min(...yr);
      let peak = -Infinity, mdd = 0; for (const v of yr) { peak = Math.max(peak, v); if (!diff && peak > 0) mdd = Math.min(mdd, v / peak - 1); }
      const ma200 = pts.length >= 200 ? mean(pts.slice(-200).map(p => p[1])) : null;
      return {
        id, name: a.name, cls: a.cls, unit: diff ? 'bp' : '%', last,
        vol30: round(vol30 * ann * (diff ? 100 : 100), 2), vol1y: round(vol1y * ann * 100, 2),
        volRatio: vol1y ? round(vol30 / vol1y, 2) : null, volPct: round(volPct, 3),
        var95: round(toUnit(var95), 2), cvar95: round(toUnit(cvar95), 2),
        ddFromHigh: diff ? null : round((last / hi - 1) * 100, 2), maxDD1y: diff ? null : round(mdd * 100, 2),
        rangePos: hi > lo ? round((last - lo) / (hi - lo), 3) : null,
        vs200: ma200 && !diff ? round((last / ma200 - 1) * 100, 2) : ma200 && diff ? round((last - ma200) * 100, 1) : null,
        source: h.source, asOf: pts[pts.length - 1][0], stale: h.stale, n: ch.length,
      };
    } catch (e) { return { id, name: a.name, cls: a.cls, unavailable: true, error: e.message }; }
  }));
  return {
    rows: rows.filter(Boolean),
    method: 'Realised vol = annualised stdev of daily log returns (bp changes for yields/spreads). Vol percentile = today\'s 21-day vol ranked against rolling 21-day vols over up to 5 years. VaR/CVaR 95% = historical 1-day loss quantile / mean of worst 5% over the last 252 observations. Drawdowns from the trailing 1-year high.',
  };
}

/* ───────────── Composite market stress index ───────────── */
// Each component is converted to a rolling percentile rank (3-year lookback) so they share a 0–100 scale,
// then averaged. Higher = more stress. Components: VIX level, HY OAS, IG OAS, USD (broad) 3M momentum,
// S&P 500 distance below its 200-day average (inverted), 10Y–2Y curve inversion (inverted).
export async function stressIndex(ctx, years = 2) {
  const want = { VIX: 1, HYOAS: 1, IGOAS: 1, BROADUSD: 1, SPX: -1, T10Y2Y: -1 };
  const hs = {};
  await Promise.all(Object.keys(want).map(async (id) => { try { hs[id] = (await getHistory(ctx, id)).points; } catch (e) { hs[id] = []; } }));
  const transform = {
    VIX: (p) => p, HYOAS: (p) => p, IGOAS: (p) => p, T10Y2Y: (p) => p,
    BROADUSD: (p) => p.map((x, i) => [x[0], i >= 63 ? (x[1] / p[i - 63][1] - 1) * 100 : null]).filter(x => x[1] != null),
    SPX: (p) => { const m = sma(p, 200); return p.map((x, i) => [x[0], m[i][1] ? (x[1] / m[i][1] - 1) * 100 : null]).filter(x => x[1] != null); },
  };
  const LB = 756; // ~3y of trading days
  const comps = {};
  for (const [id, sign] of Object.entries(want)) {
    const s = transform[id](hs[id] || []);
    const out = new Map();
    for (let i = Math.max(60, s.length - 252 * years - 5); i < s.length; i++) {
      const lb = s.slice(Math.max(0, i - LB), i + 1).map(x => x[1]);
      let r = percentileRank(lb, s[i][1]); if (r == null) continue;
      out.set(s[i][0], sign > 0 ? r : 1 - r);
    }
    comps[id] = out;
  }
  // forward-fill each component onto a common calendar of SPX/VIX trading dates
  const dates = [...new Set([...(comps.VIX || new Map()).keys(), ...(comps.SPX || new Map()).keys()])].sort();
  const lastSeen = {}; const series = [];
  for (const d of dates) {
    const vals = [];
    for (const id of Object.keys(want)) { const v = comps[id].get(d); if (v != null) lastSeen[id] = v; if (lastSeen[id] != null) vals.push(lastSeen[id]); }
    if (vals.length >= 4) series.push([d, round(mean(vals) * 100, 1)]);
  }
  const latest = series.length ? series[series.length - 1][1] : null;
  const components = Object.keys(want).map(id => ({ id, name: ASSET_MAP[id].name, percentile: lastSeen[id] != null ? round(lastSeen[id] * 100, 0) : null, direction: want[id] > 0 ? 'higher = stress' : id === 'SPX' ? 'further below 200-day avg = stress' : 'more inverted = stress' }));
  return {
    series: windowSlice(series, 365 * years), latest,
    level: latest == null ? null : latest >= 75 ? 'High' : latest >= 55 ? 'Elevated' : latest >= 35 ? 'Normal' : 'Low',
    components,
    method: 'Average of six rolling 3-year percentile ranks (VIX, HY OAS, IG OAS, broad USD 3-month change, S&P 500 below its 200-day average, 10Y–2Y inversion). 0 = calmest in 3 years, 100 = most stressed. Descriptive composite, not a forecast.',
  };
}

/* ───────────── Inflection points ───────────── */
// Detects recent, rule-defined trend events per instrument. Each signal carries its rule, date and value.
export async function inflections(ctx, ids = RISK_UNIVERSE) {
  const signals = [];
  await Promise.all(ids.map(async (id) => {
    const a = ASSET_MAP[id]; if (!a) return;
    try {
      const pts = (await getHistory(ctx, id)).points; if (pts.length < 220) return;
      const ma50 = sma(pts, 50), ma200 = sma(pts, 200);
      const n = pts.length; const last = pts[n - 1];
      const push = (type, dir, date, detail, weight) => signals.push({ id, name: a.name, cls: a.cls, type, dir, date, detail, weight });
      // 50/200 crosses within the last 30 observations
      for (let i = Math.max(201, n - 30); i < n; i++) {
        const p = ma50[i - 1][1] - ma200[i - 1][1], c = ma50[i][1] - ma200[i][1];
        if (p <= 0 && c > 0) push('Golden cross', 'up', pts[i][0], '50-day average crossed above 200-day', 3);
        if (p >= 0 && c < 0) push('Death cross', 'down', pts[i][0], '50-day average crossed below 200-day', 3);
      }
      // price crossing its 200-day average within the last 10 observations
      for (let i = Math.max(201, n - 10); i < n; i++) {
        const p = pts[i - 1][1] - ma200[i - 1][1], c = pts[i][1] - ma200[i][1];
        if (p <= 0 && c > 0) push('Reclaimed 200-day', 'up', pts[i][0], 'Closed back above its 200-day average', 2);
        if (p >= 0 && c < 0) push('Broke 200-day', 'down', pts[i][0], 'Closed below its 200-day average', 2);
      }
      // new 52-week extreme within last 5 observations
      const yr = windowSlice(pts, 365);
      const prior = yr.slice(0, -5).map(p => p[1]); const recent = yr.slice(-5);
      if (prior.length > 100) {
        const hi = Math.max(...prior), lo = Math.min(...prior);
        const rh = recent.find(p => p[1] > hi), rl = recent.find(p => p[1] < lo);
        if (rh) push('52-week high', 'up', rh[0], `New 1-year high at ${round(rh[1], 4)}`, 2);
        if (rl) push('52-week low', 'down', rl[0], `New 1-year low at ${round(rl[1], 4)}`, 2);
      }
      // momentum turn: 20-day change flipped sign against the 60-day trend in the last 5 obs
      const ret = (i, k) => (i - k >= 0 ? (isDiffKind(a) ? pts[i][1] - pts[i - k][1] : pts[i][1] / pts[i - k][1] - 1) : null);
      const r20 = ret(n - 1, 20), r20p = ret(n - 6, 20), r60 = ret(n - 1, 60);
      if (r20 != null && r20p != null && r60 != null && Math.sign(r20) !== Math.sign(r20p)) {
        if (r20 > 0 && r60 < 0) push('Momentum turn up', 'up', last[0], '20-day change turned positive while the 60-day trend is still negative', 1);
        if (r20 < 0 && r60 > 0) push('Momentum turn down', 'down', last[0], '20-day change turned negative while the 60-day trend is still positive', 1);
      }
      // RSI extremes
      const r = rsi(pts.slice(-120));
      if (r != null && r >= 70) push('Overbought', 'down', last[0], `RSI(14) at ${round(r, 0)}`, 1);
      if (r != null && r <= 30) push('Oversold', 'up', last[0], `RSI(14) at ${round(r, 0)}`, 1);
    } catch (e) { /* skip */ }
  }));
  signals.sort((x, y) => (y.date.localeCompare(x.date)) || (y.weight - x.weight));
  return {
    signals,
    method: 'Rule-based trend events on daily closes: 50/200-day average crosses (last 30 obs), price crossing the 200-day average (last 10), new 52-week highs/lows (last 5), 20-day momentum flipping against the 60-day trend, and RSI(14) beyond 70/30. These mark where a trend changed; they do not predict what happens next.',
  };
}

/** Price with 50/200-day averages and event markers for one instrument */
export async function trend(ctx, id, window = '1Y') {
  const a = ASSET_MAP[id]; if (!a) throw new Error(`Unknown asset ${id}`);
  const pts = (await getHistory(ctx, id)).points;
  const ma50 = sma(pts, 50), ma200 = sma(pts, 200);
  const c = cutoffDate(WINDOWS[window] || 365);
  const idx = pts.findIndex(p => p[0] >= c);
  const from = idx < 0 ? 0 : idx;
  const events = [];
  for (let i = Math.max(from, 201); i < pts.length; i++) {
    const p = ma50[i - 1][1] - ma200[i - 1][1], q = ma50[i][1] - ma200[i][1];
    if (p <= 0 && q > 0) events.push({ date: pts[i][0], value: pts[i][1], type: 'Golden cross', dir: 'up' });
    if (p >= 0 && q < 0) events.push({ date: pts[i][0], value: pts[i][1], type: 'Death cross', dir: 'down' });
  }
  return {
    id, name: a.name, unit: a.unit, window,
    price: pts.slice(from).map(p => [p[0], round(p[1], 4)]),
    ma50: ma50.slice(from).map(p => [p[0], p[1] == null ? null : round(p[1], 4)]),
    ma200: ma200.slice(from).map(p => [p[0], p[1] == null ? null : round(p[1], 4)]),
    events,
  };
}

/* ───────────── Correlation leaders ───────────── */
export async function leaders(ctx, anchor = 'SPX', ids = RISK_UNIVERSE) {
  const A = ASSET_MAP[anchor]; if (!A) throw new Error(`Unknown asset ${anchor}`);
  const load = async (id, days) => { const a = ASSET_MAP[id]; const h = await getHistory(ctx, id); return changes(windowSlice(h.points, days + 3), isDiffKind(a)); };
  const [a30, a1y] = await Promise.all([load(anchor, 30), load(anchor, 365)]);
  const rows = await Promise.all(ids.filter(i => i !== anchor && ASSET_MAP[i]).map(async (id) => {
    try {
      const [b30, b1y] = await Promise.all([load(id, 30), load(id, 365)]);
      const s = align({ a: a30, b: b30 }), l = align({ a: a1y, b: b1y });
      return { id, name: ASSET_MAP[id].name, cls: ASSET_MAP[id].cls, r30: round(pearson(s.cols.a, s.cols.b), 3), r1y: round(pearson(l.cols.a, l.cols.b), 3), n30: s.dates.length, n1y: l.dates.length };
    } catch (e) { return null; }
  }));
  const ok = rows.filter(r => r && r.r30 != null);
  ok.sort((x, y) => y.r30 - x.r30);
  return { anchor, anchorName: A.name, rows: ok, method: 'Pearson correlation of daily changes with the anchor over the last 30 days and the last year. A large gap between the two marks a relationship that is shifting.' };
}
