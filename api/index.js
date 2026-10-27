// Vercel Function entry: wraps the Cloudflare-style Worker (fetch handler) for Vercel's Web-standard runtime.
// Static UI is served from /public by Vercel; this handles /api/*.
import worker from '../src/index.js';

// Vercel KV / Upstash is optional; without it we use a process-memory cache (warm per instance).
const memory = new Map();
const KV = {
  async get(key, type) { const e = memory.get(key); if (!e) return null; if (e.exp && Date.now() > e.exp) { memory.delete(key); return null; } return type === 'json' ? JSON.parse(e.v) : e.v; },
  async put(key, value, opts = {}) { memory.set(key, { v: typeof value === 'string' ? value : JSON.stringify(value), exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null }); },
  async delete(key) { memory.delete(key); },
  async list({ prefix = '' } = {}) { return { keys: [...memory.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
};

async function upstashKV() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const call = async (cmd) => { const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) }); const j = await r.json(); return j.result; };
  return {
    async get(key, type) { const v = await call(['GET', key]); if (v == null) return null; return type === 'json' ? JSON.parse(v) : v; },
    async put(key, value, opts = {}) { const v = typeof value === 'string' ? value : JSON.stringify(value); await call(opts.expirationTtl ? ['SET', key, v, 'EX', String(opts.expirationTtl)] : ['SET', key, v]); },
    async delete(key) { await call(['DEL', key]); },
    async list({ prefix = '' } = {}) { const keys = await call(['KEYS', prefix + '*']); return { keys: (keys || []).map(name => ({ name })), list_complete: true }; },
  };
}

let kvPromise;
export default async function handler(request) {
  kvPromise ||= upstashKV().then(k => k || KV).catch(() => KV);
  const env = { ...process.env, CACHE: await kvPromise, APP_NAME: process.env.APP_NAME || 'Capital Flow Terminal', DEMO_MODE: process.env.DEMO_MODE || 'false' };
  return worker.fetch(request, env, { waitUntil() {} });
}

export const config = { runtime: 'edge' };
