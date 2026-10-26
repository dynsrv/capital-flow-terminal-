// U.S. Energy Information Administration — official daily spot prices (requires free API key).
import { fetchJSON } from '../lib/util.js';

export const SOURCE = { id: 'eia', name: 'U.S. EIA', url: 'https://www.eia.gov/opendata/', license: 'Public domain (US government)' };

export const SERIES = {
  WTI: { id: 'RWTC', label: 'WTI Cushing spot' },
  BRENT: { id: 'RBRTE', label: 'Brent Europe spot' },
  NATGAS: { id: 'RNGWHHD', label: 'Henry Hub spot' },
};

export async function latest(seriesId, apiKey) {
  if (!apiKey) throw new Error('EIA_API_KEY not configured');
  const u = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${encodeURIComponent(apiKey)}&frequency=daily&data[0]=value&facets[series][]=${seriesId}&sort[0][column]=period&sort[0][direction]=desc&length=2`;
  const j = await fetchJSON(u);
  const rows = (j.response && j.response.data) || [];
  if (!rows.length) throw new Error(`EIA: no data for ${seriesId}`);
  return { price: Number(rows[0].value), prevClose: rows[1] ? Number(rows[1].value) : null, asOf: rows[0].period, freshness: 'eod', source: SOURCE.id, units: rows[0].units };
}
