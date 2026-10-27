// Capital Flow Terminal — Cloudflare Worker entry point (also runs under local/server.mjs).
import { createCache } from './lib/cache.js';
import { createStore } from './lib/store.js';
import { getConfig, checkAdminAuth, saveAdminKeys, loadAdminKeys, CREDENTIAL_FIELDS, maskSecret } from './lib/config.js';
import { json, error, WINDOWS } from './lib/util.js';
import { ASSETS, CLASSES, SIZE_REFERENCES } from './universe.js';
import { getQuotes, getHistory, getSizes, SOURCES, persistHistories } from './data.js';
import * as A from './analytics.js';
import { flows } from './flows.js';
import { intelligence } from './ai.js';
import * as R from './risk.js';
import * as I from './insights.js';
import { testCredential } from './keytest.js';
import { preCrash } from './precrash.js';
import { getReading, refreshReading, scheduledRefresh, listModels, listReadings } from './reading.js';
import { fetchNews, curateNews, getCurated, SOURCES as NEWS_SOURCES } from './news.js';
import { getStreams, saveStreams, resetStreams, DEFAULT_STREAMS } from './tv.js';

// CORS so the published artifact (or any front-end) can call this API.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };

function ctxFor(env, config) { return { env, config, cache: createCache(env) }; }
function withStore(env) { if (!env.__store) { try { env.__store = createStore(env); } catch (e) { env.__store = null; } } return env; }

// CDN cache policy for public GET routes (seconds). Admin, cron and POST routes are never cached.
const CDN_TTL = [[/^\/quotes/, 30], [/^\/performance|^\/overview|^\/analytics\/regime|^\/news|^\/tv/, 120], [/^\/history/, 600], [/^\/analytics|^\/shock|^\/flows/, 300], [/^\/risk|^\/intel/, 300], [/^\/universe|^\/health/, 60]];
function cdnHeaders(p, method) { if (method !== 'GET' || p.startsWith('/admin') || p.startsWith('/cron')) return {}; const hit = CDN_TTL.find(([re]) => re.test(p)); return hit ? { 'cache-control': `public, s-maxage=${hit[1]}, stale-while-revalidate=${hit[1] * 4}` } : {}; }

/** Daily state snapshot: what the dashboard itself read today (quotes, regime, stress, anomalies, signals). */
async function dailySnapshot(ctx) {
  const store = ctx.env.__store; if (!store || !store.persistent) return { skipped: 'no persistent store' };
  const [quotes, reg, st, an] = await Promise.all([getQuotes(ctx, null), A.regime(ctx), R.stressIndex(ctx).catch(() => null), A.anomalies(ctx, ASSETS.filter(a => a.cls !== 'macro' || a.id === 'VIX').map(a => a.id))]);
  const day = new Date().toISOString().slice(0, 10);
  await store.putJSON('snap/' + day, { day, savedAt: new Date().toISOString(), quotes: quotes.map(q => ({ id: q.id, price: q.price, pct1d: q.pct1d, asOf: q.asOf, source: q.source })), regime: { label: reg.label, score: reg.score }, stress: st ? { latest: st.latest, level: st.level } : null, anomalies: an.items.map(x => ({ id: x.id, z1: x.z1, z5: x.z5, severity: x.severity })) });
  return { snapshot: day };
}

