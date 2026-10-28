// World Bonds (WB) and Fixed Income Credit Monitor (FICM) for the Flows page.
// Everything here is a measured public series with its own date: FRED (US Treasury yields, OECD 10-year yields, ICE
// BofA option-adjusted spreads, Indonesia reserves and policy rate), the US Treasury TIC tables (foreign holdings of US
// Treasuries) and bond ETF closes from Yahoo. Series nobody publishes free (Indonesia's 10-year yield, foreign
// holdings of SBN) are entered by the admin with a source and an as-of date, or reported as not connected.
import * as fred from './adapters/fred.js';
import * as yahoo from './adapters/yahoo.js';
import { fetchText } from './lib/util.js';
import { windowSlice, mean, std } from './analytics.js';
import { round } from './lib/util.js';

const last = (p) => (p && p.length ? p[p.length - 1] : null);
function at(points, date) { let v = null; for (const p of points) { if (p[0] <= date) v = p; else break; } return v; }
function ago(points, days) { const d = new Date(); d.setDate(d.getDate() - days); const r = at(points, d.toISOString().slice(0, 10)); return r ? r[1] : null; }
const bp = (a, b) => (a == null || b == null ? null : round((a - b) * 100, 0));
const pc = (a, b) => (a == null || !b ? null : round((a / b - 1) * 100, 2));
function pctile(points, days, v) { const w = windowSlice(points, days).map(p => p[1]); if (!w.length || v == null) return null; return round(w.filter(x => x <= v).length / w.length * 100, 0); }
function zscore(points, days, v) { const w = windowSlice(points, days).map(p => p[1]); const s = std(w); return s && v != null ? round((v - mean(w)) / s, 2) : null; }
const rebase = (w) => (w.length && w[0][1] ? w.map(p => [p[0], round(p[1] / w[0][1] * 100, 2)]) : []);
const spark = (points, days) => windowSlice(points, days).map(p => [p[0], round(p[1], 3)]);

async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }
async function fredSeries(ctx, id, years = 6) {
  const r = await ctx.cache.resolve(`bond:fred:${id}`, 6 * 3600, () => fred.series(id, { apiKey: ctx.config.keys.FRED_API_KEY || '', years }));
  if (!r.data) throw new Error(r.error || `FRED ${id} unavailable`);
  return { points: r.data.points, stale: !!r.stale, fetchedAt: r.fetchedAt };
}
async function etf(ctx, sym) {
  const r = await ctx.cache.resolve(`bond:yahoo:${sym}`, 900, () => yahoo.history(sym, '2y'));
  if (!r.data) throw new Error(r.error || `Yahoo ${sym} unavailable`);
  return { points: r.data.points, stale: !!r.stale };
}

