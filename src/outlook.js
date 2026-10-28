// Market outlook: five scenarios (bull, base, correction, bear, crash) with a probability and a time horizon, written by
// the model from this dashboard's measured inputs (regime, anomalies, pre-crash checklist, stress, credit monitor, world
// bonds, the 2020–2023 episode scores), the latest themed headlines (war and the Middle East, supply chains and chips,
// stocks, crypto, bonds and the Fed) and the documented pre-conditions of past crashes. Probabilities are the model's
// calibrated judgement, not a forecast, and the card says so. Refreshed by the daily job or by an admin; every run is
// archived and the card shows what moved since the previous run.
import { measuredInputs, searchNews } from './ai.js';
import { creditMonitor, worldBonds } from './bonds.js';
import { recentEpisodes } from './recent.js';
import { creditNews } from './news.js';
import { callClaudeJson } from './lib/claude.js';
import { getHistory } from './data.js';
import { intelModel } from './lib/config.js';

const DOC = 'ai/outlook';
const ARCHIVE = 'ai/outlook-archive/';
export const SCENARIOS = ['bull', 'base', 'correction', 'bear', 'crash'];

const SYSTEM = `You are a professor of economics and a quantitative strategist writing the daily scenario outlook for an institutional market terminal. You reason only from the measured inputs and headlines you are given, plus well-documented history.

Produce five scenarios for the next 3 to 6 months, from the perspective of a global multi-asset investor with particular attention to Indonesia and emerging markets:
- bull: equities make new highs, volatility stays contained, credit tightens.
- base: range-bound with normal volatility; drawdown of less than 10% from the high.
- correction: a 10–20% fall in the S&P 500 (or equivalent EM/Indonesia drawdown), then recovery within months.
- bear: a 20–30% fall that lasts quarters, usually with an earnings or credit cycle.
- crash: a fall of 30% or more, or a 20% fall inside a few weeks, with forced selling and a liquidity event.

Rules:
- Probabilities are percentages that sum to exactly 100. Anchor them on base rates (in a typical year a 10% correction happens about once; a 20% bear about every 3–5 years; a crash about once every 10–15 years), then adjust for the measured conditions and the pre-crash checklist. Say in one line how you moved from the base rate.
- Give each scenario a horizon (when it would most likely play out), a path (what prices would do, in rough numbers tied to the current levels you were given), the drivers that make it more likely, the triggers that would mark it starting, and which historical episode it resembles (1987, 2000, 2008, 2020, 2022) and why.
- For each scenario give a price range at the end of its horizon for the S&P 500 ("spx") and for USD/IDR ("usdidr", rupiah per dollar; higher means a weaker rupiah). Anchor both on the QUANT ANCHORS: today's spot, realised volatility and the empirical distribution of 3- and 6-month moves over the last ten years. Make each range consistent with the scenario's severity and its place in that distribution (bull near the firm-rupiah tail, base around the median, correction and bear in the weak tail, crash at or beyond the worst historical move), allow for Bank Indonesia smoothing the path with intervention, and give the main channel in one line ("why": rate gap with the US, oil import bill, foreign SBN and equity flows, dollar strength, reserves). Never give a range that is impossible given the spot and the distribution without saying why in "why".
- Cover these themes explicitly in the conditions list, each with a one-line read and a direction (supportive / neutral / risk): war and the Middle East, supply chains and chips, equities, crypto, bonds and yields, credit, the Fed and inflation, the dollar and EM/Indonesia, oil and commodities, valuation and positioning.
- Separate verified facts (from the inputs) from your judgement. Never invent prices, dates or statistics. Cite headlines by their [n] index when a point rests on news.
- Be concrete and brief: short phrases, numbers where you have them, no hedging boilerplate.

Return only the JSON object, no code fence, no text before or after:
{"headline":"2–3 sentences: the state of the world and the single most important thing to watch",
 "stance":"risk-on|neutral|cautious|defensive",
 "conditions":[{"theme":"","read":"","direction":"supportive|neutral|risk"}],
 "scenarios":[{"id":"bull|base|correction|bear|crash","probability":0,"horizon":"","path":"","drivers":["..."],"triggers":["..."],"analog":"","watch":["..."],"spx":{"low":0,"high":0},"usdidr":{"low":0,"high":0,"why":""}}],
 "baseRateNote":"how the probabilities were moved from the base rates and why",
 "history":"3–5 sentences comparing today with the documented pre-conditions of 1987, 2000, 2008, 2020 and 2022: what matches, what is missing",
 "indonesia":"2–4 sentences on what each scenario means for Indonesia (IDR, SBN yields, JCI, foreign flows)",
 "wouldChangeMyMind":["..."],
 "citations":[1,2]}`;

