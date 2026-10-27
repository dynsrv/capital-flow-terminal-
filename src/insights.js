// Plain-language readings for anomalies, trend signals and risk.
// Every sentence is generated from measured numbers with fixed rules. No forecasts, no invented causes:
// the text states what happened, how unusual it is, whether related markets confirmed it, and what to watch.
import { ASSET_MAP } from './universe.js';
import { getHistory } from './data.js';
import { isDiffKind, changes, windowSlice, correlation, performance } from './analytics.js';
import { leaders, riskTable, stressIndex } from './risk.js';
import { round } from './lib/util.js';

const DISCLAIMER = 'Rules-based reading of measured data. It describes, it does not forecast.';

const ord = (n) => { const v = Math.round(n); const t = v % 100; return v + (t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th')); };
const mv = (v, unit) => (v == null ? '—' : `${v > 0 ? '+' : ''}${unit === 'bp' ? Math.round(v) + ' bp' : v.toFixed(2) + '%'}`);
const isYield = (a) => a && (a.kind === 'yield');
const isSpread = (a) => a && (a.kind === 'spread' && a.cls === 'credit');
const dirWord = (a, v) => {
  if (isYield(a)) return v > 0 ? 'yields rose' : 'yields fell';
  if (isSpread(a)) return v > 0 ? 'spreads widened' : 'spreads tightened';
  return v > 0 ? 'rose' : 'fell';
};
const freqPhrase = (share) => {
  if (share == null) return null;
  if (share === 0) return 'No daily move this large in the past year.';
  const perYear = Math.round(share * 252);
  if (perYear <= 1) return 'A move this large happened about once in the past year.';
  return `Moves this large happened about ${perYear} times in the past year (${(share * 100).toFixed(1)}% of sessions).`;
};

/** change of an instrument on a given date (vs previous observation), in % or bp */
async function changeOn(ctx, id, date) {
  const a = ASSET_MAP[id]; const pts = (await getHistory(ctx, id)).points;
  const i = pts.findIndex(p => p[0] === date);
  if (i < 1) return null; // no print that day (e.g. holiday or slower source): do not substitute another day
  const prev = pts[i - 1][1], cur = pts[i][1];
  return isDiffKind(a) ? (cur - prev) * 100 : (cur / prev - 1) * 100;
}

function watchFor(a, v) {
  const w = [];
  if (a.id === 'VIX') w.push(v > 0 ? 'Whether equities keep falling and credit spreads widen; a VIX spike that fades within days is common.' : 'Whether calm holds; very low volatility can make markets more fragile to surprises.');
  else if (isYield(a)) w.push(v < 0 ? 'Whether the 2-year falls as much as the 10-year (rate-cut pricing) or the long end leads (growth or safe-haven demand).' : 'Whether the rise comes from inflation expectations (breakevens) or real yields; real-yield rises weigh more on equities and gold.');
  else if (isSpread(a)) w.push(v > 0 ? 'Whether equities and high-yield bond prices confirm the widening; credit often leads equities at turning points.' : 'Whether tighter spreads hold as new issuance comes to market.');
  else if (a.cls === 'equity') w.push(v < 0 ? 'Breadth across regions, the VIX reaction and whether credit spreads widen alongside.' : 'Whether the rally broadens beyond a few markets and holds above key averages.');
  else if (a.cls === 'commodity' && /WTI|BRENT|NATGAS/.test(a.id)) w.push('Inventory reports and the futures curve; energy moves feed into inflation breakevens.');
  else if (a.cls === 'commodity') w.push('Whether the move is matched by the US dollar (an inverse driver) and by related commodities.');
  else if (a.cls === 'fx') w.push('Interest-rate differentials and the risk of central-bank intervention.');
  else if (a.cls === 'crypto') w.push('Stablecoin supply and Bitcoin dominance as gauges of crypto risk appetite.');
  else if (a.cls === 'credit') w.push('Fund outflows and equity confirmation.');
  w.push('Follow-through over the next one to three sessions. A quick reversal would mark it as a one-off.');
  return w;
}

/* ───────────── Anomalies ───────────── */
export async function annotateAnomalies(ctx, res) {
  if (!res.items.length) return res;
  const perf = await performance(ctx, res.items.map(x => x.id));
  const P = Object.fromEntries(perf.map(r => [r.id, r]));
  await Promise.all(res.items.map(async (it) => {
    const a = ASSET_MAP[it.id];
    try {
      const pts = windowSlice((await getHistory(ctx, it.id)).points, 400);
      const ch = changes(pts, isDiffKind(a)); const vals = ch.map(x => x[1]);
      const last = Math.abs(vals[vals.length - 1]);
      let since = null; for (let i = vals.length - 2; i >= 0; i--) { if (Math.abs(vals[i]) >= last) { since = ch[i][0]; break; } }
      const yr = vals.slice(-253, -1); const share = yr.length ? yr.filter(x => Math.abs(x) >= last).length / yr.length : null;
      const p = P[it.id] || { perf: {}, vol: {} };
      const t30 = p.perf['30D'];
      const pos = p.range52w && p.range52w.pos != null ? Math.round(p.range52w.pos * 100) : null;

      const fiveDay = Math.abs(it.z5) > Math.abs(it.z1);
      const sinceIdx = since ? ch.findIndex(x => x[0] === since) : -1; const gap = sinceIdx >= 0 ? ch.length - 1 - sinceIdx : Infinity;
      const sinceTxt = gap === Infinity ? ' Largest daily move in more than a year.' : gap >= 20 ? ` Largest daily move since ${since}.` : '';
      const volOnly = Math.max(Math.abs(it.z1), Math.abs(it.z5)) < 2 && it.volRatio >= 2;
      const headline = volOnly
        ? `${a.name}: volatility surge. Ten-day volatility is ${it.volRatio.toFixed(1)}× its one-year norm; the latest session ${dirWord(a, it.move1d)} ${mv(it.move1d, it.unit).replace(/^[+-]/, '')} on ${it.date}.`
        : fiveDay
        ? `${a.name}: ${dirWord(a, it.move5d)} ${mv(it.move5d, it.unit).replace(/^[+-]/, '')} over five sessions to ${it.date}, ${Math.abs(it.z5).toFixed(1)}σ from normal for a five-day move.`
        : `${a.name}: ${dirWord(a, it.move1d)} ${mv(it.move1d, it.unit).replace(/^[+-]/, '')} on ${it.date}, ${Math.abs(it.z1).toFixed(1)}σ from normal.${sinceTxt}`;
      const points = [];
      const fp = fiveDay ? null : freqPhrase(share); if (fp) points.push(fp);
      if (volOnly) points.push('No single day crossed 2σ; it was flagged because day-to-day swings have become much larger than usual, which often precedes or accompanies a trend break.');
      if (t30 != null) { const same = Math.sign(t30) === Math.sign(it.move1d); points.push(`${same ? 'It extends' : 'It runs against'} the 30-day trend (${mv(isDiffKind(a) ? t30 * 100 : t30, it.unit)}).`); }
      if (fiveDay) points.push(`The latest single session was ${mv(it.move1d, it.unit)} (${it.z1.toFixed(1)}σ): no one day stands out, the signal is the persistence of the move.`);
      else if (Math.abs(it.z5) >= 2) points.push(`Over five days the change is ${mv(it.move5d, it.unit)} (${it.z5.toFixed(1)}σ), so this is part of a sustained run rather than a single day.`);
      else points.push(`The five-day change is ${mv(it.move5d, it.unit)} (${it.z5.toFixed(1)}σ), so the move is concentrated in the latest session.`);
      if (it.volRatio != null && !volOnly) points.push(it.volRatio >= 1.5 ? `Ten-day volatility is ${it.volRatio.toFixed(1)}× its one-year norm: the market is in a turbulent phase, and large moves tend to cluster.` : it.volRatio >= 1.15 ? `Ten-day volatility is somewhat above its one-year norm (${it.volRatio.toFixed(1)}×).` : it.volRatio <= .8 ? `Ten-day volatility is only ${it.volRatio.toFixed(1)}× its norm, so the move came out of a quiet period.` : `Ten-day volatility is close to its one-year norm (${it.volRatio.toFixed(1)}×), so the move stands out against a normal backdrop.`);
      if (pos != null && !isDiffKind(a)) points.push(pos >= 85 ? `Price is near the top of its one-year range (${ord(pos)} percentile).` : pos <= 15 ? `Price is near the bottom of its one-year range (${ord(pos)} percentile).` : `Price sits at the ${ord(pos)} percentile of its one-year range.`);

      // cross-asset confirmation using one-year correlations
      let cross = null;
      try {
        const L = await leaders(ctx, it.id);
        const peers = L.rows.filter(r => r.r1y != null && Math.abs(r.r1y) >= 0.45).sort((x, y) => Math.abs(y.r1y) - Math.abs(x.r1y)).slice(0, 4);
        if (peers.length) {
          const ref = fiveDay ? it.move5d : it.move1d; const checks = await Promise.all(peers.map(async (r) => { const c = fiveDay ? null : await changeOn(ctx, r.id, it.date); const expect = Math.sign(r.r1y) * Math.sign(ref); return { id: r.id, r: r.r1y, move: c == null ? null : round(c, 2), unit: isDiffKind(ASSET_MAP[r.id]) ? 'bp' : '%', confirmed: c == null ? null : Math.sign(c) === expect }; }));
          const known = checks.filter(c => c.confirmed != null); const n = known.filter(c => c.confirmed).length;
          cross = { peers: checks, confirmed: n, total: known.length };
          points.push(known.length ? `${n} of ${known.length} closely related markets moved the way their one-year correlation implies that day (${known.map(c => `${c.id} ${mv(c.move, c.unit)}`).join(', ')}). ${n === known.length ? 'The move was broad-based.' : n === 0 ? 'Related markets did not echo it, which points to an instrument-specific driver.' : 'Confirmation was partial.'}` : fiveDay ? null : `Closely related markets (${checks.map(c => c.id).join(', ')}) have no print for ${it.date} yet, so confirmation cannot be checked.`);
        }
      } catch (e) { /* no peers */ }

      it.analysis = { headline, points: points.filter(Boolean), watch: watchFor(a, it.move1d), cross, note: DISCLAIMER };
    } catch (e) { it.analysis = { headline: `${a.name}: analysis unavailable (${e.message}).`, points: [], watch: [] }; }
  }));
  return res;
}

/* ───────────── Trend signals ───────────── */
const MEANING = {
  'Golden cross': 'The 50-day average crossed above the 200-day: medium-term momentum has turned up. It confirms a move that is usually already under way, so it lags.',
  'Death cross': 'The 50-day average crossed below the 200-day: medium-term momentum has turned down. Like all average crosses it lags price.',
  'Reclaimed 200-day': 'Price closed back above its 200-day average, an early sign a downtrend may be ending. Failed reclaims are common, so holding above for several sessions matters.',
  'Broke 200-day': 'Price closed below its 200-day average, a common line for long-term trend followers. Breaks often attract more selling unless quickly reversed.',
  '52-week high': 'Trading at the top of its one-year range. Strong momentum, but positioning is often crowded at these levels.',
  '52-week low': 'Trading at the bottom of its one-year range. Momentum is weak; the question is whether selling accelerates or stabilises.',
  'Momentum turn up': 'The 20-day change turned positive while the 60-day trend is still negative: a possible early turn, not yet a trend change.',
  'Momentum turn down': 'The 20-day change turned negative while the 60-day trend is still positive: the uptrend is losing pace.',
  Overbought: 'RSI above 70 means the recent rise has been unusually one-sided. In strong trends this more often leads to a pause than a reversal.',
  Oversold: 'RSI below 30 means the recent fall has been unusually one-sided. Bounces are common, but oversold markets can stay oversold in sell-offs.',
};
const SIGNAL_WATCH = {
  'Golden cross': 'Whether price stays above the 200-day; crosses in sideways markets often reverse.',
  'Death cross': 'Whether price stabilises above its one-year low; crosses late in a decline can mark exhaustion.',
  'Reclaimed 200-day': 'A second and third close above the 200-day to confirm.',
  'Broke 200-day': 'A quick recovery above the line would make this a false break.',
  '52-week high': 'Volume and breadth on further highs; fading momentum (RSI divergence) would be a warning.',
  '52-week low': 'Whether related markets are also at lows, which would point to a broad move rather than one market.',
  'Momentum turn up': 'Whether the 60-day change also turns positive.',
  'Momentum turn down': 'Whether the 60-day change also turns negative.',
  Overbought: 'A drop back below 70 often marks the start of consolidation.',
  Oversold: 'A move back above 30 often marks the first stabilisation.',
};
export async function annotateSignals(ctx, res) {
  if (!res.signals.length) return res;
  let rt = null; try { rt = await riskTable(ctx, [...new Set(res.signals.map(s => s.id))]); } catch (e) {}
  const R = rt ? Object.fromEntries(rt.rows.map(r => [r.id, r])) : {};
  for (const s of res.signals) {
    const a = ASSET_MAP[s.id]; const r = R[s.id] || {};
    const ctxBits = [];
    if (r.vs200 != null) ctxBits.push(isDiffKind(a) ? `${Math.abs(Math.round(r.vs200))} bp ${r.vs200 >= 0 ? 'above' : 'below'} its 200-day average` : `${Math.abs(r.vs200).toFixed(1)}% ${r.vs200 >= 0 ? 'above' : 'below'} its 200-day average`);
    if (r.ddFromHigh != null) ctxBits.push(r.ddFromHigh > -1 ? 'at its one-year high' : `${Math.abs(r.ddFromHigh).toFixed(1)}% below its one-year high`);
    if (r.volPct != null) ctxBits.push(`volatility at the ${ord(r.volPct * 100)} percentile of five years`);
    const yNote = isYield(a) ? ' For a yield, "up" means bond prices are falling.' : isSpread(a) ? ' For a credit spread, "up" means wider spreads and weaker credit.' : '';
    s.analysis = { meaning: (MEANING[s.type] || '') + yNote, context: ctxBits.length ? `${a.name} is ${ctxBits.join(', ')}.` : null, watch: SIGNAL_WATCH[s.type] || null, note: DISCLAIMER };
  }
  return res;
}

/* ───────────── Risk readings ───────────── */
export function rowReading(r) {
  if (r.unavailable) return null;
  const b = [];
  if (r.volPct != null) b.push(r.volPct >= .9 ? 'Volatility extreme' : r.volPct >= .75 ? 'Volatility high' : r.volPct <= .2 ? 'Volatility unusually low' : null);
  if (r.ddFromHigh != null && r.cls !== 'macro') b.push(r.ddFromHigh <= -20 ? 'Bear-market drawdown' : r.ddFromHigh <= -10 ? 'In correction' : r.ddFromHigh >= -2 ? 'Near one-year high' : null);
  if (r.vs200 != null && r.unit !== 'bp') b.push(r.vs200 < 0 ? 'Below 200-day' : null);
  if (r.volRatio != null) b.push(r.volRatio >= 1.4 ? 'Volatility rising fast' : null);
  if (r.var95 != null && r.cvar95 != null && r.unit !== 'bp' && r.cvar95 / r.var95 >= 1.45) b.push('Heavy left tail');
  const parts = b.filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No risk flags';
}

export async function riskHighlights(ctx) {
  const [tbl, st] = await Promise.all([riskTable(ctx), stressIndex(ctx).catch(() => null)]);
  const rows = tbl.rows.filter(r => !r.unavailable);
  const name = (id) => (ASSET_MAP[id] ? ASSET_MAP[id].name : id);
  const items = [];

  if (st && st.latest != null) {
    const top = [...st.components].filter(c => c.percentile != null).sort((a, b) => b.percentile - a.percentile).slice(0, 2);
    items.push({ severity: st.latest >= 75 ? 'high' : st.latest >= 55 ? 'elevated' : 'info', icon: 'flame', title: `Market stress ${Math.round(st.latest)}/100 (${st.level})`, text: `${st.level === 'Low' || st.level === 'Normal' ? 'Conditions are within their usual three-year range.' : 'Conditions are more stressed than usual for the past three years.'} The biggest contributors are ${top.map(c => `${c.name} (${ord(c.percentile)} percentile)`).join(' and ')}.`, ids: top.map(c => c.id) });
  }

  // diversification: stock–bond correlation
  try {
    const [c30, c1y] = await Promise.all([correlation(ctx, ['SPX', 'TLT'], '30D'), correlation(ctx, ['SPX', 'TLT'], '1Y')]);
    const r30 = c30.matrix[0] && c30.matrix[0][1], r1y = c1y.matrix[0] && c1y.matrix[0][1];
    if (r30 != null) items.push({ severity: r30 > 0.2 ? 'elevated' : 'info', icon: 'swap', title: r30 > 0.2 ? 'Bonds are not hedging stocks' : r30 < -0.2 ? 'Bonds are hedging stocks' : 'Stock–bond link is weak', text: `The 30-day correlation between the S&P 500 and long Treasuries (TLT) is ${r30.toFixed(2)}${r1y != null ? `, against ${r1y.toFixed(2)} over the past year` : ''}. ${r30 > 0.2 ? 'When both fall together, a classic 60/40 portfolio loses its cushion; this pattern dominated in 2022.' : r30 < -0.2 ? 'Bonds have tended to rise when stocks fall, which cushions balanced portfolios.' : 'Neither a reliable hedge nor a shared driver at the moment.'}`, ids: ['SPX', 'TLT'] });
  } catch (e) {}

  const hot = rows.filter(r => r.volPct != null && r.volPct >= .85).sort((a, b) => b.volPct - a.volPct);
  if (hot.length) items.push({ severity: hot.length >= 5 ? 'high' : 'elevated', icon: 'pulse', title: `${hot.length} market${hot.length > 1 ? 's' : ''} in a high-volatility regime`, text: `${hot.slice(0, 5).map(r => `${name(r.id)} (${ord(r.volPct * 100)} percentile)`).join(', ')}${hot.length > 5 ? ' and others' : ''}: 30-day volatility is in the top 15% of the past five years. Volatility tends to cluster, so further large moves are more likely than usual while this lasts.`, ids: hot.slice(0, 6).map(r => r.id) });

  const bear = rows.filter(r => r.cls !== 'macro' && r.ddFromHigh != null && r.ddFromHigh <= -20).sort((a, b) => a.ddFromHigh - b.ddFromHigh);
  if (bear.length) items.push({ severity: 'high', icon: 'down', title: `${bear.length} market${bear.length > 1 ? 's' : ''} down 20% or more from the one-year high`, text: `${bear.slice(0, 6).map(r => `${name(r.id)} ${r.ddFromHigh.toFixed(0)}%`).join(', ')}. A 20% fall is the conventional bear-market threshold; recoveries from here historically take months rather than weeks.`, ids: bear.slice(0, 6).map(r => r.id) });

  const majors = ['SPX', 'NDX', 'SX5E', 'NKY', 'EEM', 'GOLD', 'BTC', 'WTI', 'COPPER'];
  const below = rows.filter(r => majors.includes(r.id) && r.vs200 != null && r.vs200 < 0);
  if (below.length) items.push({ severity: below.length >= 4 ? 'elevated' : 'info', icon: 'line', title: `${below.length} of ${majors.length} major markets below their 200-day average`, text: `${below.map(r => `${name(r.id)} (${r.vs200.toFixed(1)}%)`).join(', ')}. The 200-day line is a widely watched long-term trend marker.`, ids: below.map(r => r.id) });

  const tails = rows.filter(r => r.unit !== 'bp' && r.var95 != null && !['crypto', 'macro'].includes(r.cls)).sort((a, b) => a.var95 - b.var95).slice(0, 3);
  if (tails.length) items.push({ severity: 'info', icon: 'alert', title: 'Largest one-day tail risk (excluding crypto)', text: `${tails.map(r => `${name(r.id)}: a 1-in-20 bad day has meant a loss of about ${Math.abs(r.var95).toFixed(1)}%, and ${Math.abs(r.cvar95).toFixed(1)}% on average beyond that`).join('; ')}. Based on the last 252 sessions.`, ids: tails.map(r => r.id) });

  const quiet = rows.filter(r => majors.includes(r.id) && r.volPct != null && r.volPct <= .15);
  if (quiet.length) items.push({ severity: 'info', icon: 'gauge', title: 'Unusually calm markets', text: `${quiet.map(r => name(r.id)).join(', ')}: volatility is in the bottom 15% of five years. Long quiet stretches can make markets more sensitive to surprises.`, ids: quiet.map(r => r.id) });

  const order = { high: 0, elevated: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return { items, asOf: new Date().toISOString(), note: DISCLAIMER };
}
