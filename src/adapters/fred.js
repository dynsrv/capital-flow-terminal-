// FRED (Federal Reserve Bank of St. Louis). Two paths:
//   - keyless CSV export (fredgraph.csv) — same official data, slower, lower rate limit
//   - official API when FRED_API_KEY is configured
import { fetchText, fetchJSON } from '../lib/util.js';

export const SOURCE = { id: 'fred', name: 'FRED (St. Louis Fed)', url: 'https://fred.stlouisfed.org', license: 'FRED terms of use; underlying series have their own licenses' };

function startDate(years) {
  const d = new Date(); d.setFullYear(d.getFullYear() - years); return d.toISOString().slice(0, 10);
}

/** Returns { points:[[date,value]], ... } for one series, last `years` years. */
export async function series(seriesId, { apiKey = '', years = 11 } = {}) {
  const cosd = startDate(years);
  let points = [];
  if (apiKey) {
    const u = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(apiKey)}&file_type=json&observation_start=${cosd}`;
    const j = await fetchJSON(u, { timeoutMs: 20000 });
    for (const o of j.observations || []) {
      if (o.value === '.' || o.value === '') continue;
      points.push([o.date, Number(o.value)]);
    }
  } else {
    const u = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}&cosd=${cosd}`;
    const csv = await fetchText(u, { timeoutMs: 25000 });
    const lines = csv.trim().split('\n');
    if (!lines.length || !/^observation_date|^DATE/i.test(lines[0])) throw new Error(`FRED: unexpected CSV for ${seriesId}`);
    for (let i = 1; i < lines.length; i++) {
      const [d, v] = lines[i].split(',');
      if (!d || v == null || v.trim() === '.' || v.trim() === '') continue;
      const n = Number(v); if (!isFinite(n)) continue;
      points.push([d.trim(), n]);
    }
  }
  if (!points.length) throw new Error(`FRED: no observations for ${seriesId}`);
  return { points, source: SOURCE.id, seriesId, url: `https://fred.stlouisfed.org/series/${seriesId}` };
}

/** Year-over-year % transform for monthly index levels (e.g. CPI). */
export function yoy(points) {
  const out = [];
  for (let i = 12; i < points.length; i++) {
    const prev = points[i - 12][1];
    if (prev) out.push([points[i][0], (points[i][1] / prev - 1) * 100]);
  }
  return out;
}