const THEMES = [
  ['war', 'war Middle East Iran Israel oil shipping Red Sea markets this week'],
  ['chips', 'semiconductor supply chain chips export controls tariffs shortage this week'],
  ['fed', 'Federal Reserve rate decision inflation Treasury yields bond market this week'],
  ['crypto', 'bitcoin crypto market selloff ETF flows this week'],
  ['em', 'emerging markets Indonesia rupiah bonds foreign outflows Asia this week'],
];

async function gather(ctx) {
  const { inputs } = await measuredInputs(ctx);
  const [credit, bonds, recent, cnews] = await Promise.all([creditMonitor(ctx).catch(() => null), worldBonds(ctx).catch(() => null), recentEpisodes(ctx).catch(() => null), creditNews(ctx).catch(() => null)]);
  const pick = (r) => (r ? { seg: r.name, bp: r.latestBp, d1m: r.d1m, pct3y: r.pct3y, pressure: r.pressure && r.pressure.level } : null);
  const sum = {
    credit: credit ? { overall: credit.overall, segments: ['US_IG', 'US_HY', 'US_CCC', 'EM_ALL', 'EM_ASIA', 'EM_HY', 'EU_HY'].map(id => pick(credit.rows.find(r => r.id === id))).filter(Boolean), gauges: credit.gauges.map(g => `${g.label} ${g.value}${g.unit === '×' ? '×' : ' bp'}`) } : null,
    bonds: bonds ? { usCurve: bonds.curve, sovereigns: bonds.sovereigns.filter(s => !s.error).map(s => `${s.name} ${s.latest}% (1M ${s.d1m} bp, 1Y ${s.d1y} bp, ${s.pct2y}th pctile of 2Y)`), foreignHeldUST: bonds.tic && !bonds.tic.error ? { asOf: bonds.tic.asOf, total: bonds.tic.total, top: bonds.tic.top.slice(0, 6).map(t => `${t.name} ${t.latest} (1M ${t.d1m}, 12M ${t.d12m})`) } : null, bondEtfs: bonds.etfs.filter(e => !e.error).map(e => `${e.id} 1M ${e.m1}% YTD ${e.ytd}%`), indonesia: bonds.indonesia } : null,
    recentEpisodes: recent ? recent.episodes.map(e => ({ episode: e.name, beforePresent: `${e.before.hits}/${e.before.measured}`, duringPresent: `${e.during.hits}/${e.during.measured}`, present: e.before.conditions.filter(c => c.hit).map(c => c.label) })) : null,
  };
  // themed headlines: one search per theme when a search key is configured, plus the credit headlines from the feeds
  const news = []; const notes = [];
  for (const [theme, q] of THEMES) {
    const r = await searchNews(ctx.config, q);
    if (r.note && !r.items.length) { notes.push(`${theme}: ${r.note}`); continue; }
    for (const it of r.items.slice(0, 4)) news.push({ ...it, theme });
  }
  for (const it of ((cnews && cnews.items) || []).slice(0, 8)) news.push({ title: it.title, url: it.url, published: it.publishedAt, snippet: `${it.source} · ${it.market}`, theme: 'credit-feeds', provider: 'feeds' });
  news.forEach((n, i) => { n.n = i + 1; });
  return { inputs, summary: sum, news, newsNotes: notes };
}

