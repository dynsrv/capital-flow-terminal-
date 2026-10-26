// Smoke test: hits every public API route and prints source health. Usage: node local/check.mjs [baseUrl]
const base = process.argv[2] || 'http://localhost:8787';
const routes = ['/api/health', '/api/universe', '/api/quotes', '/api/performance', '/api/overview', '/api/history?id=SPX&window=1Y', '/api/analytics/correlation?window=30D', '/api/analytics/rolling?a=SPX&b=UST10Y', '/api/analytics/relative', '/api/analytics/regime', '/api/flows', '/api/intel/anomalies', '/api/intel/patterns', '/api/shock/betas?driver=SPX'];
let fail = 0;
for (const r of routes) {
  const t = Date.now();
  try { const j = await (await fetch(base + r)).json(); if (!j.ok) throw new Error(j.error); console.log(`OK   ${r} (${Date.now() - t} ms)`); if (r === '/api/quotes') { const by = {}; for (const q of j.quotes) { const s = by[q.source] ||= { ok: 0, bad: 0, stale: 0 }; q.available ? s.ok++ : s.bad++; if (q.stale) s.stale++; if (!q.available) console.log(`     unavailable: ${q.id} — ${q.error}`); } console.log('     sources:', JSON.stringify(by)); } }
  catch (e) { fail++; console.log(`FAIL ${r}: ${e.message}`); }
}
console.log(fail ? `${fail} route(s) failed` : 'all routes OK');
process.exit(fail ? 1 : 0);
