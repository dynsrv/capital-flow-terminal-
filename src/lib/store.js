// Persistent store: JSON documents by key, with optional encryption for secrets.
// Backends, picked at runtime:
//   - Postgres (Neon, over HTTP) when DATABASE_URL / POSTGRES_URL is set: one row per document, prefix queries via an
//     index. Until the one-off copy from Blob has finished, a key missing in Postgres is read from Blob and copied over.
//   - Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is set
//   - Cloudflare KV when env.STORE_KV (or env.CACHE on Workers) is a KV namespace
//   - an injected object (local file store from local/server.mjs)
// The hot caches (quotes, histories) stay in memory; this store holds what must survive restarts:
// admin credentials, AI readings, daily history snapshots, daily state snapshots, stream lists.

import { record } from './usage.js';
let blobMod = null;
async function blob() { if (!blobMod) blobMod = await import('@vercel/blob'); return blobMod; }

function blobBackend(token) {
  const path = (k) => 'kv/' + k.replace(/[^A-Za-z0-9._-]/g, (c) => '_' + c.charCodeAt(0).toString(16));
  return {
    name: 'vercel-blob',
    async get(key) {
      const { get } = await blob();
      const r = await get(path(key), { access: 'private', token });
      if (!r || r.statusCode !== 200 || !r.stream) return null;
      return await new Response(r.stream).text();
    },
    async put(key, text) {
      const { put } = await blob();
      await put(path(key), text, { access: 'private', token, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0 });
    },
    async del(key) { const { del, list } = await blob(); const l = await list({ prefix: path(key), token, limit: 1 }); if (l.blobs.length) await del(l.blobs.map(b => b.url), { token }); },
    async list(prefix) { const { list } = await blob(); const out = []; let cursor; do { const l = await list({ prefix: path(prefix), token, cursor, limit: 1000 }); out.push(...l.blobs.map(b => ({ key: b.pathname.replace(/^kv\//, '').replace(/_([0-9a-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), size: b.size, uploadedAt: b.uploadedAt }))); cursor = l.hasMore ? l.cursor : null; } while (cursor); return out; },
  };
}

let neonMod = null;
async function neonSql(url) { if (!neonMod) neonMod = await import('@neondatabase/serverless'); return neonMod.neon(url); }
const MIGRATED = 'sys/migrated-from-blob';
const likeEsc = (p) => p.replace(/[\\%_]/g, (c) => '\\' + c);

function pgBackend(url, fallback, factory) {
  let sqlP = null, ready = null, migrated = null, migratedAt = 0;
  const sql = async () => (sqlP ||= factory ? factory(url) : neonSql(url));
  const q = async (text, params = []) => { const s = await sql(); await (ready ||= init(s)); return s.query(text, params); };
  async function init(s) {
    await s.query('CREATE TABLE IF NOT EXISTS cft_docs (key text PRIMARY KEY, value text NOT NULL, bytes integer NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
    await s.query('CREATE INDEX IF NOT EXISTS cft_docs_key_prefix ON cft_docs (key text_pattern_ops)');
  }
  async function isMigrated() {
    if (!fallback) return true;
    if (migrated && Date.now() - migratedAt < 60e3) return migrated;
    const r = await q('SELECT 1 FROM cft_docs WHERE key = $1', [MIGRATED]); migrated = r.length > 0; migratedAt = Date.now(); return migrated;
  }
  const put = (key, text) => q('INSERT INTO cft_docs (key, value, bytes, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, bytes = EXCLUDED.bytes, updated_at = now()', [key, text, text.length]);
  return {
    name: 'postgres',
    fallbackName: fallback ? fallback.name : null,
    async get(key) {
      const r = await q('SELECT value FROM cft_docs WHERE key = $1', [key]);
      if (r.length) return r[0].value;
      if (fallback && !(await isMigrated())) { const v = await fallback.get(key).catch(() => null); if (v != null) { await put(key, v).catch(() => {}); return v; } }
      return null;
    },
    put,
    async del(key) { await q('DELETE FROM cft_docs WHERE key = $1', [key]); if (fallback && !(await isMigrated())) await fallback.del(key).catch(() => {}); },
    async list(prefix) {
      const rows = await q("SELECT key, bytes, updated_at FROM cft_docs WHERE key LIKE $1 ORDER BY key", [likeEsc(prefix) + '%']);
      const out = rows.map(r => ({ key: r.key, size: r.bytes, uploadedAt: r.updated_at }));
      if (fallback && !(await isMigrated())) { const have = new Set(out.map(x => x.key)); for (const b of await fallback.list(prefix).catch(() => [])) if (!have.has(b.key)) out.push(b); }
      return out;
    },
    /** Storage summary by top-level prefix. */
    async summary() {
      const rows = await q("SELECT split_part(key, '/', 1) AS prefix, count(*)::int AS n, sum(bytes)::bigint AS bytes, max(updated_at) AS latest FROM cft_docs GROUP BY split_part(key, '/', 1) ORDER BY sum(bytes) DESC");
      return rows.map(r => ({ prefix: r.prefix, n: r.n, bytes: Number(r.bytes), latest: r.latest }));
    },
    /** Copy everything from Blob, within a time budget; safe to repeat. */
    async migrate(budgetMs = 20000) {
      if (!fallback) return { done: true, note: 'no Blob store to copy from' };
      const t0 = Date.now(); const src = await fallback.list('');
      const have = new Set((await q('SELECT key FROM cft_docs')).map(r => r.key));
      const todo = src.filter(b => !have.has(b.key) && b.key !== '_probe'); let copied = 0, failed = 0;
      for (let i = 0; i < todo.length && Date.now() - t0 < budgetMs; i += 4) {
        await Promise.all(todo.slice(i, i + 4).map(async (b) => { try { const v = await fallback.get(b.key); if (v != null) { await put(b.key, v); copied++; } } catch (e) { failed++; } }));
      }
      const remaining = todo.length - copied - failed;
      if (remaining <= 0 && !failed) { await put(MIGRATED, JSON.stringify({ at: new Date().toISOString(), docs: src.length })); migrated = true; migratedAt = Date.now(); }
      return { total: src.length, copied, failed, remaining: Math.max(0, remaining), done: remaining <= 0 && !failed };
    },
    isMigrated,
  };
}

function kvBackend(kv) {
  return {
    name: 'cloudflare-kv',
    async get(key) { return kv.get('store:' + key); },
    async put(key, text) { await kv.put('store:' + key, text); },
    async del(key) { await kv.delete('store:' + key); },
    async list(prefix) { const out = []; let cursor; do { const l = await kv.list({ prefix: 'store:' + prefix, cursor }); out.push(...l.keys.map(k => ({ key: k.name.slice(6) }))); cursor = l.list_complete ? null : l.cursor; } while (cursor); return out; },
  };
}

const memory = new Map();
const memoryBackend = { name: 'memory', async get(k) { return memory.has(k) ? memory.get(k) : null; }, async put(k, t) { memory.set(k, t); }, async del(k) { memory.delete(k); }, async list(p) { return [...memory.keys()].filter(k => k.startsWith(p)).map(key => ({ key })); } };

/* ───── encryption (AES-GCM, key derived from a server secret) ───── */
async function aesKey(secret) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cft-store:' + secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function encrypt(secret, text) {
  const key = await aesKey(secret); const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
  return JSON.stringify({ enc: 'aes-gcm', iv: b64(iv), ct: b64(ct) });
}
export async function decrypt(secret, payload) {
  const o = JSON.parse(payload); if (!o || o.enc !== 'aes-gcm') return payload;
  const key = await aesKey(secret);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct));
  return new TextDecoder().decode(pt);
}

function metered(b) {
  if (b.name !== 'vercel-blob' && b.name !== 'postgres') return b;
  const svc = b.name;
  const wrap = (op, fn) => async (...a) => { const t0 = Date.now(); try { const r = await fn(...a); record({ svc, op, status: 200, ms: Date.now() - t0, quiet: true }); return r; } catch (e) { record({ svc, op, status: e.status || 500, ms: Date.now() - t0, err: e.message, quiet: true }); throw e; } };
  return { ...b, get: wrap('get', b.get), put: wrap('put', b.put), del: wrap('del', b.del), list: wrap('list', b.list) };
}

const shared = new Map(); // per-instance memo for reads that accept a max age (saves one storage read per request)

export function createStore(env) {
  let backend;
  if (env.STORE && typeof env.STORE.get === 'function' && typeof env.STORE.put === 'function' && env.STORE.name) backend = env.STORE;
  else if (env.DATABASE_URL || env.POSTGRES_URL) backend = pgBackend(env.DATABASE_URL || env.POSTGRES_URL, env.__pgFallback || (env.BLOB_READ_WRITE_TOKEN ? metered(blobBackend(env.BLOB_READ_WRITE_TOKEN)) : null), env.__pgFactory);
  else if (env.BLOB_READ_WRITE_TOKEN) backend = blobBackend(env.BLOB_READ_WRITE_TOKEN);
  else if (env.STORE_KV && typeof env.STORE_KV.get === 'function') backend = kvBackend(env.STORE_KV);
  else if (env.CACHE && typeof env.CACHE.list === 'function' && env.CACHE.__cloudflare) backend = kvBackend(env.CACHE);
  else backend = memoryBackend;
  backend = metered(backend);
  const secret = env.STORE_SECRET || env.ADMIN_TOKEN || '';
  const memo = new Map(); // per-isolate read-through memo for JSON docs

  return {
    name: backend.name,
    persistent: backend.name !== 'memory',
    async getJSON(key, { secure = false, maxAgeMs = 0 } = {}) {
      const m = memo.get(key) || (maxAgeMs ? shared.get(backend.name + ':' + key) : null); if (m && (!maxAgeMs || Date.now() - m.t < maxAgeMs)) return m.v;
      let text = await backend.get(key); if (text == null) { memo.set(key, { v: null, t: Date.now() }); return null; }
      if (secure) { if (!secret) throw new Error('STORE_SECRET or ADMIN_TOKEN is required to read encrypted data'); text = await decrypt(secret, text); }
      let v = null; try { v = JSON.parse(text); } catch (e) { v = null; }
      memo.set(key, { v, t: Date.now() }); if (maxAgeMs) shared.set(backend.name + ':' + key, { v, t: Date.now() }); return v;
    },
    async putJSON(key, value, { secure = false } = {}) {
      let text = JSON.stringify(value);
      if (secure) { if (!secret) throw new Error('STORE_SECRET or ADMIN_TOKEN is required to save encrypted data'); text = await encrypt(secret, text); }
      await backend.put(key, text); memo.set(key, { v: value, t: Date.now() }); shared.set(backend.name + ':' + key, { v: value, t: Date.now() });
    },
    async del(key) { await backend.del(key); memo.delete(key); shared.delete(backend.name + ':' + key); },
    async list(prefix) { return backend.list(prefix); },
    forget(key) { memo.delete(key); },
    backend,
    async summary() {
      if (backend.summary) return backend.summary();
      const by = {}; for (const b of await backend.list('')) { const p = b.key.split('/')[0]; const x = by[p] ||= { prefix: p, n: 0, bytes: 0, latest: null }; x.n++; x.bytes += b.size || 0; if (b.uploadedAt && (!x.latest || new Date(b.uploadedAt) > new Date(x.latest))) x.latest = b.uploadedAt; }
      return Object.values(by).sort((a, b) => b.bytes - a.bytes);
    },
  };
}