function normalise(parsed) {
  const map = new Map((parsed.scenarios || []).map(s => [String(s.id || '').toLowerCase(), s]));
  const list = SCENARIOS.map(id => ({ ...(map.get(id) || {}), id, probability: Math.max(0, Number((map.get(id) || {}).probability) || 0) }));
  const tot = list.reduce((t, s) => t + s.probability, 0) || 1;
  let acc = 0; list.forEach((s, i) => { s.probability = i === list.length - 1 ? Math.max(0, 100 - acc) : Math.round(s.probability / tot * 100); acc += s.probability; });
  for (const s of list) { s.drivers = (s.drivers || []).slice(0, 4); s.triggers = (s.triggers || []).slice(0, 4); s.watch = (s.watch || []).slice(0, 4); s.horizon = s.horizon || ''; s.path = s.path || ''; s.analog = s.analog || '';
    for (const k of ['spx', 'usdidr']) { const r = s[k]; const lo = r && Number(r.low), hi = r && Number(r.high); s[k] = Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > 0 ? { low: Math.min(lo, hi), high: Math.max(lo, hi), why: (r.why || '').toString() } : null; } }
  parsed.scenarios = list;
  parsed.conditions = (parsed.conditions || []).slice(0, 12);
  return parsed;
}

// Quant anchors: spot, realised volatility and the empirical distribution of 63- and 126-trading-day moves over ten years.
const QS = [0, .01, .05, .1, .25, .5, .75, .9, .95, .99, 1];
async function quantAnchors(ctx) {
  const out = {};
  for (const id of ['SPX', 'USDIDR']) {
    try {
      const h = await getHistory(ctx, id); const pts = (h.points || []).filter(p => Number.isFinite(p[1]) && p[1] > 0);
      if (pts.length < 300) continue;
      const v = pts.map(p => p[1]); const spot = v[v.length - 1];
      const lr = []; for (let i = Math.max(1, v.length - 252); i < v.length; i++) lr.push(Math.log(v[i] / v[i - 1]));
      const m = lr.reduce((a, b) => a + b, 0) / lr.length; const vol = Math.sqrt(lr.reduce((a, b) => a + (b - m) ** 2, 0) / (lr.length - 1) * 252);
      const dist = (n) => { const ch = []; for (let i = n; i < v.length; i++) ch.push((v[i] / v[i - n] - 1) * 100); ch.sort((a, b) => a - b); const q = (p) => ch[Math.min(ch.length - 1, Math.max(0, Math.round(p * (ch.length - 1))))]; return { n, from: pts[0][0], q: QS.map(p => +q(p).toFixed(2)), cdf: Array.from({ length: 101 }, (_, i) => +q(i / 100).toFixed(2)) }; };
      out[id] = { spot: +spot.toFixed(id === 'SPX' ? 1 : 0), asOf: pts[pts.length - 1][0], vol1y: +(vol * 100).toFixed(1), m3: dist(63), m6: dist(126) };
    } catch (e) {}
  }
  return out;
}
const anchorText = (q) => Object.entries(q).map(([id, a]) => `${id}: spot ${a.spot} (${a.asOf}), realised vol 1Y ${a.vol1y}% a year. % change over 3 months since ${a.m3.from}, percentiles ${QS.map((p, i) => `p${Math.round(p * 100)} ${a.m3.q[i]}`).join(', ')}. Over 6 months: ${QS.map((p, i) => `p${Math.round(p * 100)} ${a.m6.q[i]}`).join(', ')}.`).join('\n');

async function getDoc(ctx, key) { try { if (ctx.env.__store) { const v = await ctx.env.__store.getJSON(key, { maxAgeMs: 60e3 }); if (v) return v; } } catch (e) {} const c = await ctx.cache.read('doc:' + key); return c ? c.data : null; }
async function putDoc(ctx, key, v) { if (ctx.env.__store && ctx.env.__store.persistent) await ctx.env.__store.putJSON(key, v); else await ctx.cache.write('doc:' + key, { data: v, fetchedAt: Date.now() }, 60 * 86400); }