/* ═════════ World Bonds ═════════ */
const SOV = [
  { id: 'US', name: 'United States', series: 'DGS10', freq: 'daily', region: 'Global' },
  { id: 'DE', name: 'Germany', series: 'IRLTLT01DEM156N', freq: 'monthly', region: 'Global' },
  { id: 'JP', name: 'Japan', series: 'IRLTLT01JPM156N', freq: 'monthly', region: 'Asia' },
  { id: 'GB', name: 'United Kingdom', series: 'IRLTLT01GBM156N', freq: 'monthly', region: 'Global' },
  { id: 'FR', name: 'France', series: 'IRLTLT01FRM156N', freq: 'monthly', region: 'Global' },
  { id: 'IT', name: 'Italy', series: 'IRLTLT01ITM156N', freq: 'monthly', region: 'Global' },
  { id: 'ES', name: 'Spain', series: 'IRLTLT01ESM156N', freq: 'monthly', region: 'Global' },
  { id: 'CH', name: 'Switzerland', series: 'IRLTLT01CHM156N', freq: 'monthly', region: 'Global' },
  { id: 'CA', name: 'Canada', series: 'IRLTLT01CAM156N', freq: 'monthly', region: 'Global' },
  { id: 'AU', name: 'Australia', series: 'IRLTLT01AUM156N', freq: 'monthly', region: 'Asia' },
  { id: 'KR', name: 'South Korea', series: 'IRLTLT01KRM156N', freq: 'monthly', region: 'Asia' },
  { id: 'MX', name: 'Mexico', series: 'IRLTLT01MXM156N', freq: 'monthly', region: 'EM' },
  { id: 'ZA', name: 'South Africa', series: 'IRLTLT01ZAM156N', freq: 'monthly', region: 'EM' },
];
const BOND_ETFS = [
  { id: 'TLT', name: 'US Treasuries 20Y+', group: 'US' }, { id: 'IEF', name: 'US Treasuries 7–10Y', group: 'US' },
  { id: 'BWX', name: 'Developed ex-US sovereigns (local ccy)', group: 'Global' }, { id: 'BNDX', name: 'Global aggregate ex-US (USD-hedged)', group: 'Global' },
  { id: 'EMB', name: 'EM sovereigns (USD)', group: 'EM' }, { id: 'EMLC', name: 'EM sovereigns (local ccy; Indonesia ≈10%)', group: 'EM' }, { id: 'EMHY', name: 'EM high yield (USD)', group: 'EM' },
];
// Foreign holdings of US Treasuries: TIC Table 5 (latest 13 months, top holders) and the TIC history file (all countries, lags a few months).
const TIC5 = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt';
const TICH = 'https://ticdata.treasury.gov/Publish/mfhhis01.txt';
const ASIA = ['Japan', 'China, Mainland', 'Taiwan', 'Hong Kong', 'Singapore', 'Korea, South', 'India', 'Thailand', 'Indonesia', 'Philippines', 'Malaysia', 'Vietnam', 'Australia'];
function parseTic(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.split('\t').map(x => x.trim().replace(/^"|"$/g, '')));
  const hdr = lines.findIndex(l => /^country$/i.test(l[0]));
  if (hdr < 0) throw new Error('TIC table: header not found');
  let months = lines[hdr].slice(1).filter(Boolean);
  if (!/^\d{4}-\d{2}$/.test(months[0] || '')) { // history file: month names on the row above, years on the Country row
    const yrs = lines[hdr].slice(1); const mon = lines[hdr - 1] ? lines[hdr - 1].slice(1) : [];
    const M = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    months = mon.map((m, i) => (M[m] && yrs[i] ? `${yrs[i]}-${M[m]}` : null)).filter(Boolean);
  }
  const rows = {};
  for (const l of lines.slice(hdr + 1)) {
    if (!l[0] || /^-+$/.test(l[1] || '')) continue;
    const vals = l.slice(1, 1 + months.length).map(v => (v === '' || v === 'n.a.' ? null : Number(v)));
    if (!vals.some(v => v != null && isFinite(v))) continue;
    if (!rows[l[0]]) rows[l[0]] = vals; // first block only (the history file repeats older years below)
  }
  return { months, rows };
}
async function ticHoldings(ctx) {
  const r5 = await ctx.cache.resolve('bond:tic5', 6 * 3600, async () => parseTic(await fetchText(TIC5, { timeoutMs: 20000 })));
  if (!r5.data) throw new Error(r5.error || 'TIC unavailable');
  const { months, rows } = r5.data;
  const row = (name) => { const v = rows[name]; if (!v) return null; const d = (k) => (v[0] != null && v[k] != null ? round(v[0] - v[k], 1) : null); return { name, latest: v[0], d1m: d(1), d3m: d(3), d12m: d(12), series: months.map((m, i) => [m, v[i]]).filter(x => x[1] != null).reverse() }; };
  const names = Object.keys(rows).filter(n => !/total|of which|^foreign|^all other/i.test(n));
  const top = names.slice(0, 12).map(row).filter(Boolean);
  const asia = ASIA.map(row).filter(Boolean);
  let indonesia = null;
  try {
    const rh = await ctx.cache.resolve('bond:tich', 24 * 3600, async () => parseTic(await fetchText(TICH, { timeoutMs: 25000 })));
    const h = rh.data; const v = h && h.rows.Indonesia;
    if (v) indonesia = { name: 'Indonesia', latest: v[0], asOf: h.months[0], d1m: v[1] != null ? round(v[0] - v[1], 1) : null, d12m: v[12] != null ? round(v[0] - v[12], 1) : null, series: h.months.map((m, i) => [m, v[i]]).filter(x => x[1] != null).reverse(), note: 'From the TIC history file, which is published a few months behind Table 5.' };
  } catch (e) { /* optional */ }
  return { asOf: months[0], months: months.slice().reverse(), total: row('Grand Total'), top, asia, indonesia, source: TIC5 };
}

