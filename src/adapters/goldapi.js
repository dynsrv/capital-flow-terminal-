// gold-api.com — free, keyless spot prices for precious metals.
import { fetchJSON } from '../lib/util.js';

export const SOURCE = { id: 'goldapi', name: 'gold-api.com', url: 'https://gold-api.com', license: 'Free public API' };

export async function spot(symbol /* XAU | XAG */) {
  const j = await fetchJSON(`https://api.gold-api.com/price/${symbol}`);
  if (j.price == null) throw new Error(`gold-api: no price for ${symbol}`);
  return { price: j.price, currency: j.currency || 'USD', asOf: j.updatedAt || null, freshness: 'realtime', source: SOURCE.id };
}