export async function refreshOutlook(ctx, { model, trigger = 'admin' } = {}) {
  const key = ctx.config.keys.ANTHROPIC_API_KEY; if (!key) throw new Error('Anthropic key not configured');
  const [g, quant] = await Promise.all([gather(ctx), quantAnchors(ctx)]);
  const prev = await getDoc(ctx, DOC);
  const user = `QUANT ANCHORS (computed from daily closes):\n${anchorText(quant) || '(not available)'}\n\nMEASURED INPUTS (this dashboard):\n${JSON.stringify(g.inputs, null, 1)}\n\nCREDIT, BONDS AND EPISODE SCORES:\n${JSON.stringify(g.summary, null, 1)}\n\nHEADLINES (by theme):\n${g.news.length ? g.news.map(n => `[${n.n}] (${n.theme}) ${n.title} (${n.published || 'n.d.'}) ${n.url}\n${n.snippet || ''}`).join('\n\n') : '(no headlines available)'}${g.newsNotes.length ? `\n\nSearch notes: ${g.newsNotes.join('; ')}` : ''}\n\n${prev && prev.ai ? `PREVIOUS OUTLOOK (${prev.generatedAt}): probabilities ${prev.ai.scenarios.map(s => `${s.id} ${s.probability}%`).join(', ')}; stance ${prev.ai.stance}. Move them only for reasons visible in today's inputs or headlines, and say what moved in the headline if anything did.` : ''}\n\nWrite today's outlook.`;
  const r = await callClaudeJson(key, { model: model || intelModel(ctx.config), system: SYSTEM, user, tag: 'market outlook', maxTokens: 20000 });
  const ai = normalise(r.json);
  const changes = prev && prev.ai ? { previousAt: prev.generatedAt, previousStance: prev.ai.stance, deltas: ai.scenarios.map(s => { const p = prev.ai.scenarios.find(x => x.id === s.id); return { id: s.id, from: p ? p.probability : null, to: s.probability, delta: p ? s.probability - p.probability : null }; }) } : null;
  const doc = { generatedAt: new Date().toISOString(), trigger, model: r.model, usage: r.usage, ai, news: g.news.map(n => ({ n: n.n, title: n.title, url: n.url, theme: n.theme, published: n.published })), newsNotes: g.newsNotes, changes, quant, snapshot: { spx: (g.inputs.performance.find(p => p.id === 'SPX') || {}).price, vix: (g.inputs.performance.find(p => p.id === 'VIX') || {}).price, regime: g.inputs.regime.label, stress: g.inputs.stress, credit: g.summary.credit && g.summary.credit.overall } };
  await putDoc(ctx, DOC, doc);
  try { await putDoc(ctx, ARCHIVE + doc.generatedAt.slice(0, 10), { generatedAt: doc.generatedAt, stance: ai.stance, probabilities: Object.fromEntries(ai.scenarios.map(s => [s.id, s.probability])), headline: ai.headline, snapshot: doc.snapshot }); } catch (e) {}
  return doc;
}

export async function getOutlook(ctx) {
  const doc = await getDoc(ctx, DOC);
  let history = [];
  try { if (ctx.env.__store) { const keys = (await ctx.env.__store.list(ARCHIVE)).map(x => x.key).sort().slice(-30); history = (await Promise.all(keys.map(k => ctx.env.__store.getJSON(k).catch(() => null)))).filter(Boolean); } } catch (e) {}
  const ageH = doc ? (Date.now() - new Date(doc.generatedAt).getTime()) / 36e5 : null;
  return { outlook: doc, history, stale: ageH != null && ageH > 30, schedule: ctx.config.keys.OUTLOOK_SCHEDULE || 'daily', configured: !!ctx.config.keys.ANTHROPIC_API_KEY };
}

/** Daily job: refresh when scheduled and not already done in the last 20 hours. */
export async function scheduledOutlook(ctx) {
  if ((ctx.config.keys.OUTLOOK_SCHEDULE || 'daily') === 'off') return { skipped: 'outlook schedule is off' };
  if (!ctx.config.keys.ANTHROPIC_API_KEY) return { skipped: 'no Anthropic key' };
  const cur = await getDoc(ctx, DOC);
  if (cur && Date.now() - new Date(cur.generatedAt).getTime() < 20 * 36e5) return { skipped: 'refreshed in the last 20 hours' };
  const d = await refreshOutlook(ctx, { trigger: 'schedule' });
  return { refreshed: d.generatedAt, stance: d.ai.stance, probabilities: Object.fromEntries(d.ai.scenarios.map(s => [s.id, s.probability])) };
}
