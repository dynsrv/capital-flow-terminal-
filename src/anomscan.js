// Detected anomalies: live or scheduled.
// live          computed when someone opens the page (cached at the edge for 5 minutes)
// daily         one stored scan a day with the nightly job (22:00 UTC, after the US close)
// twice-daily   also at 09:15 UTC, after the Tokyo, Hong Kong and Jakarta closes
// In the scheduled modes every page view reads the stored scan, which also says what is new or cleared since the
// previous scan. A short history of scans is kept for Admin. Admin can scan at any time.
import { ASSETS } from './universe.js';
import { anomalies } from './analytics.js';
import { annotateAnomalies } from './insights.js';

export const ANOM_IDS = ASSETS.filter(a => a.cls !== 'macro' || a.id === 'VIX').map(a => a.id);
const LATEST = 'anomalies/latest';
const LOG = 'anomalies/log';
const MODES = ['live', 'daily', 'twice-daily'];
export const anomalyMode = (config) => (MODES.includes(config.keys.ANOMALY_SCHEDULE) ? config.keys.ANOMALY_SCHEDULE : 'live');

function nextRun(mode, from = new Date()) {
  if (mode === 'live') return null;
  const slots = mode === 'twice-daily' ? [[9, 15], [22, 0]] : [[22, 0]];
  for (let d = 0; d < 2; d++) for (const [h, m] of slots) {
    const t = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d, h, m));
    if (t > from) return t.toISOString();
  }
  return null;
}

async function getDoc(ctx, key) { try { return ctx.env.__store ? await ctx.env.__store.getJSON(key, { maxAgeMs: 60e3 }) : null; } catch (e) { return null; } }
async function putDoc(ctx, key, v) { if (ctx.env.__store && ctx.env.__store.persistent) await ctx.env.__store.putJSON(key, v); else await ctx.cache.write('doc:' + key, { data: v, fetchedAt: Date.now() }, 30 * 86400); }
async function readDoc(ctx, key) { const v = await getDoc(ctx, key); if (v) return v; const c = await ctx.cache.read('doc:' + key); return c ? c.data : null; }

const sevRank = { notable: 1, high: 2, extreme: 3 };

/** Run a scan, store it, and log what changed against the previous stored scan. */
export async function scanAnomalies(ctx, trigger = 'admin') {
  const prev = await readDoc(ctx, LATEST);
  const an = await annotateAnomalies(ctx, await anomalies(ctx, ANOM_IDS));
  const before = new Map(((prev && prev.items) || []).map(x => [x.id, x]));
  const now = new Map(an.items.map(x => [x.id, x]));
  const added = an.items.filter(x => !before.has(x.id)).map(x => x.id);
  const cleared = [...before.keys()].filter(id => !now.has(id));
  const escalated = an.items.filter(x => before.has(x.id) && sevRank[x.severity] > sevRank[before.get(x.id).severity]).map(x => x.id);
  const doc = { ...an, scannedAt: new Date().toISOString(), trigger, changes: { added, cleared, escalated, previousScan: prev ? prev.scannedAt : null } };
  await putDoc(ctx, LATEST, doc);
  const log = (await readDoc(ctx, LOG)) || { scans: [] };
  log.scans.unshift({ at: doc.scannedAt, trigger, count: an.items.length, items: an.items.map(x => ({ id: x.id, severity: x.severity, z1: x.z1, z5: x.z5 })), added, cleared, escalated });
  log.scans = log.scans.slice(0, 60);
  await putDoc(ctx, LOG, log);
  return doc;
}

/** What the Intelligence and Overview pages show. */
export async function currentAnomalies(ctx, ids, withAnalysis = true) {
  const mode = anomalyMode(ctx.config);
  const custom = ids && ids.length && ids.join(',') !== ANOM_IDS.join(',');
  if (mode !== 'live' && !custom) {
    const doc = await readDoc(ctx, LATEST);
    if (doc) return { ...doc, mode, nextScan: nextRun(mode) };
  }
  const an = await anomalies(ctx, ids && ids.length ? ids : ANOM_IDS);
  const out = withAnalysis ? await annotateAnomalies(ctx, an) : an;
  return { ...out, mode, scannedAt: out.asOf, trigger: 'live', nextScan: mode === 'live' ? null : nextRun(mode), pending: mode !== 'live' };
}

/** Cron entry: run when the schedule includes this slot. */
export async function scheduledScan(ctx, slot) {
  const mode = anomalyMode(ctx.config);
  if (mode === 'live') return { skipped: 'anomalies are live (no schedule)' };
  if (slot === 'asia' && mode !== 'twice-daily') return { skipped: 'the 09:15 UTC scan is only in twice-daily mode' };
  const doc = await scanAnomalies(ctx, 'schedule');
  return { scanned: doc.scannedAt, count: doc.items.length, added: doc.changes.added, cleared: doc.changes.cleared };
}

export async function scanLog(ctx) { const log = await readDoc(ctx, LOG); return (log && log.scans) || []; }
export { nextRun };