export async function worldBonds(ctx) {
  const k = ctx.config.keys;
  const [sov, etfs, tic, idRes, idRate, us2, us30, fdh] = await Promise.all([
    pool(SOV, 2, async (s) => { try { const h = await fredSeries(ctx, s.series, 4); const L = last(h.points); const v = L[1]; const back = (n) => (s.freq === 'monthly' ? (h.points[h.points.length - 1 - n] || [])[1] : ago(h.points, n === 1 ? 31 : n === 3 ? 92 : 365)); return { ...s, latest: round(v, 2), asOf: L[0], d1m: bp(v, back(1)), d3m: bp(v, back(3)), d1y: bp(v, back(12)), pct2y: pctile(h.points, 730, v), z2y: zscore(h.points, 730, v), spark: spark(h.points, 730), stale: h.stale }; } catch (e) { return { ...s, error: e.message }; } }),
    pool(BOND_ETFS, 4, async (f) => { try { const h = await etf(ctx, f.id); const L = last(h.points); const v = L[1]; const y0 = at(h.points, `${L[0].slice(0, 4)}-01-01`); return { ...f, price: round(v, 2), asOf: L[0], w1: pc(v, ago(h.points, 7)), m1: pc(v, ago(h.points, 31)), m3: pc(v, ago(h.points, 92)), ytd: y0 ? pc(v, y0[1]) : null, y1: pc(v, ago(h.points, 365)), spark: rebase(windowSlice(h.points, 92)), stale: h.stale }; } catch (e) { return { ...f, error: e.message }; } }),
    ticHoldings(ctx).catch(e => ({ error: e.message })),
    fredSeries(ctx, 'TRESEGIDM052N', 6).catch(() => null), fredSeries(ctx, 'IRSTCI01IDM156N', 6).catch(() => null),
    fredSeries(ctx, 'DGS2', 3).catch(() => null), fredSeries(ctx, 'DGS30', 3).catch(() => null), fredSeries(ctx, 'FDHBFIN', 12).catch(() => null),
  ]);
  const us = sov.find(s => s.id === 'US');
  for (const s of sov) if (!s.error && us && !us.error) s.vsUS = bp(s.latest, us.latest);
  const num = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const manual = {
    y10: num(k.ID_10Y_YIELD), y10AsOf: k.ID_10Y_ASOF || null, sbnForeignTn: num(k.ID_SBN_FOREIGN_TN), sbnForeignPct: num(k.ID_SBN_FOREIGN_PCT), sbnAsOf: k.ID_SBN_ASOF || null, source: k.ID_BOND_SOURCE || 'DJPPR / PHEI (entered by admin)',
  };
  const idn = {
    manual, vsUS: manual.y10 != null && us && !us.error ? bp(manual.y10, us.latest) : null,
    reserves: idRes ? { latest: round(last(idRes.points)[1] / 1000, 1), asOf: last(idRes.points)[0], d1m: round((last(idRes.points)[1] - (ago(idRes.points, 31) || last(idRes.points)[1])) / 1000, 1), d1y: idRes.points.length > 12 ? round((last(idRes.points)[1] - (ago(idRes.points, 365) || last(idRes.points)[1])) / 1000, 1) : null, spark: windowSlice(idRes.points, 730).map(p => [p[0], round(p[1] / 1000, 1)]), unit: 'USD bn', series: 'TRESEGIDM052N' } : null,
    overnightRate: idRate ? { latest: round(last(idRate.points)[1], 2), asOf: last(idRate.points)[0], d1y: bp(last(idRate.points)[1], (idRate.points[idRate.points.length - 13] || [])[1]), series: 'IRSTCI01IDM156N', label: 'Overnight interbank rate (monthly avg)' } : null,
    ticHoldings: tic && !tic.error ? tic.indonesia : null,
  };
  const curve = us2 && us30 && us && !us.error ? { y2: round(last(us2.points)[1], 2), y10: us.latest, y30: round(last(us30.points)[1], 2), s2s10: bp(us.latest, last(us2.points)[1]), asOf: us.asOf } : null;
  return {
    asOf: new Date().toISOString(), sovereigns: sov, curve, etfs, tic, indonesia: idn,
    foreignHeldUS: fdh ? { latest: round(last(fdh.points)[1] / 1000, 2), asOf: last(fdh.points)[0], d1y: round((last(fdh.points)[1] - (ago(fdh.points, 365) || last(fdh.points)[1])) / 1000, 2), unit: 'USD tn', series: 'FDHBFIN' } : null,
    notes: {
      yields: '10-year yields: US daily (FRED DGS10); other countries monthly averages from the OECD via FRED (IRLTLT01…). Deviation = percentile and z-score of the level within its own last two years. Spread vs US in basis points.',
      performance: 'Bond-market performance uses ETF closes as proxies (price only, Yahoo Finance, 15-min delayed). No free source covers Indonesian government bonds directly; EMLC holds about 10% Indonesia.',
      flows: 'Cross-border flows: foreign holdings of US Treasury securities by country (US Treasury TIC Table 5, monthly, USD bn, published with a ~6-week lag). Changes are differences in holdings, which include valuation effects. Foreign holdings of Indonesian government bonds (SBN) are published by DJPPR as PDFs, not as data; the admin can enter the latest figure.',
    },
  };
}

