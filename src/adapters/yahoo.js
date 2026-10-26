// Yahoo Finance chart endpoint. No key required. Quotes are delayed (exchange dependent,
// typically 15 minutes for indices) and we label them as such. History is daily close.
import { fetchJSON, isoDate } from '../lib/util.js';

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
export const SOURCE = { id: 'yahoo', name: 'Yahoo Finance', url: 'https://finance.yahoo.com', license: 'Personal/non-commercial use; delayed data' };

function url(symbol, range, interval) {
  return `${BASE}${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`;
}

export async function quote(symbol) {
  const data = await fetchJSON(url(symbol, '5d', '1d'));
  const r = data && data.chart && data.chart.result && data.chart.result[0];
  if (!r) throw new Error(`Yahoo: no result for ${symbol}` + (data.chart && data.chart.error ? ` (${data.chart.error.description})` : ''));
  const m = r.meta || {};
  const closes = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
  const vols = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].volume) || [];
  const price = m.regularMarketPrice;
  // previous close: prefer explicit meta, else second-to-last daily close
  let prev = m.chartPreviousClose;
  const validCloses = closes.filter(c => c != null);
  if ((prev == null || prev === price) && validCloses.length >= 2) prev = validCloses[validCloses.length - 2];
  if (price == null) throw new Error(`Yahoo: no price for ${symbol}`);
  return {
    price,
    prevClose: prev ?? null,
    change: prev != null ? price - prev : null,
    pct1d: prev ? (price / prev - 1) * 100 : null,
    volume: m.regularMarketVolume ?? (vols.length ? vols[vols.length - 1] : null),
    high: m.regularMarketDayHigh ?? null,
    low: m.regularMarketDayLow ?? null,
    currency: m.currency || 'USD',
    asOf: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
    exchange: m.fullExchangeName || m.exchangeName || null,
    freshness: 'delayed',
    source: SOURCE.id,
  };
}

/** Daily close history. range: 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max */
export async function history(symbol, range = '10y') {
  const data = await fetchJSON(url(symbol, range, '1d'), { timeoutMs: 20000 });
  const r = data && data.chart && data.chart.result && data.chart.result[0];
  if (!r) throw new Error(`Yahoo: no history for ${symbol}`);
  const ts = r.timestamp || [];
  const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const closes = q.close || [];
  const vols = q.volume || [];
  const points = [];
  const volumes = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    const d = isoDate(ts[i] * 1000);
    // keep one point per date (last wins)
    if (points.length && points[points.length - 1][0] === d) { points[points.length - 1][1] = closes[i]; continue; }
    points.push([d, closes[i]]);
    volumes.push([d, vols[i] ?? null]);
  }
  return { points, volumes, source: SOURCE.id, freshness: 'eod', currency: (r.meta && r.meta.currency) || 'USD' };
}
