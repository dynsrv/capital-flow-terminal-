// Explicitly-labelled DEMO dataset. Only served when DEMO_MODE="true".
// Values are deterministic synthetic random walks — they are NOT market data and the UI
// shows a persistent "DEMO MODE — synthetic data" banner whenever they are in use.
import { ASSETS } from './universe.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const START = { SPX: 5000, NDX: 17500, RUT: 2000, SX5E: 4800, UKX: 7800, DAX: 17000, NKY: 38000, SHCOMP: 3000, HSI: 17000, EEM: 40, JCI: 7200, KOSPI: 2600, NIFTY: 22000,
  UST2Y: 4.5, UST10Y: 4.2, UST30Y: 4.4, T10Y2Y: -0.3, TLT: 95, IGOAS: 0.95, HYOAS: 3.2, LQD: 108, HYG: 77, EMB: 88, BUND10Y: 2.4, JGB10Y: 0.9,
  BTC: 60000, ETH: 3000, SOL: 150, USDT: 1, USDC: 1, GOLD: 2300, SILVER: 28, WTI: 78, BRENT: 82, NATGAS: 2.5, COPPER: 4.2, WHEAT: 600, CORN: 450, SOY: 1200, DBA: 24,
  DXY: 104, EURUSD: 1.08, USDJPY: 150, GBPUSD: 1.26, USDCNY: 7.2, USDIDR: 16000, VIX: 15, FEDFUNDS: 5.3, CPI: 3.2, BREAKEVEN10: 2.3, WALCL: 7400000, RRP: 500, TGA: 750, M2: 21000, ECBRATE: 4, BROADUSD: 120 };

export function demoHistory(asset) {
  const r = rng(hash(asset.id));
  const vol = asset.cls === 'crypto' ? 0.04 : asset.cls === 'commodity' ? 0.015 : asset.kind === 'yield' || asset.kind === 'spread' || asset.kind === 'level' ? 0.01 : 0.009;
  let v = START[asset.id] || 100;
  const points = [];
  const d = new Date(); d.setFullYear(d.getFullYear() - 10);
  for (let i = 0; i < 3650; i++) {
    d.setDate(d.getDate() + 1);
    if (asset.cls !== 'crypto' && (d.getDay() === 0 || d.getDay() === 6)) continue;
    const shock = (r() - 0.5) * 2 * vol;
    v = asset.kind === 'yield' || asset.kind === 'spread' ? v + shock : v * (1 + shock);
    if (asset.stablecoin) v = 1;
    points.push([d.toISOString().slice(0, 10), Math.round(v * 10000) / 10000]);
  }
  return { points, source: 'demo', freshness: 'demo', demo: true };
}

export const DEMO_QUOTES = {};
for (const a of ASSETS) {
  const h = demoHistory(a);
  const last = h.points[h.points.length - 1][1], prev = h.points[h.points.length - 2][1];
  DEMO_QUOTES[a.id] = { price: last, prevClose: prev, change: last - prev, pct1d: (last / prev - 1) * 100, volume: null, marketCap: a.cls === 'crypto' ? last * 1e7 : null, asOf: new Date().toISOString(), ageMinutes: 0, stale: false, error: null, currency: 'USD' };
}
