// Roles: admin (ADMIN_TOKEN), member (PIN → signed session), visitor (no sign-in).
// Members live in one encrypted store document. A PIN is never stored: only HMAC(server secret, salt + PIN), so the
// document alone (even decrypted) cannot be brute-forced without the server secret. Sessions are stateless signed
// tokens "m1.<id>.<gen>.<exp>.<sig>"; bumping a member's gen (Sign out everywhere) or removing them ends their sessions.
const DOC = 'auth/members';
const SESSION_DAYS = 30;
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode('cft-auth:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const secretOf = (env) => env.STORE_SECRET || env.ADMIN_TOKEN || '';
const eq = (a, b) => { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };

const memo = { v: null, at: 0 };
export async function loadMembers(env, fresh = false) {
  if (!fresh && memo.v && Date.now() - memo.at < 30e3) return memo.v;
  let d = null;
  try { d = env.__store ? await env.__store.getJSON(DOC, { secure: true, maxAgeMs: fresh ? 0 : 30e3 }) : null; } catch (e) { d = null; }
  if (!d && env.CACHE && typeof env.CACHE.get === 'function') { try { d = await env.CACHE.get('auth:members', 'json'); } catch (e) {} }
  const v = Array.isArray(d && d.members) ? d.members : [];
  memo.v = v; memo.at = Date.now(); return v;
}
async function saveMembers(env, members) {
  const doc = { members, updatedAt: new Date().toISOString() };
  if (env.__store && env.__store.persistent) await env.__store.putJSON(DOC, doc, { secure: true });
  else if (env.CACHE && typeof env.CACHE.put === 'function') await env.CACHE.put('auth:members', JSON.stringify(doc));
  else throw new Error('No persistent store is configured; members cannot be saved');
  memo.v = members; memo.at = Date.now();
}
const pinHash = (env, salt, pin) => hmac(secretOf(env), `pin:${salt}:${pin}`);
const validPin = (pin) => /^\d{6,10}$/.test(String(pin || ''));
const publicView = (m) => ({ id: m.id, name: m.name, active: m.active !== false, createdAt: m.createdAt, lastLogin: m.lastLogin || null, logins: m.logins || 0 });

async function pinTaken(env, members, pin, exceptId) {
  for (const m of members) if (m.id !== exceptId && eq(await pinHash(env, m.salt, pin), m.hash)) return true;
  return false;
}

/* ───────── sign-in throttle: 5 wrong PINs from one address → 15-minute lockout ─────────
   Counted in the shared cache (Upstash Redis) when configured, so the limit holds across server instances;
   otherwise per instance. */
const tries = new Map();
const ipOf = (req) => (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'local').split(',')[0].trim();
const LOCK_SEC = 15 * 60;
async function throttle(env, req) {
  const ip = ipOf(req); const kv = env.CACHE;
  if (kv && typeof kv.incr === 'function' && kv.kind !== 'memory') {
    try { const until = await kv.get('auth:lock:' + ip); if (until && Number(until) > Date.now()) return { blocked: true, retrySec: Math.ceil((Number(until) - Date.now()) / 1000) }; return { ip, kv }; } catch (e) {}
  }
  const t = tries.get(ip) || { n: 0, until: 0, first: Date.now() };
  if (t.until > Date.now()) return { blocked: true, retrySec: Math.ceil((t.until - Date.now()) / 1000) };
  if (Date.now() - t.first > LOCK_SEC * 1000) { t.n = 0; t.first = Date.now(); }
  return { ip, t };
}
async function fail(th) {
  if (th.kv) { try { const n = await th.kv.incr('auth:tries:' + th.ip, LOCK_SEC); if (n >= 5) { await th.kv.put('auth:lock:' + th.ip, String(Date.now() + LOCK_SEC * 1000), { expirationTtl: LOCK_SEC }); await th.kv.delete('auth:tries:' + th.ip); } return; } catch (e) {} }
  const t = th.t || { n: 0, until: 0, first: Date.now() }; t.n++; if (t.n >= 5) { t.until = Date.now() + LOCK_SEC * 1000; t.n = 0; t.first = Date.now(); } tries.set(th.ip, t);
}
async function cleared(th) { if (th.kv) { try { await th.kv.delete('auth:tries:' + th.ip); } catch (e) {} } else tries.delete(th.ip); }

/** PIN sign-in. Returns { token, member, expiresAt } or throws an Error with .status. */
export async function signIn(env, request, pin) {
  if (!secretOf(env)) throw Object.assign(new Error('Sign-in is not configured on this server'), { status: 503 });
  const th = await throttle(env, request);
  if (th.blocked) throw Object.assign(new Error(`Too many attempts. Try again in ${Math.ceil(th.retrySec / 60)} min.`), { status: 429 });
  pin = String(pin || '').trim();
  const members = await loadMembers(env, true);
  let hit = null;
  if (validPin(pin)) for (const m of members) { if (m.active !== false && eq(await pinHash(env, m.salt, pin), m.hash)) { hit = m; break; } }
  if (!hit) { await fail(th); throw Object.assign(new Error('That PIN is not recognised'), { status: 401 }); }
  await cleared(th);
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const body = `m1.${hit.id}.${hit.gen || 0}.${exp}`;
  const token = `${body}.${await hmac(secretOf(env), body)}`;
  try { hit.lastLogin = new Date().toISOString(); hit.logins = (hit.logins || 0) + 1; await saveMembers(env, members); } catch (e) {}
  return { token, member: { id: hit.id, name: hit.name }, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Who is calling: { role: 'admin' | 'member' | 'visitor', member? }. Accepts Authorization: Bearer or ?a= (live TV relay). */
export async function roleOf(request, env, url) {
  const h = request.headers.get('authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : (url && url.searchParams.get('a')) || '';
  if (!tok) return { role: 'visitor' };
  if (env.ADMIN_TOKEN && eq(tok, env.ADMIN_TOKEN)) return { role: 'admin' };
  const p = tok.split('.');
  if (p.length !== 5 || p[0] !== 'm1' || !secretOf(env)) return { role: 'visitor' };
  const [, id, gen, exp, sig] = p;
  if (Number(exp) * 1000 < Date.now()) return { role: 'visitor', expired: true };
  if (!eq(sig, await hmac(secretOf(env), `m1.${id}.${gen}.${exp}`))) return { role: 'visitor' };
  const m = (await loadMembers(env)).find(x => x.id === id);
  if (!m || m.active === false || String(m.gen || 0) !== gen) return { role: 'visitor', revoked: true };
  return { role: 'member', member: { id: m.id, name: m.name } };
}
export const canLive = (who) => who.role === 'admin' || who.role === 'member';

/* ───────── admin: manage members ───────── */
export async function listMembers(env) { return (await loadMembers(env, true)).map(publicView); }
export async function manageMembers(env, body = {}) {
  const members = await loadMembers(env, true); const act = body.action;
  const find = () => { const m = members.find(x => x.id === body.id); if (!m) throw Object.assign(new Error('Member not found'), { status: 404 }); return m; };
  const name = (s) => { const n = String(s || '').trim().slice(0, 40); if (!n) throw Object.assign(new Error('Enter a name'), { status: 400 }); return n; };
  const setPin = async (m, pin) => {
    if (!validPin(pin)) throw Object.assign(new Error('PIN must be 6 to 10 digits'), { status: 400 });
    if (await pinTaken(env, members, pin, m.id)) throw Object.assign(new Error('Another member already uses that PIN'), { status: 409 });
    m.salt = b64u(crypto.getRandomValues(new Uint8Array(12))); m.hash = await pinHash(env, m.salt, pin); m.gen = (m.gen || 0) + 1;
  };
  if (act === 'add') {
    if (members.length >= 100) throw Object.assign(new Error('Member limit reached (100)'), { status: 400 });
    const m = { id: b64u(crypto.getRandomValues(new Uint8Array(6))), name: name(body.name), active: true, gen: 0, createdAt: new Date().toISOString() };
    await setPin(m, String(body.pin || '').trim()); m.gen = 0; members.push(m);
  } else if (act === 'update') {
    const m = find();
    if (body.name != null) m.name = name(body.name);
    if (body.pin) await setPin(m, String(body.pin).trim());
    if (body.active != null) { m.active = !!body.active; if (!m.active) m.gen = (m.gen || 0) + 1; }
  } else if (act === 'revoke') { const m = find(); m.gen = (m.gen || 0) + 1; }
  else if (act === 'delete') { const m = find(); members.splice(members.indexOf(m), 1); }
  else throw Object.assign(new Error('Unknown action'), { status: 400 });
  await saveMembers(env, members);
  return members.map(publicView);
}
