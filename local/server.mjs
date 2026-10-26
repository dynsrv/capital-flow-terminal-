// Local runner: serves the Worker on Node 18+ without wrangler.
// Uses an in-memory KV shim (optionally persisted to local/.kv.json) and serves ./public.
//   node local/server.mjs            → http://localhost:8787
//   PORT=3000 ADMIN_TOKEN=secret node local/server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const KV_FILE = path.join(__dirname, '.kv.json');

// Load .dev.vars (wrangler convention) if present
const devVars = path.join(ROOT, '.dev.vars');
if (fs.existsSync(devVars)) for (const line of fs.readFileSync(devVars, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }

// Minimal KV shim with persistence
let store = {}; try { store = JSON.parse(fs.readFileSync(KV_FILE, 'utf8')); } catch (e) {}
let dirty = false;
const KV = {
  async get(key, type) { const e = store[key]; if (!e) return null; if (e.exp && Date.now() > e.exp) { delete store[key]; return null; } return type === 'json' ? JSON.parse(e.v) : e.v; },
  async put(key, value, opts = {}) { store[key] = { v: typeof value === 'string' ? value : JSON.stringify(value), exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null }; dirty = true; },
  async delete(key) { delete store[key]; dirty = true; },
  async list({ prefix = '', cursor } = {}) { return { keys: Object.keys(store).filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
};
setInterval(() => { if (dirty) { fs.writeFileSync(KV_FILE, JSON.stringify(store)); dirty = false; } }, 5000).unref();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const ASSETS = {
  async fetch(request) {
    const u = new URL(request.url);
    let file = path.join(PUBLIC, decodeURIComponent(u.pathname));
    if (!file.startsWith(PUBLIC)) return new Response('forbidden', { status: 403 });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) file = path.join(PUBLIC, 'index.html'); // SPA fallback
    const body = fs.readFileSync(file);
    return new Response(body, { headers: { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' } });
  },
};

const env = { ...process.env, CACHE: KV, ASSETS, APP_NAME: process.env.APP_NAME || 'Capital Flow Terminal', DEMO_MODE: process.env.DEMO_MODE || 'false' };
const PORT = Number(process.env.PORT || 8787);

http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  try {
    const r = await worker.fetch(request, env, { waitUntil() {} });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(e && e.stack || e)); }
}).listen(PORT, () => console.log(`Capital Flow Terminal → http://localhost:${PORT}  (admin token ${env.ADMIN_TOKEN ? 'set' : 'NOT set — set ADMIN_TOKEN to use /admin'})`));