/* ═════════ Fixed Income Credit Monitor ═════════ */
const OAS = [
  // US
  { id: 'US_IG', name: 'US investment grade', series: 'BAMLC0A0CM', group: 'US', kind: 'headline' },
  { id: 'US_HY', name: 'US high yield', series: 'BAMLH0A0HYM2', group: 'US', kind: 'headline' },
  { id: 'US_AAA', name: 'AAA', series: 'BAMLC0A1CAAA', group: 'US', kind: 'rating' }, { id: 'US_AA', name: 'AA', series: 'BAMLC0A2CAA', group: 'US', kind: 'rating' }, { id: 'US_A', name: 'A', series: 'BAMLC0A3CA', group: 'US', kind: 'rating' }, { id: 'US_BBB', name: 'BBB', series: 'BAMLC0A4CBBB', group: 'US', kind: 'rating' },
  { id: 'US_BB', name: 'BB', series: 'BAMLH0A1HYBB', group: 'US', kind: 'rating' }, { id: 'US_B', name: 'B', series: 'BAMLH0A2HYB', group: 'US', kind: 'rating' }, { id: 'US_CCC', name: 'CCC & lower', series: 'BAMLH0A3HYC', group: 'US', kind: 'rating' },
  { id: 'US_1_3', name: '1–3Y', series: 'BAMLC1A0C13Y', group: 'US', kind: 'maturity' }, { id: 'US_3_5', name: '3–5Y', series: 'BAMLC2A0C35Y', group: 'US', kind: 'maturity' }, { id: 'US_5_7', name: '5–7Y', series: 'BAMLC3A0C57Y', group: 'US', kind: 'maturity' }, { id: 'US_7_10', name: '7–10Y', series: 'BAMLC4A0C710Y', group: 'US', kind: 'maturity' }, { id: 'US_10_15', name: '10–15Y', series: 'BAMLC7A0C1015Y', group: 'US', kind: 'maturity' }, { id: 'US_15P', name: '15Y+', series: 'BAMLC8A0C15PY', group: 'US', kind: 'maturity' },
  // Emerging markets (ICE BofA EM Corporate Plus family: sovereign, quasi-sovereign and corporate issuers)
  { id: 'EM_ALL', name: 'EM (all)', series: 'BAMLEMCBPIOAS', group: 'EM', kind: 'headline' },
  { id: 'EM_IG', name: 'EM investment grade', series: 'BAMLEMIBHGCRPIOAS', group: 'EM', kind: 'headline' },
  { id: 'EM_HY', name: 'EM high yield', series: 'BAMLEMHBHYCRPIOAS', group: 'EM', kind: 'headline' },
  { id: 'EM_ASIA', name: 'Asia', series: 'BAMLEMRACRPIASIAOAS', group: 'EM', kind: 'region' }, { id: 'EM_EMEA', name: 'EMEA', series: 'BAMLEMRECRPIEMEAOAS', group: 'EM', kind: 'region' }, { id: 'EM_LATAM', name: 'Latin America', series: 'BAMLEMRLCRPILAOAS', group: 'EM', kind: 'region' },
  { id: 'EM_PUB', name: 'Public sector / sovereign issuers', series: 'BAMLEMPBPUBSICRPIOAS', group: 'EM', kind: 'sector' }, { id: 'EM_PRIV', name: 'Private sector issuers', series: 'BAMLEMPTPRVICRPIOAS', group: 'EM', kind: 'sector' },
  { id: 'EM_FIN', name: 'Financials (private)', series: 'BAMLEMFSFCRPIOAS', group: 'EM', kind: 'sector' }, { id: 'EM_NONFIN', name: 'Non-financials', series: 'BAMLEMNSNFCRPIOAS', group: 'EM', kind: 'sector' },
  { id: 'EM_AAA_A', name: 'AAA–A', series: 'BAMLEM1BRRAAA2ACRPIOAS', group: 'EM', kind: 'rating' }, { id: 'EM_BBB', name: 'BBB', series: 'BAMLEM2BRRBBBCRPIOAS', group: 'EM', kind: 'rating' }, { id: 'EM_BB', name: 'BB', series: 'BAMLEM3BRRBBCRPIOAS', group: 'EM', kind: 'rating' }, { id: 'EM_B', name: 'B & lower', series: 'BAMLEM4BRRBLCRPIOAS', group: 'EM', kind: 'rating' },
  // Europe
  { id: 'EU_HY', name: 'Euro high yield', series: 'BAMLHE00EHYIOAS', group: 'Europe', kind: 'headline' },
  { id: 'EU_EM', name: 'Euro-denominated EM', series: 'BAMLEMEBCRPIEOAS', group: 'Europe', kind: 'headline' },
];
const CREDIT_ETFS = [{ id: 'LQD', name: 'US IG corporate' }, { id: 'HYG', name: 'US high yield' }, { id: 'EMB', name: 'EM sovereign (USD)' }, { id: 'EMHY', name: 'EM high yield (USD)' }, { id: 'EMLC', name: 'EM local currency' }];