function parseIds(url, fallback) {
  const s = url.searchParams.get('ids');
  if (!s) return fallback;
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

async function handleApi(request, env, url) {
  withStore(env);
  const config = await getConfig(env);
  const ctx = ctxFor(env, config);
  const p = url.pathname.replace(/^\/api/, '');
  const started = Date.now();
  const wrap = (data) => json({ ok: true, demoMode: config.demoMode, generatedAt: new Date().toISOString(), ms: Date.now() - started, ...data }, 200, cdnHeaders(p, request.method));

  try {
    if (p === '/health') return wrap({ app: config.appName, sources: Object.values(SOURCES), adminConfigured: config.adminConfigured, store: env.__store ? { backend: env.__store.name, persistent: env.__store.persistent } : null, keysConfigured: Object.fromEntries(Object.entries(config.keys).map(([k, v]) => [k, !!v])) });

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

    if (p === '/intel/anomalies') { const an = await A.anomalies(ctx, parseIds(url, ASSETS.filter(a => a.cls !== 'macro' || a.id === 'VIX').map(a => a.id))); return wrap(url.searchParams.get('analysis') === '0' ? an : await I.annotateAnomalies(ctx, an)); }
    if (p === '/intel/patterns') return wrap(await A.patterns(ctx));
    if (p === '/intel/precrash') return wrap(await preCrash(ctx));
    if (p === '/risk/table') { const t = await R.riskTable(ctx); t.rows.forEach(r => { r.reading = I.rowReading(r); }); return wrap(t); }
    if (p === '/risk/highlights') return wrap(await I.riskHighlights(ctx));
    if (p === '/risk/stress') return wrap(await R.stressIndex(ctx, Number(url.searchParams.get('years') || 2)));
    if (p === '/risk/inflections') return wrap(await I.annotateSignals(ctx, await R.inflections(ctx)));
    if (p === '/risk/trend') return wrap(await R.trend(ctx, url.searchParams.get('id') || 'SPX', url.searchParams.get('window') || '1Y'));
    if (p === '/analytics/leaders') return wrap(await R.leaders(ctx, url.searchParams.get('anchor') || 'SPX'));
    if (p === '/intel/reading') return wrap(await getReading(ctx));
    if (p === '/news') { const [feed, curated] = await Promise.all([fetchNews(ctx), getCurated(ctx)]); return wrap({ ...feed, curated, aiCuration: (config.keys.NEWS_AI_CURATION || 'off') !== 'off' }); }
    if (p === '/tv/streams') return wrap(await getStreams(ctx));
    if (p === '/intel/explain') {
      // Model calls cost money: admin only. Visitors read the stored reading from /intel/reading.
      const auth = checkAdminAuth(request, env); if (!auth.ok) return error('Refreshing the AI reading requires the admin token', 401);
      let body = {}; try { body = await request.json(); } catch (e) {}
      return wrap(await intelligence(ctx, { ids: body.ids, question: body.question, model: body.model }));
    }
    if (p === '/cron/refresh') {
      const secret = env.CRON_SECRET; const auth = request.headers.get('authorization') || '';
      const okCron = secret && auth === `Bearer ${secret}`; const okAdmin = checkAdminAuth(request, env).ok;
      if (!okCron && !okAdmin) return error('Unauthorised', 401);
      const out = { histories: await persistHistories(ctx).catch(e => ({ error: e.message })), snapshot: await dailySnapshot(ctx).catch(e => ({ error: e.message })), ai: await scheduledRefresh(ctx).catch(e => ({ error: e.message })), news: (config.keys.NEWS_AI_CURATION || 'off') === 'daily' ? await curateNews(ctx).then(c => ({ curated: c.picks.length })).catch(e => ({ error: e.message })) : { skipped: 'news curation not scheduled' } };
      return wrap(out);
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
      if (p === '/admin/models') return wrap(await listModels(config));
      if (p === '/admin/news-curate' && request.method === 'POST') { const body = await request.json().catch(() => ({})); return wrap({ curated: await curateNews(ctx, { model: body.model }) }); }
      if (p === '/admin/news-sources') return wrap({ sources: NEWS_SOURCES.map(({ id, name, region, cat, url }) => ({ id, name, region, cat, url })) });
      if (p === '/admin/tv' && request.method === 'GET') return wrap({ ...(await getStreams(ctx)), defaults: DEFAULT_STREAMS });
      if (p === '/admin/tv' && request.method === 'POST') { const body = await request.json().catch(() => ({})); return wrap(body.reset ? await resetStreams(ctx) : await saveStreams(ctx, body.streams)); }
      if (p === '/admin/readings') return wrap({ readings: await listReadings(env) });
      if (p === '/admin/store') {
        const st = env.__store; if (!st) return wrap({ backend: 'none', persistent: false });
        const probe = { t: Date.now() }; let roundTrip = null, err = null;
        try { const t = Date.now(); await st.putJSON('_probe', probe); const back = await st.getJSON('_probe'); roundTrip = { ms: Date.now() - t, ok: back && back.t === probe.t }; await st.del('_probe'); } catch (e) { err = e.message; }
        const [hist, snaps, readings] = await Promise.all([st.list('hist/').catch(() => []), st.list('snap/').catch(() => []), st.list('ai/archive/').catch(() => [])]);
        return wrap({ backend: st.name, persistent: st.persistent, roundTrip, error: err, histories: hist.length, snapshots: snaps.map(x => x.key.replace('snap/', '')).sort().reverse().slice(0, 30), readings: readings.length });
      }
      if (p === '/admin/persist' && request.method === 'POST') return wrap({ histories: await persistHistories(ctx), snapshot: await dailySnapshot(ctx) });
      if (p === '/admin/ai-refresh' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return wrap({ reading: await refreshReading(ctx, { model: body.model, question: body.question, trigger: 'admin' }) });
      }
      if (p === '/admin/test' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return wrap({ key: body.key, ...(await testCredential(body.key, body.value ? String(body.value).trim() : '', config)) });
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
    withStore(env);
    const config = await getConfig(env);
    const c = ctxFor(env, config);
    ctx.waitUntil((async () => {
      try { await getQuotes(c, null); await A.regime(c); } catch (e) { console.log('warm failed', e.message); }
      try { if (new Date().getUTCHours() === 22 && new Date().getUTCMinutes() < 5) { withStore(env); console.log('persist', JSON.stringify(await persistHistories(c))); console.log('snapshot', JSON.stringify(await dailySnapshot(c))); console.log('ai refresh', JSON.stringify(await scheduledRefresh(c))); } } catch (e) { console.log('daily job failed', e.message); }
    })());
  },
};
