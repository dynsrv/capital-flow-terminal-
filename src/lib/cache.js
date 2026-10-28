// Cache layer: two tiers.
//   L1  per-instance memory: answers repeat reads inside one server instance with no network call.
//   L2  the shared KV (Upstash Redis on Vercel, KV on Cloudflare) when configured: every instance sees one copy,
//       so a cold instance does not refetch from the upstream providers and rate limits are spent once.
// Every entry stores the payload plus the time it was fetched, so the UI can show freshness and stale data can be
// served (explicitly flagged) when an upstream source fails or is rate-limited. When the shared KV can lock, only
// one instance refreshes an expired key at a time; the others keep serving the previous copy for that moment.

const memory = new Map();
const inflight = new Map();
const stats = { l1: 0, l2: 0, miss: 0, loads: 0, lockWaits: 0, errors: 0 };
export const cacheStats = () => ({ ...stats, l1Keys: memory.size });

const now = () => Date.now();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const L1_MAX = 4000;
function remember(key, entry) { if (memory.size > L1_MAX) { const first = memory.keys().next().value; memory.delete(first); } memory.set(key, entry); }

export function createCache(env) {
  const kv = env && env.CACHE && typeof env.CACHE.get === 'function' ? env.CACHE : null;
  const shared = kv && kv.kind !== 'memory'; // a process-memory KV adds nothing on top of L1

  /** Newest copy of `key`; with ttlSeconds, a fresh L1 copy is returned without asking the shared KV. */
  async function read(key, ttlSeconds) {
    const m = memory.get(key);
    if (m && ttlSeconds && (now() - m.fetchedAt) / 1000 < ttlSeconds) { stats.l1++; return m; }
    if (shared) {
      try {
        const raw = await kv.get(`cache:${key}`, 'json');
        if (raw && (!m || raw.fetchedAt > m.fetchedAt)) { remember(key, raw); stats.l2++; return raw; }
      } catch (e) { stats.errors++; }
    } else if (kv && !m) {
      try { const raw = await kv.get(`cache:${key}`, 'json'); if (raw) { remember(key, raw); return raw; } } catch (e) {}
    }
    if (m) stats.l1++; else stats.miss++;
    return m || null;
  }

  async function write(key, entry, ttlSeconds) {
    remember(key, entry);
    if (kv) {
      try {
        // Keep stale copies for up to a day so they can be served if the source dies.
        const expirationTtl = Math.max(60, Math.min(86400, Math.round(ttlSeconds * 24)));
        await kv.put(`cache:${key}`, JSON.stringify(entry), { expirationTtl });
      } catch (e) { stats.errors++; }
    }
  }

  /**
   * Resolve `key` from cache or by calling `loader()`.
   * Returns { data, fetchedAt, stale, error, cacheHit }.
   *  - fresh (age < ttl)  → cache hit
   *  - expired            → re-fetch (one instance at a time); on failure serve the stale copy flagged stale=true
   *  - nothing cached + failure → { data:null, error }
   */
  async function resolve(key, ttlSeconds, loader) {
    let entry = await read(key, ttlSeconds);
    let age = entry ? (now() - entry.fetchedAt) / 1000 : Infinity;
    if (entry && age < ttlSeconds) return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false, cacheHit: true, ageSec: Math.round(age) };
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      let locked = false;
      try {
        if (shared && typeof kv.lock === 'function') {
          locked = await kv.lock(key, Math.min(30, Math.max(10, ttlSeconds))).catch(() => true);
          if (!locked) {
            stats.lockWaits++;
            // another instance is refreshing: serve the previous copy, or wait briefly for the new one
            if (entry && age < ttlSeconds * 3) return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false, cacheHit: true, ageSec: Math.round(age), refreshing: true };
            for (let i = 0; i < 6; i++) { await sleep(400); const e2 = await read(key); if (e2 && (!entry || e2.fetchedAt > entry.fetchedAt)) return { data: e2.data, fetchedAt: e2.fetchedAt, stale: false, cacheHit: true, ageSec: Math.round((now() - e2.fetchedAt) / 1000) }; }
          }
        }
        stats.loads++;
        const data = await loader();
        const fresh = { data, fetchedAt: now() };
        await write(key, fresh, ttlSeconds);
        return { data, fetchedAt: fresh.fetchedAt, stale: false, cacheHit: false, ageSec: 0 };
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        if (entry) return { data: entry.data, fetchedAt: entry.fetchedAt, stale: true, cacheHit: true, ageSec: Math.round(age), error: message };
        return { data: null, fetchedAt: null, stale: true, cacheHit: false, error: message };
      } finally {
        inflight.delete(key);
        if (locked && typeof kv.unlock === 'function') kv.unlock(key).catch(() => {});
      }
    })();
    inflight.set(key, p);
    return p;
  }

  async function del(key) {
    memory.delete(key);
    if (kv) { try { await kv.delete(`cache:${key}`); } catch (e) {} }
  }
  function clearLocal(prefix = '') { let n = 0; for (const k of [...memory.keys()]) if (k.startsWith(prefix)) { memory.delete(k); n++; } return n; }

  return { resolve, read, write, del, clearLocal, shared, kind: kv ? (kv.kind || (kv.__cloudflare ? 'cloudflare-kv' : 'kv')) : 'memory' };
}
