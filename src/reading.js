// Stored AI reading. The model is called only by an admin action or a schedule, never by a visitor.
// The result is saved with the model used, the trigger, and a fingerprint of the measured inputs so the
// page can say when the reading is older than the data it describes.
import { intelligence } from './ai.js';
import { anomalies, regime } from './analytics.js';
import { stressIndex } from './risk.js';
import { fetchJSON } from './lib/util.js';
import { ASSETS } from './universe.js';

const KEY = 'ai:reading';
const ANOM_IDS = ASSETS.filter(a => a.cls !== 'macro' || a.id === 'VIX').map(a => a.id);

/** Compact description of the state the reading would be based on. Changes when the picture changes. */
export async function fingerprint(ctx) {
  const [an, reg, st] = await Promise.all([anomalies(ctx, ANOM_IDS), regime(ctx), stressIndex(ctx).catch(() => null)]);
  const sev = an.items.filter(x => x.severity !== 'notable').map(x => `${x.id}@${x.date}`).sort();
  const notable = an.items.filter(x => x.severity === 'notable').map(x => x.id).sort();
  const band = st && st.latest != null ? (st.latest >= 75 ? 'high' : st.latest >= 55 ? 'elevated' : st.latest >= 35 ? 'normal' : 'low') : 'na';
  const latestDate = an.items.map(x => x.date).sort().pop() || null;
  return { regime: reg.label, stressBand: band, severe: sev, notable, latestDate, text: `${reg.label}|${band}|${sev.join(',')}|${notable.join(',')}` };
}

async function kvGet(env) { try { return env.CACHE && typeof env.CACHE.get === 'function' ? await env.CACHE.get(KEY, 'json') : null; } catch (e) { return null; } }
async function kvPut(env, v) { if (!env.CACHE || typeof env.CACHE.put !== 'function') throw new Error('No key-value store bound; the reading cannot be saved'); await env.CACHE.put(KEY, JSON.stringify(v)); }

/** Describe how the current picture differs from the stored fingerprint. */
function diffFingerprint(stored, now) {
  if (!stored) return ['no stored fingerprint'];
  const why = [];
  if (stored.regime !== now.regime) why.push(`regime changed from ${stored.regime} to ${now.regime}`);
  if (stored.stressBand !== now.stressBand) why.push(`stress moved from ${stored.stressBand} to ${now.stressBand}`);
  const added = now.severe.filter(x => !stored.severe.includes(x));
  if (added.length) why.push(`new high-severity anomalies: ${added.map(x => x.split('@')[0]).join(', ')}`);
  const addedN = now.notable.filter(x => !stored.notable.includes(x));
  if (addedN.length >= 2) why.push(`new anomalies: ${addedN.join(', ')}`);
  return why;
}

export async function getReading(ctx) {
  const stored = await kvGet(ctx.env);
  const now = await fingerprint(ctx);
  if (!stored) return { reading: null, stale: true, why: ['No AI reading has been generated yet.'], fingerprint: now, autoRefresh: ctx.config.keys.AI_AUTO_REFRESH || 'off' };
  const why = diffFingerprint(stored.fingerprint, now);
  const ageH = (Date.now() - new Date(stored.generatedAt).getTime()) / 36e5;
  if (ageH > 36) why.push(`generated ${Math.round(ageH / 24)} day${Math.round(ageH / 24) === 1 ? '' : 's'} ago`);
  return { reading: stored, stale: why.length > 0, why, fingerprint: now, autoRefresh: ctx.config.keys.AI_AUTO_REFRESH || 'off' };
}

export async function refreshReading(ctx, { model, question, trigger = 'admin' } = {}) {
  const r = await intelligence(ctx, { model, question });
  if (!r.aiStatus || !r.aiStatus.configured) throw new Error(r.aiStatus && r.aiStatus.message || 'Anthropic key not configured');
  if (r.aiStatus.error) throw new Error(r.aiStatus.error);
  const fp = await fingerprint(ctx);
  const stored = {
    generatedAt: new Date().toISOString(), trigger, model: r.aiStatus.model || model || ctx.config.keys.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    usage: r.aiStatus.usage || null, question: question || null,
    ai: r.ai, news: r.news && r.news.items ? { items: r.news.items, provider: r.news.provider || null } : null, newsNote: r.news && r.news.note || null,
    inputsSummary: { anomalies: r.inputs.anomalies.length, regime: r.inputs.regime.label, stress: r.inputs.stress, preCrashPresent: r.inputs.preCrashConditions ? r.inputs.preCrashConditions.lateCycleChecklist.present : [] },
    fingerprint: fp,
  };
  await kvPut(ctx.env, stored);
  return stored;
}

/** Scheduled entry point: honours the admin's auto-refresh setting. */
export async function scheduledRefresh(ctx) {
  const mode = (ctx.config.keys.AI_AUTO_REFRESH || 'off').toLowerCase();
  if (mode === 'off') return { skipped: 'auto-refresh is off' };
  if (!ctx.config.keys.ANTHROPIC_API_KEY) return { skipped: 'no Anthropic key' };
  const cur = await getReading(ctx);
  if (mode === 'on-change' && cur.reading && !cur.stale) return { skipped: 'nothing changed since the last reading' };
  if (mode === 'daily' && cur.reading && (Date.now() - new Date(cur.reading.generatedAt).getTime()) < 20 * 36e5) return { skipped: 'already refreshed in the last 20 hours' };
  const r = await refreshReading(ctx, { trigger: 'schedule' });
  return { refreshed: r.generatedAt, model: r.model };
}

/** Models available to the configured key (for the Admin selector). */
export async function listModels(config) {
  const key = config.keys.ANTHROPIC_API_KEY; if (!key) return { models: [], note: 'Add an Anthropic key to list models.' };
  const j = await fetchJSON('https://api.anthropic.com/v1/models?limit=50', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
  const models = (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id, created: m.created_at })).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  return { models, current: config.keys.ANTHROPIC_MODEL || 'claude-sonnet-5-5' };
}
