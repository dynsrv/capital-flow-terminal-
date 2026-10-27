// AI Market Intelligence. The model is given ONLY measured inputs (anomalies, performance table,
// regime, pattern checks and — if a search key is configured — recent news snippets) and must
// return a structured Signal → Evidence → Possible Cause → Cross-Asset Impact → Confidence → What to Watch.
// Without an Anthropic key the endpoint returns the measured inputs with an explicit "AI not configured" flag.
import { fetchJSON } from './lib/util.js';
import { anomalies, regime, patterns, performance } from './analytics.js';
import { preCrash } from './precrash.js';
import { stressIndex } from './risk.js';

const SYSTEM = `You are a sell-side cross-asset strategist writing for an institutional terminal.
Rules:
- Use ONLY the numbers provided in the input. Never invent prices, flows, or statistics.
- Separate clearly: VERIFIED FACTS (from the input data), HISTORICAL RELATIONSHIPS (well-known, cite the episode), HYPOTHESES (your inference, hedged), SCENARIOS (conditional).
- Do not assert causation unless the evidence supports it; say "consistent with" or "one hypothesis is".
- If news snippets are provided, cite them by their [n] index; if none, say evidence is price/volatility-based only.
- Draw on lessons from Black Monday 1987, the dot-com bust 2000-02 and the 2008 subprime crisis where the pre-crash condition checks show resemblance; otherwise do not force the analogy. Pre-crash conditions (what was in place before each peak) matter more than crash signatures (what the crash itself looked like).
- Confidence: Low / Medium / High with one-line justification.
Return strict JSON: {"findings":[{"signal":"","evidence":["..."],"possibleCause":"","crossAssetImpact":"","confidence":"Low|Medium|High","confidenceWhy":"","whatToWatch":["..."],"classification":{"verifiedFacts":["..."],"historicalRelationships":["..."],"hypotheses":["..."],"scenarios":["..."]},"citations":[1,2]}],"overview":"2-3 sentence summary of what is changing and why it matters"}`;

