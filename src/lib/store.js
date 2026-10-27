// Persistent store: JSON documents by key, with optional encryption for secrets.
// Backends, picked at runtime:
//   - Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is set
//   - Cloudflare KV when env.STORE_KV (or env.CACHE on Workers) is a KV namespace
//   - an injected object (local file store from local/server.mjs)
// The hot caches (quotes, histories) stay in memory; this store holds what must survive restarts:
// admin credentials, AI readings, daily history snapshots, daily state snapshots, stream lists.

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

export function createStore(env) {
  let backend;
  if (env.STORE && typeof env.STORE.get === 'function' && typeof env.STORE.put === 'function' && env.STORE.name) backend = env.STORE;
  else if (env.BLOB_READ_WRITE_TOKEN) backend = blobBackend(env.BLOB_READ_WRITE_TOKEN);
  else if (env.STORE_KV && typeof env.STORE_KV.get === 'function') backend = kvBackend(env.STORE_KV);
  else if (env.CACHE && typeof env.CACHE.list === 'function' && env.CACHE.__cloudflare) backend = kvBackend(env.CACHE);
  else backend = memoryBackend;
  const secret = env.STORE_SECRET || env.ADMIN_TOKEN || '';
  const memo = new Map(); // per-isolate read-through memo for JSON docs

  return {
    name: backend.name,
    persistent: backend.name !== 'memory',
    async getJSON(key, { secure = false, maxAgeMs = 0 } = {}) {
      const m = memo.get(key); if (m && (!maxAgeMs || Date.now() - m.t < maxAgeMs)) return m.v;
      let text = await backend.get(key); if (text == null) { memo.set(key, { v: null, t: Date.now() }); return null; }
      if (secure) { if (!secret) throw new Error('STORE_SECRET or ADMIN_TOKEN is required to read encrypted data'); text = await decrypt(secret, text); }
      let v = null; try { v = JSON.parse(text); } catch (e) { v = null; }
      memo.set(key, { v, t: Date.now() }); return v;
    },
    async putJSON(key, value, { secure = false } = {}) {
      let text = JSON.stringify(value);
      if (secure) { if (!secret) throw new Error('STORE_SECRET or ADMIN_TOKEN is required to save encrypted data'); text = await encrypt(secret, text); }
      await backend.put(key, text); memo.set(key, { v: value, t: Date.now() });
    },
    async del(key) { await backend.del(key); memo.delete(key); },
    async list(prefix) { return backend.list(prefix); },
    forget(key) { memo.delete(key); },
  };
}
