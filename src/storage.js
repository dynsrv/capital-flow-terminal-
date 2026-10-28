// Storage housekeeping and health.
//   housekeeping  nightly: finish the one-off copy from Blob to Postgres (when Postgres is configured), prune
//                 documents past their retention, record when it ran.
//   report        what Admin shows: which store and cache are in use, documents and bytes by area, retention,
//                 last runs, cache hit rates on this instance.
//   exportAll     a JSON backup of every document except the encrypted credentials and member PINs.
import { cacheStats } from './lib/cache.js';

export const RETENTION = [
  { prefix: 'snap/', label: 'Daily state snapshots', keep: { days: 400 } },
  { prefix: 'usage/day/', label: 'Daily usage totals', keep: { days: 400 } },
  { prefix: 'ai/outlook-archive/', label: 'Outlook archive', keep: { days: 730 } },
  { prefix: 'ai/archive/', label: 'AI reading archive', keep: { newest: 120 } },
  { prefix: '_probe', label: 'Health probe', keep: { newest: 0 } },
];
const AREAS = { hist: 'Price histories', snap: 'Daily snapshots', ai: 'AI reading and outlook', usage: 'Usage meter', anomalies: 'Anomaly scans', admin: 'Credentials (encrypted)', auth: 'Members (encrypted)', news: 'Curated news', rt: 'Real-time routing', tv: 'Live TV channels', sys: 'System', bond: 'Bonds cache' };
const SECRET = /^(admin|auth)\//;
const dayOf = (key) => { const m = key.match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };

async function prune(store) {
  const out = {}; const now = Date.now();
  for (const r of RETENTION) {
    const list = (await store.list(r.prefix).catch(() => [])).map(x => x.key).sort();
    let drop = [];
    if (r.keep.days != null) { const cut = new Date(now - r.keep.days * 864e5).toISOString().slice(0, 10); drop = list.filter(k => { const d = dayOf(k); return d && d < cut; }); }
    if (r.keep.newest != null) drop = drop.concat(list.slice(0, Math.max(0, list.length - r.keep.newest)));
    let n = 0; for (const k of [...new Set(drop)]) { try { await store.del(k); n++; } catch (e) {} }
    out[r.prefix] = { kept: list.length - n, deleted: n };
  }
  return out;
}

export async function housekeeping(ctx) {
  const store = ctx.env.__store; if (!store || !store.persistent) return { skipped: 'no persistent store' };
  const res = { backend: store.name };
  if (store.backend && typeof store.backend.migrate === 'function' && !(await store.backend.isMigrated())) res.migration = await store.backend.migrate(15000).catch(e => ({ error: e.message }));
  res.pruned = await prune(store).catch(e => ({ error: e.message }));
  res.at = new Date().toISOString();
  await store.putJSON('sys/housekeeping', res).catch(() => {});
  return res;
}

export async function markRun(ctx, name, result) {
  const store = ctx.env.__store; if (!store || !store.persistent) return;
  try { const d = (await store.getJSON('sys/runs')) || {}; d[name] = { at: new Date().toISOString(), ok: !JSON.stringify(result || {}).includes('"error"') }; await store.putJSON('sys/runs', d); } catch (e) {}
}

export async function report(ctx) {
  const store = ctx.env.__store; const kv = ctx.env.CACHE;
  const t0 = Date.now(); let probe = null; try { await store.putJSON('_probe', { t: t0 }); store.forget('_probe'); await store.getJSON('_probe'); probe = { ok: true, ms: Date.now() - t0 }; store.del('_probe').catch(() => {}); } catch (e) { probe = { ok: false, error: e.message }; }
  const [areas, hk, runs, kvStats] = await Promise.all([
    store.summary().catch(e => ({ error: e.message })), store.getJSON('sys/housekeeping').catch(() => null), store.getJSON('sys/runs').catch(() => null),
    kv && typeof kv.stats === 'function' ? kv.stats().catch(e => ({ error: e.message })) : Promise.resolve({ kind: kv && kv.__cloudflare ? 'cloudflare-kv' : 'memory' }),
  ]);
  const b = store.backend || {};
  return {
    store: { backend: store.name, persistent: store.persistent, probe, fallback: b.fallbackName || null, migrated: typeof b.isMigrated === 'function' ? await b.isMigrated().catch(() => null) : null },
    cache: { ...kvStats, instance: cacheStats() },
    areas: Array.isArray(areas) ? areas.filter(a => a.prefix !== '_probe').map(a => ({ ...a, label: AREAS[a.prefix] || a.prefix })) : areas,
    retention: RETENTION.filter(r => r.prefix !== '_probe').map(r => ({ prefix: r.prefix, label: r.label, keep: r.keep.days != null ? `${r.keep.days} days` : `newest ${r.keep.newest}` })),
    housekeeping: hk, runs: runs || {},
    upgrades: {
      redis: !kvStats || kvStats.kind === 'memory' ? 'Add Upstash Redis (Vercel → Storage → Marketplace → Upstash for Redis, connect to this project). The cache switches on when KV_REST_API_URL and KV_REST_API_TOKEN appear.' : null,
      postgres: store.name !== 'postgres' ? 'Add Neon Postgres (Vercel → Storage → Marketplace → Neon, connect to this project). The store switches on when DATABASE_URL appears; documents are copied from Blob automatically.' : null,
    },
  };
}

export async function exportAll(ctx) {
  const store = ctx.env.__store; const list = (await store.list('')).filter(x => !SECRET.test(x.key) && x.key !== '_probe');
  const docs = {}; for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(async (x) => { try { docs[x.key] = await store.getJSON(x.key); } catch (e) {} }));
  return { app: 'capital-flow-terminal', exportedAt: new Date().toISOString(), backend: store.name, count: Object.keys(docs).length, excluded: 'admin/* and auth/* (encrypted credentials and member PINs)', docs };
}

export async function importAll(ctx, body) {
  const store = ctx.env.__store; if (!body || body.app !== 'capital-flow-terminal' || !body.docs) throw new Error('Not a Capital Flow Terminal backup');
  let n = 0; for (const [k, v] of Object.entries(body.docs)) { if (SECRET.test(k) || v == null) continue; await store.putJSON(k, v); n++; }
  return { restored: n };
}
