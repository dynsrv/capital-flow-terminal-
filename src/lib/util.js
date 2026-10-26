export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  });
}

export function error(message, status = 500, extra = {}) {
  return json({ ok: false, error: message, ...extra }, status);
}

const UA = 'Mozilla/5.0 (compatible; CapitalFlowTerminal/0.1; +https://github.com)';

/** fetch with timeout, UA header and a clear error on non-2xx */
export async function fetchText(url, { timeoutMs = 12000, headers = {}, method = 'GET', body } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, body, headers: { 'user-agent': UA, accept: '*/*', ...headers }, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) {
      const snippet = text.slice(0, 120).replace(/\s+/g, ' ');
      const err = new Error(`HTTP ${res.status} from ${new URL(url).host}: ${snippet}`);
      err.status = res.status;
      throw err;
    }
    return text;
  } finally { clearTimeout(t); }
}

export async function fetchJSON(url, opts) {
  const text = await fetchText(url, opts);
  try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON from ${new URL(url).host}`); }
}

export function isoDate(ts) { return new Date(ts).toISOString().slice(0, 10); }

export function pct(a, b) { return (a == null || b == null || b === 0) ? null : (a / b - 1) * 100; }

export function round(x, d = 2) { return x == null || !isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d; }

export const WINDOWS = { '7D': 7, '30D': 30, '90D': 90, '180D': 180, '1Y': 365, '5Y': 365 * 5, '10Y': 365 * 10 };
