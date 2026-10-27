// Capital Flow Terminal — Cloudflare Worker entry point (also runs under local/server.mjs).
import { createCache } from './lib/cache.js';
import { getConfig, checkAdminAuth, saveAdminKeys, loadAdminKeys, CREDENTIAL_FIELDS, maskSecret } from './lib/config.js';
import { json, error, WINDOWS } from './lib/util.js';
import { ASSETS, CLASSES, SIZE_REFERENCES } from './universe.js';
import { getQuotes, getHistory, getSizes, SOURCES } from './data.js';
import * as A from './analytics.js';
import { flows } from './flows.js';
import { intelligence } from './ai.js';
import * as R from './risk.js';

// CORS so the published artifact (or any front-end) can call this API.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };

function ctxFor(env, config) { return { env, config, cache: createCache(env) }; }

function parseIds(url, fallback) {
  const s = url.searchParams.get('ids');
  if (!s) return fallback;
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

async function handleApi(request, env, url) {
  const config = await getConfig(env);
  const ctx = ctxFor(env, config);
  const p = url.pathname.replace(/^\/api/, '');
  const started = Date.now();
  const wrap = (data) => json({ ok: true, demoMode: config.demoMode, generatedAt: new Date().toISOString(), ms: Date.now() - started, ...data });

  try {
    if (p === '/health') return wrap({ app: config.appName, sources: Object.values(SOURCES), adminConfigured: config.adminConfigured, keysConfigured: Object.fromEntries(Object.entries(config.keys).map(([k, v]) => [k, !!v])) });

    if (p === '/universe') return wrap({ assets: ASSETS.map(a => ({ id: a.id, name: a.name, cls: a.cls, region: a.region, kind: a.kind, unit: a.unit, source: a.source, symbol: a.symbol, freshness: a.freshness })), classes: CLASSES, sources: SOURCES, windows: Object.keys(WINDOWS), shockDrivers: A.SHOCK_DRIVERS });

    if (p === '/quotes') return wrap({ quotes: await getQuotes(ctx, parseIds(url, null)) });

    if (p === '/history') {
      const id = url.searchParams.get('id'); if (!id) return error('id required', 400);
      const h = await getHistory(ctx, id);
      const days = WINDOWS[url.searchParams.get('window') || ''] || null;
      const pts = days ? A.windowSlice(h.points, days) : h.points;
      return wrap({ id, source: h.source, freshness: h.freshness, stale: h.stale, error: h.error || null, coverageNote: h.coverageNote || null, from: pts[0] ? pts[0][0] : null, to: pts.length ? pts[pts.length - 1][0] : null, n: pts.length, points: pts, volumes: h.volumes ? A.windowSlice(h.volumes, days || 1e9) : undefined, marketCaps: h.marketCaps ? A.windowSlice(h.marketCaps, days || 1e9) : undefined });
    }

    if (p === '/performance') return wrap({ rows: await A.performance(ctx, parseIds(url, null)) });

    if (p === '/overview') {
      const quotes = await getQuotes(ctx, null);
      const [sizes, reg] = await Promise.all([getSizes(ctx, quotes), A.regime(ctx)]);
      return wrap({ sizes, regime: reg, quotes });
    }

    if (p === '/analytics/correlation') return wrap(await A.correlation(ctx, parseIds(url, ['SPX', 'NDX', 'SX5E', 'NKY', 'EEM', 'UST10Y', 'TLT', 'HYG', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'DXY', 'VIX']), url.searchParams.get('window') || '30D'));
    if (p === '/analytics/rolling') { const a = url.searchParams.get('a') || 'SPX', b = url.searchParams.get('b') || 'UST10Y'; return wrap(await A.rolling(ctx, a, b, url.searchParams.get('window') || '1Y', Number(url.searchParams.get('lookback') || 30))); }
    if (p === '/analytics/relative') return wrap(await A.relative(ctx, parseIds(url, ['SPX', 'EEM', 'BTC', 'GOLD', 'TLT', 'DXY']), url.searchParams.get('window') || '1Y'));
    if (p === '/analytics/regime') return wrap(await A.regime(ctx));

    if (p === '/flows') return wrap(await flows(ctx));

    if (p === '/intel/anomalies') return wrap(await A.anomalies(ctx, parseIds(url, ASSETS.filter(a => a.cls !== 'macro' || a.id === 'VIX').map(a => a.id))));
    if (p === '/intel/patterns') return wrap(await A.patterns(ctx));
    if (p === '/risk/table') return wrap(await R.riskTable(ctx));
    if (p === '/risk/stress') return wrap(await R.stressIndex(ctx, Number(url.searchParams.get('years') || 2)));
    if (p === '/risk/inflections') return wrap(await R.inflections(ctx));
    if (p === '/risk/trend') return wrap(await R.trend(ctx, url.searchParams.get('id') || 'SPX', url.searchParams.get('window') || '1Y'));
    if (p === '/analytics/leaders') return wrap(await R.leaders(ctx, url.searchParams.get('anchor') || 'SPX'));
    if (p === '/intel/explain') {
      let body = {}; if (request.method === 'POST') { try { body = await request.json(); } catch (e) {} }
      return wrap(await intelligence(ctx, { ids: body.ids, question: body.question }));
    }

    if (p === '/shock/betas') {
      const driver = url.searchParams.get('driver') || 'SPX';
      const targets = parseIds(url, ['SPX', 'NDX', 'RUT', 'SX5E', 'NKY', 'EEM', 'UST2Y', 'UST10Y', 'TLT', 'LQD', 'HYG', 'EMB', 'BTC', 'ETH', 'SOL', 'GOLD', 'SILVER', 'WTI', 'COPPER', 'DXY', 'EURUSD', 'USDJPY', 'VIX']);
      return wrap(await A.betas(ctx, driver, targets, url.searchParams.get('window') || '1Y'));
    }

    // ── Admin ──
    if (p.startsWith('/admin')) {
      const auth = checkAdminAuth(request, env);
      if (!auth.ok) return error(auth.reason, 401);
      if (p === '/admin/keys' && request.method === 'GET') {
        const saved = await loadAdminKeys(env);
        return wrap({ fields: CREDENTIAL_FIELDS.map(f => ({ ...f, value: f.secret === false ? (saved[f.key] || env[f.key] || '') : maskSecret(saved[f.key] || env[f.key] || ''), fromEnv: !saved[f.key] && !!env[f.key], configured: !!(saved[f.key] || env[f.key]) })) });
      }
      if (p === '/admin/keys' && request.method === 'POST') {
        const body = await request.json();
        await saveAdminKeys(env, body);
        return wrap({ saved: Object.keys(body) });
      }
      if (p === '/admin/sizes' && request.method === 'GET') { let o = {}; try { o = (await env.CACHE.get('admin:sizes', 'json')) || {}; } catch (e) {} return wrap({ references: SIZE_REFERENCES.map(r => ({ id: r.id, label: r.label, measure: r.measure, usd: r.usd, tonnes: r.tonnes, source: r.source, asOf: r.asOf, override: o[r.id] || null })) }); }
      if (p === '/admin/sizes' && request.method === 'POST') { const body = await request.json(); await env.CACHE.put('admin:sizes', JSON.stringify(body)); return wrap({ saved: true }); }
      if (p === '/admin/cache/clear' && request.method === 'POST') {
        // KV has no cheap "delete all"; we invalidate by bumping nothing — instead list & delete our prefix.
        let n = 0; try { let cursor; do { const l = await env.CACHE.list({ prefix: 'cache:', cursor }); for (const k of l.keys) { await env.CACHE.delete(k.name); n++; } cursor = l.list_complete ? null : l.cursor; } while (cursor); } catch (e) {}
        return wrap({ cleared: n });
      }
      if (p === '/admin/status') {
        const quotes = await getQuotes(ctx, null);
        const bySource = {};
        for (const q of quotes) { const s = bySource[q.source] || (bySource[q.source] = { ok: 0, failed: 0, stale: 0, errors: [] }); if (q.available) s.ok++; else { s.failed++; if (q.error && s.errors.length < 3) s.errors.push(`${q.id}: ${q.error}`); } if (q.stale) s.stale++; }
        return wrap({ bySource, demoMode: config.demoMode, kv: !!env.CACHE, d1: !!env.HISTORY });
      }
      return error('Not found', 404);
    }
    return error('Not found', 404);
  } catch (e) {
    return error(e.message || String(e), 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      const res = await handleApi(request, env, url);
      for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
      return res;
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Static assets binding missing', { status: 500 });
  },

  // Cron: warm the quote + history caches so page loads are fast and rate limits are respected.
  async scheduled(event, env, ctx) {
    const config = await getConfig(env);
    const c = ctxFor(env, config);
    ctx.waitUntil((async () => {
      try { await getQuotes(c, null); await A.regime(c); } catch (e) { console.log('warm failed', e.message); }
    })());
  },
};
