// Builds a single-file version of the terminal (dist/terminal.html) with an embedded snapshot of
// live data captured from a running instance. The page prefers a connected Worker URL; otherwise it
// serves the snapshot, clearly bannered with its capture time.
//   node local/build-artifact.mjs [baseUrl=http://localhost:8787]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || 'http://localhost:8787';

const universe = await (await fetch(base + '/api/universe')).json();
const ids = universe.assets.map(a => a.id);
const CORR_DEFAULT = 'SPX,NDX,SX5E,NKY,EEM,UST10Y,TLT,HYG,BTC,ETH,GOLD,WTI,COPPER,DXY,VIX';
const REL_DEFAULT = 'SPX,EEM,BTC,GOLD,TLT,DXY';
const ANCHORS = ['SPX', 'NDX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'HYOAS', 'EEM', 'COPPER', 'USDJPY', 'VIX'];
const routes = ['/news', '/tv/streams', '/universe', '/performance', '/overview', '/analytics/regime', '/flows', '/intel/anomalies', '/intel/patterns', '/risk/stress', '/risk/table', '/risk/inflections', '/risk/highlights', '/intel/precrash', '/intel/reading',
  ...ANCHORS.map(a => `/analytics/leaders?anchor=${a}`),
  ...['7D', '30D', '90D', '1Y', '5Y'].map(w => `/analytics/correlation?window=${w}&ids=${CORR_DEFAULT}`),
  ...['90D', '1Y', '5Y', '10Y'].map(w => `/analytics/relative?window=${w}&ids=${REL_DEFAULT}`),
  ...['1Y', '5Y', '10Y'].map(w => `/analytics/rolling?a=SPX&b=UST10Y&window=${w}`),
  ...universe.shockDrivers.flatMap(d => ['180D', '1Y', '5Y', '10Y'].map(w => `/shock/betas?driver=${d.id}&window=${w}`)),
  ...ids.flatMap(id => ['30D', '90D', '1Y'].map(w => `/history?id=${id}&window=${w}`)),
];
// trend charts for every instrument in the risk universe (1Y) — added after we know the signal list
const riskIds = (await (await fetch(base + '/api/risk/table')).json()).rows.map(r => r.id);
routes.push(...riskIds.map(id => `/risk/trend?id=${id}&window=1Y`), ...['SPX', 'NDX', 'GOLD', 'BTC', 'UST10Y', 'DXY', 'WTI'].flatMap(id => ['5Y', '10Y'].map(w => `/risk/trend?id=${id}&window=${w}`)));
const key = (p) => p.split('?')[0] + '?' + (p.split('?')[1] || '').split('&').filter(Boolean).sort().join('&');
const data = {};
for (const r of routes) {
  const j = await (await fetch(base + '/api' + r)).json();
  if (!j.ok) { console.log('skip', r, j.error); continue; }
  if (r.startsWith('/history')) { delete j.volumes; delete j.marketCaps; j.points = j.points.map(([d, v]) => [d, Number(v.toPrecision(6))]); }
  if (r.startsWith('/risk/trend') && !r.includes('1Y')) { const k = (a) => a.filter((_, i) => i % 3 === 0 || i === a.length - 1); j.price = k(j.price); j.ma50 = k(j.ma50); j.ma200 = k(j.ma200); }
  data[key(r)] = j;
}
const snapshot = { capturedAt: new Date().toISOString(), data };
console.log(`captured ${Object.keys(data).length} responses, ${(JSON.stringify(snapshot).length / 1e6).toFixed(2)} MB`);

const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
let css = fs.readFileSync(path.join(ROOT, 'public/app.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');

// Body-only content for the artifact skeleton: title + style + markup + scripts.
const bodyInner = html.split('<body>')[1].split('</body>')[0]
  .replace('<script src="/app.js"></script>', '')
  .replace('<div id="snapshot-banner"', '<div id="snapshot-banner"');
const out = `<title>Capital Flow Terminal</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style>
<script>try { document.documentElement.dataset.theme = localStorage.getItem('cft:theme') || 'dark'; } catch (e) { document.documentElement.dataset.theme = 'dark'; }</script>
<script>${fs.readFileSync(path.join(ROOT, 'public/vendor/echarts.min.js'), 'utf8')}</script>
${bodyInner}
<script>window.CFT_SNAPSHOT = ${JSON.stringify(snapshot)};</script>
<script>${js}</script>
`;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/terminal.html'), out);
console.log('wrote dist/terminal.html', (out.length / 1e6).toFixed(2), 'MB');