export async function exaSearch(key, query, n = 6) {
  const j = await fetchJSON('https://api.exa.ai/search', { method: 'POST', timeoutMs: 20000, headers: { 'x-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ query, numResults: n, type: 'auto', contents: { highlights: true }, startPublishedDate: new Date(Date.now() - 7 * 86400e3).toISOString() }) });
  return (j.results || []).map((r, i) => ({ n: i + 1, title: r.title, url: r.url, snippet: (r.highlights || []).join(' ').slice(0, 600), published: r.publishedDate || null, provider: 'exa' }));
}
export async function parallelSearch(key, query, n = 6) {
  const j = await fetchJSON('https://api.parallel.ai/v1/search', { method: 'POST', timeoutMs: 25000, headers: { 'x-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ objective: query, search_queries: [query], mode: 'fast', advanced_settings: { max_results: n } }) });
  return (j.results || []).slice(0, n).map((r, i) => ({ n: i + 1, title: r.title, url: r.url, snippet: (r.excerpts || []).join(' ').slice(0, 600), published: r.publish_date || null, provider: 'parallel' }));
}

async function searchNews(config, query) {
  const k = config.keys; const pref = (k.SEARCH_PROVIDER || 'auto').toLowerCase();
  const order = pref === 'parallel' ? ['parallel', 'exa'] : ['exa', 'parallel'];
  const avail = order.filter(p => (p === 'exa' ? k.EXA_API_KEY : k.PARALLEL_API_KEY));
  if (!avail.length) return { items: [], note: 'No search key configured; evidence is price and volatility data only.' };
  const errors = [];
  for (const p of (pref === 'auto' ? avail : avail.slice(0, 1))) {
    try { const items = p === 'exa' ? await exaSearch(k.EXA_API_KEY, query) : await parallelSearch(k.PARALLEL_API_KEY, query); return { items, provider: p }; }
    catch (e) { errors.push(`${p}: ${e.message}`); }
  }
  return { items: [], note: `Search failed (${errors.join('; ')})` };
}

export async function intelligence(ctx, { ids, question, model } = {}) {
  const { config } = ctx;
  const universeIds = ids && ids.length ? ids : ['SPX', 'NDX', 'RUT', 'SX5E', 'NKY', 'SHCOMP', 'EEM', 'UST2Y', 'UST10Y', 'T10Y2Y', 'HYOAS', 'IGOAS', 'BTC', 'ETH', 'SOL', 'GOLD', 'SILVER', 'WTI', 'NATGAS', 'COPPER', 'DXY', 'USDJPY', 'VIX'];
  const [an, reg, pat, perf, pre] = await Promise.all([anomalies(ctx, universeIds), regime(ctx), patterns(ctx), performance(ctx, universeIds), preCrash(ctx).catch(() => null)]);
  const inputs = {
    asOf: new Date().toISOString(),
    regime: { label: reg.label, score: reg.score, components: reg.components.map(c => c.detail) },
    anomalies: an.items.slice(0, 12),
    crashSignatures: pat.items.map(p => ({ episode: p.name, hits: `${p.hits}/${p.total}`, present: p.checks.filter(c => c.hit).map(c => c.label) })),
    preCrashConditions: pre ? { lateCycleChecklist: { present: pre.common.present, absent: pre.common.absent }, episodes: pre.episodes.map(e => ({ episode: e.name, measuredHits: `${e.hits}/${e.measured}`, present: e.conditions.filter(c => c.hit).map(c => `${c.label} (now: ${c.now})`), notMeasured: e.conditions.filter(c => !c.measured).map(c => c.label) })) } : null,
    stress: await stressIndex(ctx).then(x => ({ latest: x.latest, level: x.level })).catch(() => null),
    performance: perf.map(r => ({ id: r.id, name: r.name, price: r.price, pct1d: r.pct1d, d7: r.perf['7D'], d30: r.perf['30D'], ytd: r.perf.YTD, vol30: r.vol['30D'], dd1y: r.maxDrawdown1Y, freshness: r.freshness, asOf: r.asOf })),
  };
  const result = { inputs, anomalies: an, regime: reg, patterns: pat, ai: null, news: null };

  const apiKey = config.keys.ANTHROPIC_API_KEY;
  if (!apiKey) { result.aiStatus = { configured: false, message: 'ANTHROPIC_API_KEY not configured — showing measured anomalies, regime and pattern checks only. Add the key in Admin to enable AI explanations.' }; return result; }

  const topMovers = an.items.slice(0, 3).map(a => a.name).join(', ');
  const query = question || (topMovers ? `markets news ${topMovers} this week` : 'global markets this week stocks bonds crypto');
  const news = await searchNews(config, query);
  result.news = news;

  const userMsg = `INPUT DATA (measured):\n${JSON.stringify(inputs, null, 1)}\n\nNEWS SNIPPETS:\n${news.items.length ? news.items.map(n => `[${n.n}] ${n.title} (${n.published || 'n.d.'}) ${n.url}\n${n.snippet}`).join('\n\n') : '(none)'}\n\n${question ? `USER QUESTION: ${question}\n` : ''}Produce 2-5 findings, most significant first.`;
  try {
    const j = await fetchJSON('https://api.anthropic.com/v1/messages', {
      method: 'POST', timeoutMs: 60000,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: model || config.keys.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 2500, system: SYSTEM, messages: [{ role: 'user', content: userMsg }] }),
    });
    const text = (j.content || []).map(c => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    let parsed = null; try { parsed = JSON.parse(m ? m[0] : text); } catch (e) { parsed = { overview: text, findings: [] }; }
    result.ai = parsed; result.aiStatus = { configured: true, model: j.model, usage: j.usage };
  } catch (e) { result.aiStatus = { configured: true, error: e.message }; }
  return result;
}
