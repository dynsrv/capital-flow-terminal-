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
const routes = ['/universe', '/performance', '/overview', '/analytics/regime', '/flows', '/intel/anomalies', '/intel/patterns',
  ...['7D', '30D', '90D', '180D', '1Y', '5Y', '10Y'].map(w => `/analytics/correlation?window=${w}&ids=${CORR_DEFAULT}`),
  ...['30D', '90D', '180D', '1Y', '5Y', '10Y'].map(w => `/analytics/relative?window=${w}&ids=${REL_DEFAULT}`),
  ...['1Y', '5Y', '10Y'].map(w => `/analytics/rolling?a=SPX&b=UST10Y&window=${w}`),
  ...universe.shockDrivers.flatMap(d => ['180D', '1Y', '5Y', '10Y'].map(w => `/shock/betas?driver=${d.id}&window=${w}`)),
  ...ids.flatMap(id => ['30D', '90D', '1Y'].map(w => `/history?id=${id}&window=${w}`)),
];
const key = (p) => p.split('?')[0] + '?' + (p.split('?')[1] || '').split('&').filter(Boolean).sort().join('&');
const data = {};
for (const r of routes) {
  const j = await (await fetch(base + '/api' + r)).json();
  if (!j.ok) { console.log('skip', r, j.error); continue; }
  if (r.startsWith('/history')) { delete j.volumes; delete j.marketCaps; j.points = j.points.map(([d, v]) => [d, Number(v.toPrecision(6))]); }
  data[key(r)] = j;
}
const snapshot = { capturedAt: new Date().toISOString(), data };
console.log(`captured ${Object.keys(data).length} responses, ${(JSON.stringify(snapshot).length / 1e6).toFixed(2)} MB`);

const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
let css = fs.readFileSync(path.join(ROOT, 'public/app.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');

// Theme contract for the artifact host: dark is the design default; honour system light + explicit light/dark.
const lightBlock = css.match(/:root\[data-theme="light"\] \{([^}]*)\}/)[1];
css = css.replace(':root {', ':root { color-scheme: dark;')
  .replace(':root[data-theme="light"] {', `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { color-scheme: light;${lightBlock} } }\n:root[data-theme="light"] { color-scheme: light;`)
  .replace('html, body { margin: 0; background: var(--bg);', 'html { height: 100%; } body { margin: 0; background: var(--bg);')
  .replace('.topbar { display: flex;', '.topbar { top: env(safe-area-inset-top, 0px); display: flex;');

// Body-only content for the artifact skeleton: title + style + markup + scripts.
const bodyInner = html.split('<body>')[1].split('</body>')[0]
  .replace('<script src="/app.js"></script>', '')
  .replace('<div id="snapshot-banner"', '<div id="snapshot-banner"');
const out = `<title>Capital Flow Terminal</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}
body { padding-left: max(0px, env(safe-area-inset-left, 0px)); padding-right: max(0px, env(safe-area-inset-right, 0px)); }
main { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 10px 16px; }
</style>
<script>${fs.readFileSync(path.join(ROOT, 'public/vendor/echarts.min.js'), 'utf8')}</script>
${bodyInner}
<script>window.CFT_SNAPSHOT = ${JSON.stringify(snapshot)};</script>
<script>${js}</script>
`;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/terminal.html'), out);
console.log('wrote dist/terminal.html', (out.length / 1e6).toFixed(2), 'MB');
