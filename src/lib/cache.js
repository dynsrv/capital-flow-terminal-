// Cache layer: KV-backed when available, in-memory otherwise.
// Every entry stores the payload plus the time it was fetched so the UI can
// show freshness and we can serve stale data (explicitly flagged) when an
// upstream source fails or is rate-limited.

const memory = new Map();
const inflight = new Map();

function now() { return Date.now(); }

export function createCache(env) {
  const kv = env && env.CACHE && typeof env.CACHE.get === 'function' ? env.CACHE : null;

  async function read(key) {
    if (kv) {
      try {
        const raw = await kv.get(`cache:${key}`, 'json');
        if (raw) return raw;
      } catch (e) { /* fall through to memory */ }
    }
    return memory.get(key) || null;
  }

  async function write(key, entry, ttlSeconds) {
    memory.set(key, entry);
    if (kv) {
      try {
        // Keep stale copies around for up to a day so we can serve them if the source dies.
        const expirationTtl = Math.max(60, Math.min(86400, ttlSeconds * 24));
        await kv.put(`cache:${key}`, JSON.stringify(entry), { expirationTtl });
      } catch (e) { /* ignore KV write failures */ }
    }
  }

  /**
   * Resolve `key` from cache or by calling `loader()`.
   * Returns { data, fetchedAt, stale, error, cacheHit }.
   *  - fresh (age < ttl)  → cache hit
   *  - expired            → re-fetch; on failure serve stale copy flagged stale=true
   *  - nothing cached + failure → { data:null, error }
   */
  async function resolve(key, ttlSeconds, loader) {
    const entry = await read(key);
    const age = entry ? (now() - entry.fetchedAt) / 1000 : Infinity;
    if (entry && age < ttlSeconds) {
      return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false, cacheHit: true, ageSec: Math.round(age) };
    }
    // De-duplicate concurrent loads of the same key within one isolate.
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      try {
        const data = await loader();
        const fresh = { data, fetchedAt: now() };
        await write(key, fresh, ttlSeconds);
        return { data, fetchedAt: fresh.fetchedAt, stale: false, cacheHit: false, ageSec: 0 };
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        if (entry) {
          return { data: entry.data, fetchedAt: entry.fetchedAt, stale: true, cacheHit: true, ageSec: Math.round(age), error: message };
        }
        return { data: null, fetchedAt: null, stale: true, cacheHit: false, error: message };
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  }

  async function del(key) {
    memory.delete(key);
    if (kv) { try { await kv.delete(`cache:${key}`); } catch (e) {} }
  }

  return { resolve, read, write, del };
}