/** Pressure reading from level and momentum: 0 calm … 100 stressed. */
function pressure(x) {
  if (x.latest == null) return null;
  let s = 0; const notes = [];
  const p = x.pct3y ?? 50; s += p * 0.55; // where it sits in its 3-year range
  const w = x.d1m == null ? 0 : x.d1m / Math.max(10, x.latest * 100 * 0.25); // 1-month widening relative to level (25% of level = full score)
  s += Math.max(-20, Math.min(35, w * 35));
  if (x.d1w != null && x.d1w > 0 && x.latest && x.d1w / (x.latest * 100) > 0.08) { s += 10; notes.push('widening fast this week'); }
  if (x.d1m != null && x.d1m < 0 && Math.abs(x.d1m) / (x.latest * 100) > 0.1) notes.push('tightened sharply over the month');
  if (p >= 85) notes.push('near the top of its 3-year range'); else if (p <= 15) notes.push('near the bottom of its 3-year range');
  const v = Math.round(Math.max(0, Math.min(100, s)));
  return { score: v, level: v >= 70 ? 'stressed' : v >= 45 ? 'elevated' : v >= 25 ? 'normal' : 'calm', notes };
}

export async function creditMonitor(ctx) {
  const rows = await pool(OAS, 2, async (o) => {
    try {
      const h = await fredSeries(ctx, o.series, 4); const L = last(h.points); const v = L[1];
      const x = { ...o, latest: round(v, 2), latestBp: Math.round(v * 100), asOf: L[0], d1d: bp(v, h.points.length > 1 ? h.points[h.points.length - 2][1] : null), d1w: bp(v, ago(h.points, 7)), d1m: bp(v, ago(h.points, 31)), d3m: bp(v, ago(h.points, 92)), ytd: bp(v, (at(h.points, `${L[0].slice(0, 4)}-01-01`) || [])[1]), pct1y: pctile(h.points, 365, v), pct3y: pctile(h.points, 1095, v), z3y: zscore(h.points, 1095, v), hi1y: round(Math.max(...windowSlice(h.points, 365).map(p => p[1])), 2), lo1y: round(Math.min(...windowSlice(h.points, 365).map(p => p[1])), 2), spark: spark(h.points, 365), stale: h.stale };
      x.pressure = pressure(x); return x;
    } catch (e) { return { ...o, error: e.message }; }
  });
  const etfs = await pool(CREDIT_ETFS, 3, async (f) => { try { const h = await etf(ctx, f.id); const L = last(h.points); const v = L[1]; return { ...f, price: round(v, 2), asOf: L[0], w1: pc(v, ago(h.points, 7)), m1: pc(v, ago(h.points, 31)), m3: pc(v, ago(h.points, 92)), y1: pc(v, ago(h.points, 365)), stale: h.stale }; } catch (e) { return { ...f, error: e.message }; } });
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  const ratio = (a, b) => (by[a] && by[b] && !by[a].error && !by[b].error ? round(by[a].latest / by[b].latest, 2) : null);
  const diff = (a, b) => (by[a] && by[b] && !by[a].error && !by[b].error ? Math.round((by[a].latest - by[b].latest) * 100) : null);
  const gauges = [
    { id: 'hy_ig', label: 'US HY ÷ IG', value: ratio('US_HY', 'US_IG'), unit: '×', why: 'Rises when investors demand more for risk; above 4 means high yield is under more pressure than investment grade.' },
    { id: 'ccc_bb', label: 'CCC − BB', value: diff('US_CCC', 'US_BB'), unit: 'bp', why: 'Distressed-tier premium. Blows out before defaults rise.' },
    { id: 'em_us', label: 'EM − US (IG)', value: diff('EM_IG', 'US_IG'), unit: 'bp', why: 'Extra yield for EM investment-grade issuers over US; widens when capital leaves EM.' },
    { id: 'emhy_ushy', label: 'EM HY − US HY', value: diff('EM_HY', 'US_HY'), unit: 'bp', why: 'EM high-yield premium over US high yield.' },
    { id: 'asia_em', label: 'Asia − EM', value: diff('EM_ASIA', 'EM_ALL'), unit: 'bp', why: 'Negative means Asian issuers trade tighter than EM overall.' },
    { id: 'pub_priv', label: 'Sovereign − private (EM)', value: diff('EM_PUB', 'EM_PRIV'), unit: 'bp', why: 'Public-sector EM issuers versus private corporates.' },
  ];
  const head = ['US_IG', 'US_HY', 'EM_ALL', 'EM_IG', 'EM_HY', 'EM_ASIA', 'EU_HY'].map(id => by[id]).filter(Boolean);
  const scored = head.filter(x => x.pressure);
  const overall = scored.length ? Math.round(scored.reduce((t, x) => t + x.pressure.score, 0) / scored.length) : null;
  return {
    asOf: new Date().toISOString(), rows, etfs, gauges,
    overall: overall == null ? null : { score: overall, level: overall >= 70 ? 'stressed' : overall >= 45 ? 'elevated' : overall >= 25 ? 'normal' : 'calm' },
    notes: {
      spreads: 'Option-adjusted spreads over Treasuries from the ICE BofA indices via FRED, daily (one-day lag). Sector, rating and maturity cuts are those FRED publishes; industry-level sectors (energy, banks, property) need a licensed ICE or Bloomberg feed and are not shown.',
      pressure: 'Pressure (0–100) combines where the spread sits in its 3-year range with how fast it widened over the last week and month. It is a rules-based reading of measured spreads, not a forecast.',
      indonesia: 'Indonesia has no free spread index. Nearest measured cuts: EM Asia and EM public-sector issuers (both include Indonesian sovereign and quasi-sovereign USD bonds); EMLC holds about 10% Indonesian local bonds.',
    },
  };
}
