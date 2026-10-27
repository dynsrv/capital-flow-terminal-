// Pre-crash conditions: what was in place BEFORE the 1987, 2000 and 2008 peaks, and whether the same
// conditions are present now. This is the leading-indicator counterpart to the crash signatures in
// analytics.js (which describe the footprint of the crash once it had begun).
//
// Each condition records: what it looked like then (with the source), a measurable test against current
// data, and the current reading. Conditions the dashboard cannot measure with its data sources are listed
// as "not measured" rather than guessed — valuation multiples, margin debt, IPO volume, bank funding
// spreads and mortgage credit quality need licensed or manually maintained series.
import { ASSET_MAP } from './universe.js';
import { getHistory } from './data.js';
import { performance, windowSlice, mean, isDiffKind } from './analytics.js';
import { round } from './lib/util.js';

const pct = (a, b) => (a != null && b ? (a / b - 1) * 100 : null);
const fmtPct = (v, d = 1) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);
const fmtBp = (v) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${Math.round(v)} bp`);

/** value N calendar days ago (last observation on or before that date) */
function ago(points, days) {
  const d = new Date(); d.setDate(d.getDate() - days); const c = d.toISOString().slice(0, 10);
  let v = null; for (const p of points) { if (p[0] <= c) v = p[1]; else break; } return v;
}
const last = (pts) => (pts.length ? pts[pts.length - 1][1] : null);
function minOver(points, days) { const w = windowSlice(points, days); return w.length ? Math.min(...w.map(p => p[1])) : null; }
function maxOver(points, days) { const w = windowSlice(points, days); return w.length ? Math.max(...w.map(p => p[1])) : null; }
function percentile(points, days, v) { const w = windowSlice(points, days).map(p => p[1]); if (!w.length || v == null) return null; return w.filter(x => x <= v).length / w.length; }

/** Build the current-conditions snapshot once; every episode reads from it. */
export async function snapshot(ctx) {
  const ids = ['SPX', 'NDX', 'RUT', 'EEM', 'UST10Y', 'UST2Y', 'T10Y2Y', 'FEDFUNDS', 'HYOAS', 'IGOAS', 'VIX', 'WTI', 'DXY', 'TLT', 'BTC', 'HOUSE', 'BREAKEVEN10', 'HYG', 'LQD'];
  const H = {}; await Promise.all(ids.map(async (id) => { try { H[id] = (await getHistory(ctx, id)).points; } catch (e) { H[id] = []; } }));
  const perf = await performance(ctx, ids); const P = Object.fromEntries(perf.map(r => [r.id, r]));
  const S = {};
  const g = (id) => H[id] || [];
  S.spx2y = pct(last(g('SPX')), ago(g('SPX'), 730));
  S.spx1y = P.SPX && P.SPX.perf['1Y']; S.spx6m = P.SPX && P.SPX.perf['180D'];
  S.spxFromHigh = P.SPX && P.SPX.range52w ? pct(P.SPX.price, P.SPX.range52w.high) : null;
  S.ndx1y = P.NDX && P.NDX.perf['1Y']; S.ndxVsSpx1y = S.ndx1y != null && S.spx1y != null ? S.ndx1y - S.spx1y : null;
  S.rut1y = P.RUT && P.RUT.perf['1Y']; S.ndxVsRut1y = S.ndx1y != null && S.rut1y != null ? S.ndx1y - S.rut1y : null;
  S.tlt6m = P.TLT && P.TLT.perf['180D'];
  S.y10 = last(g('UST10Y')); S.y10chg6m = S.y10 != null && ago(g('UST10Y'), 180) != null ? (S.y10 - ago(g('UST10Y'), 180)) * 100 : null; S.y10chg1y = S.y10 != null && ago(g('UST10Y'), 365) != null ? (S.y10 - ago(g('UST10Y'), 365)) * 100 : null;
  S.ff = last(g('FEDFUNDS')); S.ffchg1y = S.ff != null && ago(g('FEDFUNDS'), 365) != null ? (S.ff - ago(g('FEDFUNDS'), 365)) * 100 : null; S.ffchg2y = S.ff != null && ago(g('FEDFUNDS'), 730) != null ? (S.ff - ago(g('FEDFUNDS'), 730)) * 100 : null; S.ffFrom3yHigh = S.ff != null && maxOver(g('FEDFUNDS'), 1095) != null ? (S.ff - maxOver(g('FEDFUNDS'), 1095)) * 100 : null;
  S.curve = last(g('T10Y2Y')); S.curveMin2y = minOver(g('T10Y2Y'), 730); S.curveInvertedRecently = S.curveMin2y != null && S.curveMin2y < 0; S.curveFromMin = S.curve != null && S.curveMin2y != null ? (S.curve - S.curveMin2y) * 100 : null;
  S.hy = last(g('HYOAS')); S.hyPct3y = percentile(g('HYOAS'), 1095, S.hy); S.hyMin1y = minOver(g('HYOAS'), 365); S.hyFromLow = S.hy != null && S.hyMin1y != null ? (S.hy - S.hyMin1y) * 100 : null;
  S.ig = last(g('IGOAS')); S.igPct3y = percentile(g('IGOAS'), 1095, S.ig);
  S.vix = last(g('VIX')); S.vix3m = mean(windowSlice(g('VIX'), 90).map(p => p[1])); S.vixMin1y = minOver(g('VIX'), 365);
  S.wti1y = P.WTI && P.WTI.perf['1Y']; S.wti2y = pct(last(g('WTI')), ago(g('WTI'), 730));
  S.dxy6m = P.DXY && P.DXY.perf['180D']; S.dxy1y = P.DXY && P.DXY.perf['1Y'];
  S.btc1y = P.BTC && P.BTC.perf['1Y'];
  if (S.btc1y == null && g('BTC').length > 300) S.btc1y = pct(last(g('BTC')), g('BTC')[0][1]); // free-tier history starts ~365d ago
  S.house = last(g('HOUSE')); S.houseMax2y = maxOver(g('HOUSE'), 730); S.houseFromPeak = S.house != null && S.houseMax2y != null ? S.house - S.houseMax2y : null;
  S.be10 = last(g('BREAKEVEN10'));
  S.hygVsLqd6m = P.HYG && P.LQD && P.HYG.perf['180D'] != null && P.LQD.perf['180D'] != null ? P.HYG.perf['180D'] - P.LQD.perf['180D'] : null;
  S.asOf = { SPX: P.SPX && P.SPX.asOf, HYOAS: g('HYOAS').length ? g('HYOAS')[g('HYOAS').length - 1][0] : null, HOUSE: g('HOUSE').length ? g('HOUSE')[g('HOUSE').length - 1][0] : null, FEDFUNDS: g('FEDFUNDS').length ? g('FEDFUNDS')[g('FEDFUNDS').length - 1][0] : null };
  return S;
}

// Condition helpers: each returns { label, then, now, hit, measured, note? }
const C = {
  longRally: (S, thenTxt, thr = 25) => ({ key: 'rally', label: `Extended equity rally into the peak`, then: thenTxt, now: `S&P 500 ${fmtPct(S.spx2y)} over 2 years, ${fmtPct(S.spx1y)} over 1 year`, hit: S.spx2y != null && S.spx2y >= thr, measured: S.spx2y != null }),
  nearHigh: (S, thenTxt) => ({ key: 'nearhigh', label: 'Equities at or near record highs', then: thenTxt, now: S.spxFromHigh == null ? 'n/a' : `S&P 500 ${fmtPct(S.spxFromHigh)} from its 1-year high`, hit: S.spxFromHigh != null && S.spxFromHigh > -5, measured: S.spxFromHigh != null }),
  tightening: (S, thenTxt, bp = 100, days = '2y') => ({ key: 'tightening', label: 'Fed had been raising rates', then: thenTxt, now: S.ff == null ? 'n/a' : `Fed funds ${S.ff.toFixed(2)}%, ${fmtBp(days === '1y' ? S.ffchg1y : S.ffchg2y)} over ${days === '1y' ? '1 year' : '2 years'}`, hit: (days === '1y' ? S.ffchg1y : S.ffchg2y) != null && (days === '1y' ? S.ffchg1y : S.ffchg2y) >= bp, measured: S.ff != null }),
  firstCuts: (S, thenTxt) => ({ key: 'firstcuts', label: 'Fed had started cutting after a hiking cycle', then: thenTxt, now: S.ffFrom3yHigh == null ? 'n/a' : `Fed funds ${fmtBp(S.ffFrom3yHigh)} from its 3-year high`, hit: S.ffFrom3yHigh != null && S.ffFrom3yHigh <= -50 && S.ffFrom3yHigh > -300, measured: S.ffFrom3yHigh != null }),
  inversion: (S, thenTxt) => ({ key: 'inversion', label: 'Yield curve (10Y–2Y) had inverted', then: thenTxt, now: S.curve == null ? 'n/a' : `Curve ${S.curve >= 0 ? '+' : ''}${(S.curve * 100).toFixed(0)} bp now; low of the last 2 years ${(S.curveMin2y * 100).toFixed(0)} bp`, hit: S.curveInvertedRecently, measured: S.curve != null }),
  reSteepening: (S, thenTxt) => ({ key: 'resteep', label: 'Curve re-steepening after inversion', then: thenTxt, now: S.curveFromMin == null ? 'n/a' : `Curve ${fmtBp(S.curveFromMin)} off its 2-year low`, hit: S.curveInvertedRecently && S.curveFromMin >= 50, measured: S.curveFromMin != null, note: 'Historically the curve re-steepens as the Fed starts easing, which is often closer to the recession than the inversion itself.' }),
  risingYields: (S, thenTxt, bp = 75) => ({ key: 'yields', label: 'Long yields rising sharply while stocks still rose', then: thenTxt, now: `10Y ${fmtBp(S.y10chg6m)} over 6 months; S&P 500 ${fmtPct(S.spx6m)} over 6 months`, hit: S.y10chg6m != null && S.y10chg6m >= bp && S.spx6m != null && S.spx6m > 0, measured: S.y10chg6m != null }),
  stocksUpBondsDown: (S, thenTxt) => ({ key: 'divergence', label: 'Stocks up while bonds fell (TLT)', then: thenTxt, now: `S&P 500 ${fmtPct(S.spx6m)} vs TLT ${fmtPct(S.tlt6m)} over 6 months`, hit: S.spx6m != null && S.tlt6m != null && S.spx6m > 5 && S.tlt6m < -5, measured: S.spx6m != null && S.tlt6m != null }),
  weakDollar: (S, thenTxt) => ({ key: 'usd', label: 'Dollar weakening', then: thenTxt, now: `DXY ${fmtPct(S.dxy6m)} over 6 months, ${fmtPct(S.dxy1y)} over 1 year`, hit: S.dxy1y != null && S.dxy1y <= -5, measured: S.dxy1y != null }),
  tightCredit: (S, thenTxt) => ({ key: 'credit', label: 'Credit spreads near cycle lows (complacent credit)', then: thenTxt, now: S.hy == null ? 'n/a' : `HY OAS ${S.hy.toFixed(2)}% (${Math.round(S.hyPct3y * 100)}th percentile of 3 years)`, hit: S.hyPct3y != null && S.hyPct3y <= 0.2, measured: S.hy != null }),
  creditTurning: (S, thenTxt) => ({ key: 'creditturn', label: 'Credit starting to widen while equities near highs', then: thenTxt, now: `HY OAS ${fmtBp(S.hyFromLow)} off its 1-year low; S&P 500 ${fmtPct(S.spxFromHigh)} from high`, hit: S.hyFromLow != null && S.hyFromLow >= 75 && S.spxFromHigh != null && S.spxFromHigh > -7, measured: S.hyFromLow != null && S.spxFromHigh != null, note: 'Credit led equities by months in 2007: spreads bottomed in June, stocks peaked in October.' }),
  lowVol: (S, thenTxt) => ({ key: 'vol', label: 'Volatility unusually low (complacency)', then: thenTxt, now: S.vix3m == null ? 'n/a' : `VIX 3-month average ${S.vix3m.toFixed(1)}; 1-year low ${S.vixMin1y.toFixed(1)}`, hit: S.vix3m != null && S.vix3m < 14, measured: S.vix3m != null }),
  narrowLeadership: (S, thenTxt) => ({ key: 'breadth', label: 'Narrow leadership: large-cap tech far ahead of small caps', then: thenTxt, now: `Nasdaq 100 ${fmtPct(S.ndx1y)} vs Russell 2000 ${fmtPct(S.rut1y)} over 1 year (gap ${fmtPct(S.ndxVsRut1y)})`, hit: S.ndxVsRut1y != null && S.ndxVsRut1y >= 20, measured: S.ndxVsRut1y != null }),
  parabolic: (S, thenTxt) => ({ key: 'parabolic', label: 'Parabolic rise in the speculative leader', then: thenTxt, now: `Nasdaq 100 ${fmtPct(S.ndx1y)} over 1 year; Bitcoin ${fmtPct(S.btc1y)}`, hit: (S.ndx1y != null && S.ndx1y >= 50) || (S.btc1y != null && S.btc1y >= 150), measured: S.ndx1y != null }),
  oilShock: (S, thenTxt, thr = 50) => ({ key: 'oil', label: 'Oil price shock', then: thenTxt, now: `WTI ${fmtPct(S.wti1y)} over 1 year, ${fmtPct(S.wti2y)} over 2 years`, hit: (S.wti1y != null && S.wti1y >= thr) || (S.wti2y != null && S.wti2y >= thr * 1.5), measured: S.wti1y != null }),
  housingRollover: (S, thenTxt) => ({ key: 'housing', label: 'House-price growth rolling over from a boom', then: thenTxt, now: S.house == null ? 'n/a' : `Case-Shiller ${fmtPct(S.house)} y/y, ${S.houseFromPeak != null ? S.houseFromPeak.toFixed(1) : 'n/a'} points below its 2-year peak (as of ${S.asOf.HOUSE})`, hit: S.houseMax2y != null && S.houseMax2y >= 8 && S.houseFromPeak <= -5, measured: S.house != null, note: 'Monthly series, about two months lagged.' }),
  unmeasured: (key, label, thenTxt, why) => ({ key, label, then: thenTxt, now: 'Not measured', hit: null, measured: false, note: why }),
};

export const EPISODES = [
  {
    id: 'BLACK_MONDAY_1987', name: 'Black Monday', peak: '1987-08-25', crash: '1987-10-19', peakToCrash: '8 weeks', depth: 'S&P 500 −20.5% in one session; −33% peak to trough',
    story: 'A two-year bull market accelerated into 1987: the S&P 500 was up about 39% for the year by late August. Through the same months the bond market was selling off hard as inflation worries returned and the dollar weakened after the Plaza and Louvre accords, and the Fed raised the discount rate in September. Stocks and bonds had been pulling apart for months, valuations had stretched, and portfolio insurance meant a lot of selling was pre-programmed. The index had already dropped about 10% in the week before 19 October.',
    sources: ['https://www.federalreservehistory.org/essays/stock-market-crash-of-1987', 'https://www.sec.gov/news/studies/1988/brady-report.pdf'],
    build: (S) => [
      C.longRally(S, 'S&P 500 +39% year-to-date at the August 1987 peak, roughly +70% over two years', 25),
      C.nearHigh(S, 'Record high on 25 August 1987'),
      C.risingYields(S, '10-year Treasury yield rose from about 7% in January to above 10% by mid-October 1987 while stocks kept rising until August', 100),
      C.stocksUpBondsDown(S, 'Bonds fell through most of 1987 as equities made new highs'),
      C.tightening(S, 'Fed raised the discount rate from 5.5% to 6% on 4 September 1987', 25, '1y'),
      C.weakDollar(S, 'Dollar had fallen roughly 40% against the yen and mark since 1985; policy coordination (Louvre Accord) was fraying by October 1987'),
      C.unmeasured('valuation', 'Stretched valuation', 'Trailing P/E around 20–23, well above the 1980s average', 'Earnings-based valuation needs a licensed data feed.'),
      C.unmeasured('plumbing', 'Mechanical selling in place', 'Portfolio insurance covered an estimated $60–90bn of equities, all programmed to sell as prices fell', 'No public series tracks systematic-strategy positioning; today the equivalent is vol-targeting and option-dealer hedging.'),
    ],
  },
  {
    id: 'DOTCOM_2000', name: 'Dot-com peak', peak: '2000-03-10', crash: '2000-04-14', peakToCrash: '5 weeks to the first 25% drop; the bear market ran to October 2002', depth: 'Nasdaq Composite −78% peak to trough; S&P 500 −49%',
    story: 'The Nasdaq rose 86% in 1999 alone and more than doubled in the twelve months to March 2000, while the broader market lagged and the average stock had been falling since 1998: leadership was extraordinarily narrow. The Fed raised rates six times between June 1999 and May 2000, long yields climbed, and the yield curve inverted in early 2000. Oil had nearly tripled from its 1998 lows. Record IPO issuance and margin debt marked peak speculation. The crash began in the leaders, and credit stress only came later.',
    sources: ['https://www.federalreservehistory.org/essays/dot-com-bubble', 'https://www.nber.org/papers/w8201'],
    build: (S) => [
      C.parabolic(S, 'Nasdaq Composite +86% in 1999 and roughly +110% in the 12 months to March 2000'),
      C.narrowLeadership(S, 'Nasdaq 100 beat the Russell 2000 by over 60 percentage points in 1999; NYSE breadth had been deteriorating since April 1998'),
      C.tightening(S, 'Fed funds raised from 4.75% to 6.5% between June 1999 and May 2000 (+175 bp)', 100, '1y'),
      C.risingYields(S, '10-year yield rose from about 4.7% in late 1998 to 6.7% in January 2000', 75),
      C.inversion(S, '10Y–2Y inverted in February 2000, about a month before the Nasdaq peak'),
      C.oilShock(S, 'WTI rose from about $11 in late 1998 to $34 by March 2000', 50),
      C.lowVol(S, 'Volatility was not low: VIX averaged above 20 in early 2000. This episode did not come out of calm'),
      C.unmeasured('valuation', 'Extreme valuation', 'Nasdaq 100 trailing P/E above 100; S&P 500 above 30 (CAPE 44, the highest on record)', 'Valuation multiples need a licensed data feed.'),
      C.unmeasured('froth', 'Peak speculation', '486 IPOs in 1999 with average first-day gains near 70%; margin debt hit a record $278bn in March 2000', 'IPO and margin-debt series are not available through this dashboard\'s free sources.'),
    ],
  },
  {
    id: 'GFC_2008', name: 'Global Financial Crisis', peak: '2007-10-09', crash: '2008-09-15', peakToCrash: '11 months from the equity peak to the Lehman failure; the first credit tremor (BNP Paribas fund freeze) came 2 months before the equity peak', depth: 'S&P 500 −57% peak to trough',
    story: 'The warning signs sat in credit and housing, not in equities. House prices peaked in mid-2006 and subprime delinquencies were rising through 2006. The Fed had raised rates by 425 bp over 2004–06 and the curve was inverted for most of 2006–07. High-yield spreads hit record lows in June 2007 and the VIX touched 10 in early 2007: maximum complacency. Then the sequence turned: two Bear Stearns hedge funds failed in June 2007, interbank funding seized in August, the Fed began cutting in September, and the S&P 500 still made a new high in October before the real decline. Oil spiking to $147 in mid-2008 added the final squeeze.',
    sources: ['https://www.federalreservehistory.org/essays/great-recession-of-200709', 'https://www.fcic.gov/report'],
    build: (S) => [
      C.housingRollover(S, 'Case-Shiller national growth peaked near +14% y/y in 2005, slowed through 2006 and turned negative in 2007'),
      C.tightening(S, 'Fed funds raised from 1% to 5.25% between June 2004 and June 2006 (+425 bp)', 150, '2y'),
      C.inversion(S, '10Y–2Y inverted from mid-2006 and stayed inverted or flat into mid-2007'),
      C.reSteepening(S, 'The curve steepened sharply from mid-2007 as the Fed started cutting'),
      C.firstCuts(S, 'Fed cut 50 bp on 18 September 2007; the S&P 500 made its record high three weeks later'),
      C.tightCredit(S, 'High-yield OAS fell to a record low of about 2.4% in June 2007'),
      C.creditTurning(S, 'HY spreads widened from 2.4% in June to over 4.5% by October 2007 while the S&P 500 set a new high'),
      C.lowVol(S, 'VIX fell below 10 in January 2007'),
      C.longRally(S, 'S&P 500 roughly +90% from the 2002 low; +25% over the two years to October 2007', 25),
      C.oilShock(S, 'WTI rose from about $60 in early 2007 to $147 in July 2008', 50),
      C.unmeasured('funding', 'Bank funding stress', 'TED spread jumped from about 0.3% to over 2% in August 2007', 'The TED spread series was discontinued in 2022; a SOFR-based substitute needs a licensed feed.'),
      C.unmeasured('leverage', 'Household and bank leverage', 'Household debt reached about 100% of GDP; broker-dealer leverage exceeded 30:1', 'Leverage data is quarterly and not wired into this dashboard.'),
    ],
  },
];

// Late-cycle checklist shared across all three episodes, scored on current data.
export function commonChecklist(S) {
  return [
    C.longRally(S, 'Present in all three episodes: a multi-year advance into the peak'),
    C.nearHigh(S, 'All three peaks were record highs'),
    C.tightening(S, 'All three followed a Fed tightening cycle (1987: discount-rate rise; 1999–2000: +175 bp; 2004–06: +425 bp)', 100, '2y'),
    C.inversion(S, 'Curve inverted before 2000 and 2007 (not in 1987)'),
    C.risingYields(S, 'Sharp rises in long yields preceded 1987 and 2000', 75),
    C.tightCredit(S, 'Record-tight credit spreads preceded 2007'),
    C.lowVol(S, 'Volatility was near record lows before 2007; not before 1987 or 2000'),
    C.narrowLeadership(S, 'Narrow leadership defined 1999–2000'),
    C.oilShock(S, 'Oil spiked before 2000 and 2008'),
  ];
}

export async function preCrash(ctx) {
  const S = await snapshot(ctx);
  const episodes = EPISODES.map(e => {
    const conditions = e.build(S);
    const measured = conditions.filter(c => c.measured);
    const hits = measured.filter(c => c.hit).length;
    return { id: e.id, name: e.name, peak: e.peak, crash: e.crash, peakToCrash: e.peakToCrash, depth: e.depth, story: e.story, sources: e.sources, conditions, hits, measured: measured.length, unmeasured: conditions.length - measured.length, resemblance: measured.length ? hits / measured.length : null };
  });
  const common = commonChecklist(S);
  const present = common.filter(c => c.hit).map(c => c.label);
  const absent = common.filter(c => c.measured && !c.hit).map(c => c.label);
  return {
    asOf: new Date().toISOString(), snapshot: S, episodes, common: { conditions: common, hits: common.filter(c => c.hit).length, measured: common.filter(c => c.measured).length, present, absent },
    method: 'Each episode is reduced to the conditions documented before its peak (rally length, policy tightening, curve shape, credit spreads, volatility, leadership, oil, housing). Each condition has a fixed numeric test applied to current data. A match count is descriptive: these conditions were present before past crashes, and also at many times that were not followed by a crash. Conditions the dashboard cannot measure are listed, not guessed.',
  };
}
