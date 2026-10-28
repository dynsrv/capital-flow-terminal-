// Vercel Function entry: wraps the Cloudflare-style Worker (fetch handler) for Vercel's Web-standard runtime.
// Static UI is served from /public by Vercel; this handles /api/*.
import worker from '../src/index.js';

// Shared cache: Upstash Redis (Vercel Marketplace) when its REST variables are set, otherwise process memory
// (warm per instance only). The worker layers its own per-instance memory in front of this, so Redis is only
// asked when the local copy is missing or expired.
const memory = new Map();
const KV = {
  kind: 'memory',
  async get(key, type) { const e = memory.get(key); if (!e) return null; if (e.exp && Date.now() > e.exp) { memory.delete(key); return null; } return type === 'json' ? JSON.parse(e.v) : e.v; },
  async put(key, value, opts = {}) { memory.set(key, { v: typeof value === 'string' ? value : JSON.stringify(value), exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null }); },
  async delete(key) { memory.delete(key); },
  async list({ prefix = '' } = {}) { return { keys: [...memory.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  async lock(key, ttlSec) { const e = memory.get('lock:' + key); if (e && e.exp > Date.now()) return false; memory.set('lock:' + key, { v: '1', exp: Date.now() + ttlSec * 1000 }); return true; },
  async unlock(key) { memory.delete('lock:' + key); },
  async incr(key, ttlSec) { const e = memory.get(key); const live = e && (!e.exp || e.exp > Date.now()); const n = (live ? Number(e.v) : 0) + 1; memory.set(key, { v: String(n), exp: live && e.exp ? e.exp : Date.now() + ttlSec * 1000 }); return n; },
  async stats() { return { kind: 'memory', keys: memory.size, note: 'per instance; add Upstash Redis to share the cache' }; },
};

function upstashKV() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const call = async (cmd) => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
    try { const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd), signal: ctrl.signal }); const j = await r.json(); if (j.error) throw new Error('Redis: ' + j.error); return j.result; }
    finally { clearTimeout(t); }
  };
  return {
    kind: 'upstash-redis',
    async get(key, type) { const v = await call(['GET', key]); if (v == null) return null; return type === 'json' ? JSON.parse(v) : v; },
    async put(key, value, opts = {}) { const v = typeof value === 'string' ? value : JSON.stringify(value); await call(opts.expirationTtl ? ['SET', key, v, 'EX', String(opts.expirationTtl)] : ['SET', key, v]); },
    async delete(key) { await call(['DEL', key]); },
    // SCAN in pages rather than KEYS, which blocks Redis on large keyspaces
    async list({ prefix = '', cursor } = {}) { const [next, keys] = await call(['SCAN', cursor || '0', 'MATCH', prefix + '*', 'COUNT', '500']); return { keys: (keys || []).map(name => ({ name })), list_complete: next === '0', cursor: next }; },
    async lock(key, ttlSec) { return (await call(['SET', 'lock:' + key, '1', 'NX', 'EX', String(ttlSec)])) === 'OK'; },
    async unlock(key) { await call(['DEL', 'lock:' + key]); },
    async incr(key, ttlSec) { const n = await call(['INCR', key]); if (n === 1) await call(['EXPIRE', key, String(ttlSec)]); return n; },
    async stats() { const t0 = Date.now(); const size = await call(['DBSIZE']); return { kind: 'upstash-redis', keys: size, pingMs: Date.now() - t0 }; },
  };
}

let kv;
export default async function handler(request, context) {
  kv ||= upstashKV() || KV;
  const env = { ...process.env, CACHE: kv, // BLOB_READ_WRITE_TOKEN selects the Vercel Blob store; DATABASE_URL (Neon) selects Postgres
    APP_NAME: process.env.APP_NAME || 'Capital Flow Terminal', DEMO_MODE: process.env.DEMO_MODE || 'false' };
  return worker.fetch(request, env, { waitUntil(p) { try { if (context && typeof context.waitUntil === 'function') context.waitUntil(p); } catch (e) {} } });
}

export const config = { runtime: 'edge' };
