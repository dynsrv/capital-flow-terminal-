// 2020–2023: the COVID crash (Feb–Mar 2020) and the inflation bear market (2022, with the 2023 bank stress).
// Each episode has three phases:
//   before — conditions in place ahead of the peak, each with a numeric test applied to current data
//   during — what the fall looked like (its signature), tested against current data: "is this happening now?"
//   impact — what followed: policy response, casualties, recovery time (documented facts, with sources)
// Figures in the "then" text are documented values; the "now" text is measured from this dashboard's data.
import { snapshot, C } from './precrash.js';
import { getHistory } from './data.js';
import { changes, align, pearson, windowSlice } from './analytics.js';

const fmtPct = (v, d = 1) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);
const fmtBp = (v) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${Math.round(v)} bp`);
const last = (pts) => (pts && pts.length ? pts[pts.length - 1] : null);
function ago(points, days) { const d = new Date(); d.setDate(d.getDate() - days); const c = d.toISOString().slice(0, 10); let v = null; for (const p of points) { if (p[0] <= c) v = p[1]; else break; } return v; }
const pct = (a, b) => (a != null && b ? (a / b - 1) * 100 : null);

async function extras(ctx) {
  const ids = ['SPX', 'TLT', 'HYOAS', 'CPI', 'DXY', 'WTI'];
  const H = {}; await Promise.all(ids.map(async (id) => { try { H[id] = (await getHistory(ctx, id)).points; } catch (e) { H[id] = []; } }));
  const E = {};
  const cpi = last(H.CPI); E.cpi = cpi ? cpi[1] : null; E.cpiMonth = cpi ? cpi[0].slice(0, 7) : null;
  const spx = last(H.SPX); E.spx30 = spx ? pct(spx[1], ago(H.SPX, 30)) : null;
  const hy = last(H.HYOAS); E.hyChg30 = hy && ago(H.HYOAS, 30) != null ? (hy[1] - ago(H.HYOAS, 30)) * 100 : null;
  const dxy = last(H.DXY); E.dxy30 = dxy ? pct(dxy[1], ago(H.DXY, 30)) : null;
  const wti = last(H.WTI); E.wti90 = wti ? pct(wti[1], ago(H.WTI, 90)) : null;
  // 90-day correlation of daily stock and bond (TLT) returns: positive means they are falling and rising together
  const a = align({ s: changes(windowSlice(H.SPX, 130), false), b: changes(windowSlice(H.TLT, 130), false) });
  const n = a.dates.length; E.sbCorr = n >= 40 ? pearson(a.cols.s.slice(-63), a.cols.b.slice(-63)) : null;
  return E;
}

const T = (key, label, then, now, hit, measured = true) => ({ key, label, then, now, hit: measured ? !!hit : null, measured });

export const RECENT = [
  {
    id: 'COVID_2020', name: 'COVID crash', short: '2020',
    peak: '2020-02-19', trough: '2020-03-23', recovered: '2020-08-18',
    depth: 'S&P 500 −34% in 23 trading days (3,386 → 2,237)', duration: '1 month peak to low', recovery: 'Record regained 18 Aug 2020, six months after the peak',
    story: 'A calm, rising market met an outside shock. The S&P 500 closed at a record on 19 February 2020 with volatility low and credit spreads tight. As the virus spread beyond China, the fastest fall into a bear market on record followed: every asset was sold for dollars, credit markets froze and oil collapsed. An equally fast policy response, rates to zero, unlimited asset purchases and fiscal support, ended it within five weeks.',
    before: (S) => [
      C.longRally(S, 'S&P 500 +28.9% in 2019 and at a record 3,386.15 on 19 February 2020', 25),
      C.nearHigh(S, 'Record close on 19 February 2020, five weeks before the low'),
      C.lowVol(S, 'VIX was near 14 at the February 2020 peak: little risk was priced'),
      C.tightCredit(S, 'High-yield OAS near 3.5% in January 2020, close to its cycle low'),
      C.firstCuts(S, 'The Fed cut three times in 2019 (July, September, October) to 1.50–1.75% after the 2015–18 hikes'),
      C.inversion(S, '10Y–2Y briefly inverted in August 2019'),
      C.valuation(S, 'Stretched valuation', 'US equity market value was high relative to GDP going into 2020', 2020, 0.9),
      C.mechanical(S, 'After a calm 2019, volatility-targeting and risk-parity funds held near-full exposure; the March volatility spike forced them to sell'),
      C.unmeasured('trigger', 'An outside shock', 'A pandemic: Italy locked down regions from late February, and the WHO declared a pandemic on 11 March 2020', 'Outside shocks do not show in market data before they arrive. This is why the 2020 checklist can look calm right up to the fall.'),
    ],
    during: (S, E) => [
      T('vol', 'Volatility explosion (VIX above 40)', 'VIX closed at a record 82.69 on 16 March 2020', S.vix == null ? 'n/a' : `VIX ${S.vix.toFixed(1)}`, S.vix >= 40, S.vix != null),
      T('fall', 'Equities down 20% or more within a month', 'S&P 500 −34% in 23 trading days, the fastest fall into a bear market on record; trading halted four times (9, 12, 16 and 18 March)', `S&P 500 ${fmtPct(E.spx30)} over 30 days`, E.spx30 <= -20, E.spx30 != null),
      T('credit', 'Credit spreads blow out', 'High-yield OAS widened from about 3.5% to about 10.9% by 23 March 2020', `HY OAS ${fmtBp(E.hyChg30)} over 30 days`, E.hyChg30 >= 200, E.hyChg30 != null),
      T('cash', 'Dash for dollars', 'The dollar index jumped about 8% in under two weeks to near 103 as Treasuries and even gold were sold for cash', `DXY ${fmtPct(E.dxy30)} over 30 days`, E.dxy30 >= 4, E.dxy30 != null),
      T('oil', 'Oil collapse', 'Demand collapse plus the Saudi–Russia price war (from 8 March); the May WTI future settled at −$37.63 on 20 April 2020', `WTI ${fmtPct(E.wti90)} over 90 days`, E.wti90 <= -40, E.wti90 != null),
    ],
    impact: [
      'The Fed cut 150 bp in two emergency moves (3 and 15 March) to 0–0.25%, and on 23 March pledged asset purchases "in the amounts needed", adding backstops for corporate bonds, municipal debt and bank lending.',
      'Congress passed the CARES Act, about $2.2 trillion of fiscal support, on 27 March 2020.',
      'The Fed balance sheet grew from about $4.2 trillion to more than $7 trillion by June 2020.',
      'The S&P 500 regained its February record on 18 August 2020: the shortest bear market on record.',
      'The response planted the next episode: money supply (M2) grew more than 25% in a year, and with supply-chain shocks this fed the 2021–22 inflation.',
    ],
    lesson: 'Fast outside shocks met by fast, large policy support can recover quickly. Watch policy room: with rates already near zero, only the balance sheet and fiscal policy were left.',
    sources: ['https://www.federalreserve.gov/newsevents/pressreleases/monetary20200315a.htm', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20200323b.htm', 'https://fred.stlouisfed.org/series/VIXCLS', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2', 'https://fred.stlouisfed.org/series/WALCL'],
  },
  {
    id: 'INFLATION_2022', name: 'Inflation bear market', short: '2022–23',
    peak: '2022-01-03', trough: '2022-10-12', recovered: '2024-01-19',
    depth: 'S&P 500 −25.4% (4,797 → 3,577); Nasdaq 100 −33% in 2022', duration: '9 months peak to low', recovery: 'Record regained 19 Jan 2024, about two years after the peak',
    story: 'The policy support of 2020 met supply shocks and the reopening. Inflation rose to multi-decade highs while rates were still near zero and speculation ran hot. In 2022 the Fed hiked at the fastest pace in four decades: stocks and bonds fell together, the dollar surged and speculative assets collapsed. The rate shock then broke weak links, from UK pension funds to US regional banks in March 2023.',
    before: (S, E) => [
      C.longRally(S, 'S&P 500 +26.9% in 2021, more than double its March 2020 low', 25),
      C.nearHigh(S, 'Record close 4,796.56 on 3 January 2022'),
      T('inflation', 'Inflation well above target', 'CPI 7.0% y/y in December 2021, the highest since 1982', E.cpi == null ? 'n/a' : `CPI ${E.cpi.toFixed(1)}% y/y (${E.cpiMonth})`, E.cpi >= 5, E.cpi != null),
      T('behind', 'Policy still loose while inflation ran hot', 'Fed funds at 0–0.25% and asset purchases still running into March 2022', S.ff == null || E.cpi == null ? 'n/a' : `Fed funds ${S.ff.toFixed(2)}% vs CPI ${E.cpi.toFixed(1)}% (real policy rate ${(S.ff - E.cpi).toFixed(1)} pts)`, S.ff != null && E.cpi != null && E.cpi - S.ff >= 3, S.ff != null && E.cpi != null),
      C.parabolic(S, 'Speculative excess: meme stocks (January 2021), record SPAC issuance and bitcoin near $69,000 in November 2021'),
      C.narrowLeadership(S, 'A handful of mega-cap tech stocks drove the index; the Nasdaq 100 peaked on 19 November 2021'),
      C.valuation(S, 'Record valuation', 'US equity market value relative to GDP reached a record at the end of 2021', 2022, 0.9),
      C.risingYields(S, 'The 10-year yield rose from about 1.5% to 1.8% over December 2021–January 2022 as the Fed turned hawkish', 50),
    ],
    during: (S, E) => [
      T('together', 'Stocks and bonds fall together', 'S&P 500 −19.4% and the Bloomberg US Aggregate bond index −13% in 2022, the worst year on record for US bonds', `S&P 500 ${fmtPct(S.spx6m)} vs TLT ${fmtPct(S.tlt6m)} over 6 months; 90-day stock–bond correlation ${E.sbCorr == null ? 'n/a' : E.sbCorr.toFixed(2)}`, S.spx6m <= -10 && S.tlt6m <= -10, S.spx6m != null && S.tlt6m != null),
      T('hikes', 'Fastest Fed hiking in four decades', 'Fed funds raised 425 bp in 2022, including four 75 bp moves, and on to 5.25–5.50% by July 2023', S.ffchg1y == null ? 'n/a' : `Fed funds ${fmtBp(S.ffchg1y)} over 1 year`, S.ffchg1y >= 250, S.ffchg1y != null),
      T('cpi', 'Inflation at multi-decade highs', 'CPI peaked at 9.1% y/y in June 2022', E.cpi == null ? 'n/a' : `CPI ${E.cpi.toFixed(1)}% y/y (${E.cpiMonth})`, E.cpi >= 7, E.cpi != null),
      T('usd', 'Dollar surge', 'The dollar index rose about 19% to a 20-year high near 114 in late September 2022', `DXY ${fmtPct(S.dxy1y)} over 1 year`, S.dxy1y >= 10, S.dxy1y != null),
      T('curve', 'Deep yield-curve inversion', '10Y–2Y inverted from July 2022 and reached about −108 bp in July 2023, the deepest since 1981', S.curve == null ? 'n/a' : `10Y–2Y ${S.curve >= 0 ? '+' : ''}${Math.round(S.curve * 100)} bp`, S.curve <= -0.5, S.curve != null),
      T('spec', 'Speculative assets collapse', 'Bitcoin −64% in 2022 (−77% from its November 2021 peak); FTX failed in November 2022', `Bitcoin ${fmtPct(S.btc1y)} over 1 year`, S.btc1y <= -50, S.btc1y != null),
      T('growth', 'Long-duration growth stocks hit hardest', 'Nasdaq 100 −33% in 2022 against −19% for the S&P 500', S.ndxVsSpx1y == null ? 'n/a' : `Nasdaq 100 vs S&P 500 over 1 year: ${fmtPct(S.ndxVsSpx1y)}`, S.ndxVsSpx1y <= -8, S.ndxVsSpx1y != null),
    ],
    impact: [
      'The S&P 500 bottomed at 3,577.03 on 12 October 2022, −25.4% from its January record, and regained the record on 19 January 2024.',
      'The rate shock broke weak links: the UK gilt and pension (LDI) crisis in September 2022, FTX in November 2022, then Silicon Valley Bank (10 March 2023), Signature Bank and First Republic (1 May 2023). UBS took over Credit Suisse on 19 March 2023.',
      'The Fed opened the Bank Term Funding Program on 12 March 2023 and still raised rates to 5.25–5.50% (26 July 2023).',
      'Bonds stopped hedging stocks: with inflation high, stock and bond returns moved together, and the classic 60/40 mix had one of its worst years on record.',
      'Inflation fell from 9.1% (June 2022) to 3.0% by June 2023 without a recession that year; the 2023 recovery was led by a handful of mega-cap tech stocks.',
    ],
    lesson: 'When inflation is the problem, central banks tighten into weakness instead of rescuing markets, and bonds stop diversifying. Watch inflation, the real policy rate and the stock–bond correlation together.',
    sources: ['https://www.bls.gov/news.release/archives/cpi_07132022.htm', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20230726a.htm', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20230312a.htm', 'https://fred.stlouisfed.org/series/T10Y2Y', 'https://fred.stlouisfed.org/series/CPIAUCSL'],
  },
];

export async function recentEpisodes(ctx) {
  const [S, E] = await Promise.all([snapshot(ctx), extras(ctx)]);
  const score = (list) => { const m = list.filter(c => c.measured); return { hits: m.filter(c => c.hit).length, measured: m.length }; };
  const episodes = RECENT.map(e => {
    const before = e.before(S, E); const during = e.during(S, E);
    return { id: e.id, name: e.name, short: e.short, peak: e.peak, trough: e.trough, recovered: e.recovered, depth: e.depth, duration: e.duration, recovery: e.recovery, story: e.story,
      before: { conditions: before, ...score(before) }, during: { signatures: during, ...score(during) }, impact: e.impact, lesson: e.lesson, sources: e.sources };
  });
  return {
    asOf: new Date().toISOString(), episodes, now: { stockBondCorr90d: E.sbCorr, cpi: E.cpi, cpiMonth: E.cpiMonth },
    method: 'Before: conditions documented ahead of each peak, each tested against current data with a fixed rule. During: the footprint of the fall itself (volatility, speed, credit, dollar, rates), tested against current data to show whether anything similar is happening now. Impact: documented policy responses and outcomes. Historical figures come from the Federal Reserve, BLS and FRED; current readings come from this dashboard\'s own data. A match is a resemblance, not a forecast.',
  };
}
