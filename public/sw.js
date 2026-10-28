// Service worker: keeps the terminal usable on a flaky connection.
//   shell (HTML, CSS, JS, chart library)  stale-while-revalidate: opens instantly, refreshes in the background
//   public API reads                      network first; if the network fails, the last good answer is served and
//                                         marked with x-cft-offline so the page can say it is showing saved data
//   live prices, admin, sign-in, TV relay never cached
const VERSION = 'cft-v1';
const SHELL = ['/', '/app.css', '/app.js', '/glossary.js', '/vendor/echarts.min.js'];
const NO_CACHE = /^\/api\/(rt|admin|auth|hls|cron)(\/|$)/;

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION + ':shell').then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

async function networkFirst(req) {
  const cache = await caches.open(VERSION + ':api');
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(req, { signal: ctrl.signal }); clearTimeout(t);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (!hit) throw err;
    const h = new Headers(hit.headers); h.set('x-cft-offline', '1');
    return new Response(await hit.blob(), { status: 200, headers: h });
  }
}
async function staleWhileRevalidate(req, key) {
  const cache = await caches.open(VERSION + ':shell');
  const hit = await cache.match(key || req);
  const net = fetch(req).then(res => { if (res.ok) cache.put(key || req, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return hit || (await net) || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) { if (NO_CACHE.test(url.pathname) || req.headers.get('authorization')) return; e.respondWith(networkFirst(req)); return; }
  if (req.mode === 'navigate') { e.respondWith(staleWhileRevalidate(req, '/')); return; }
  if (/\.(css|js)$/.test(url.pathname)) e.respondWith(staleWhileRevalidate(req));
});
