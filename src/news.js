// News feed: global and Indonesian headlines on markets, finance and geopolitics.
// Sources are public RSS feeds (no keys). Items are categorised by keyword rules; when an Anthropic key is
// configured and NEWS_AI_CURATION is on, an admin or the daily job can ask the model to rank and annotate
// the headlines. The model only sees titles, sources and dates: it does not browse.
import { fetchText, fetchJSON } from './lib/util.js';
import { callClaudeJson } from './lib/claude.js';

const gn = (q, lang) => (lang === 'id' ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id` : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`);

export const SOURCES = [
  // Global markets & finance
  { id: 'gn-markets', name: 'Google News · markets', region: 'global', cat: 'market', url: gn('stock market OR "bond market" OR treasury yields OR "Wall Street" when:1d', 'en') },
  { id: 'gn-central', name: 'Google News · central banks', region: 'global', cat: 'financial', url: gn('"Federal Reserve" OR ECB OR "Bank of Japan" OR "rate decision" OR inflation when:1d', 'en') },
  { id: 'gn-geo', name: 'Google News · geopolitics', region: 'global', cat: 'geopolitical', url: gn('geopolitical OR sanctions OR tariffs OR "Middle East" OR Taiwan OR Ukraine markets when:1d', 'en') },
  { id: 'gn-commod', name: 'Google News · commodities & crypto', region: 'global', cat: 'market', url: gn('oil prices OR gold price OR bitcoin OR OPEC when:1d', 'en') },
  { id: 'gn-credit', name: 'Google News · credit & bonds', region: 'global', cat: 'financial', url: gn('"credit spreads" OR "high yield" OR "junk bonds" OR "investment grade" OR downgrade OR "bond yields" OR "emerging market bonds" when:2d', 'en'), topic: 'credit' },
  { id: 'gn-id-bonds', name: 'Google News · obligasi & SBN', region: 'indonesia', cat: 'financial', url: gn('SBN OR "obligasi negara" OR "yield SUN" OR "surat utang" OR "imbal hasil" OR "kepemilikan asing" when:3d', 'id'), topic: 'credit' },
  { id: 'mw', name: 'MarketWatch', region: 'global', cat: 'market', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', strict: true },
  { id: 'bbc-biz', name: 'BBC Business', region: 'global', cat: 'financial', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'aj', name: 'Al Jazeera', region: 'global', cat: 'geopolitical', url: 'https://www.aljazeera.com/xml/rss/all.xml', strict: true },
  // Indonesia
  { id: 'cnbc-id', name: 'CNBC Indonesia · Market', region: 'indonesia', cat: 'market', url: 'https://www.cnbcindonesia.com/market/rss' },
  { id: 'antara-eko', name: 'Antara · Ekonomi', region: 'indonesia', cat: 'financial', url: 'https://www.antaranews.com/rss/ekonomi.xml' },
  { id: 'gn-id-market', name: 'Google News · pasar', region: 'indonesia', cat: 'market', url: gn('IHSG OR "Bursa Efek" OR rupiah OR "Bank Indonesia" OR "obligasi negara" OR "Sri Mulyani" OR OJK when:1d', 'id') },
  { id: 'gn-id-geo', name: 'Google News · geopolitik', region: 'indonesia', cat: 'geopolitical', url: gn('geopolitik OR tarif OR ekspor OR "Timur Tengah" OR Tiongkok ekonomi when:1d', 'id') },
  { id: 'gn-id-en', name: 'Google News · Indonesia economy (EN)', region: 'indonesia', cat: 'financial', url: gn('Indonesia economy OR "Bank Indonesia" OR Jakarta stocks OR rupiah when:2d', 'en') },
];

const KW = {
  geopolitical: /\b(war|sanction|tariff|geopolit|missile|ceasefire|election|nato|iran|israel|gaza|ukraine|russia|taiwan|china|beijing|trump|summit|diplomat|military|strike|invasion|houthi|hormuz|opec|embargo|conflict|perang|sanksi|tarif|geopolitik|militer|konflik|pemilu|diplomasi|timur tengah|tiongkok|serangan)\b/i,
  financial: /\b(fed|federal reserve|ecb|boj|bank of japan|central bank|rate (cut|hike|decision)|inflation|cpi|gdp|jobs|payroll|unemployment|earnings|bank|credit|debt|deficit|budget|treasury|ipo|bank indonesia|bi rate|suku bunga|inflasi|apbn|utang|fiskal|pajak|kredit|perbankan|laba|dividen)\b/i,
  market: /\b(stock|stocks|shares|equit|index|nasdaq|dow|s&p|bond|yield|dollar|yen|euro|gold|oil|crude|brent|bitcoin|crypto|etf|futures|rally|sell-?off|slump|surge|ihsg|saham|bursa|rupiah|obligasi|emas|minyak|bitcoin|reksa dana|investor)\b/i,
};
const relevant = (t) => KW.geopolitical.test(t) || KW.financial.test(t) || KW.market.test(t);
function classify(title, fallback) { if (KW.geopolitical.test(title)) return 'geopolitical'; if (KW.financial.test(title)) return 'financial'; if (KW.market.test(title)) return 'market'; return fallback; }

const dec = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/\s+/g, ' ').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };

export function parseRss(xml, src) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi; let m;
  while ((m = re.exec(xml)) && items.length < 40) {
    const x = m[1];
    let title = dec(tag(x, 'title')); const link = dec(tag(x, 'link')) || (x.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const pub = dec(tag(x, 'pubDate') || tag(x, 'dc:date') || tag(x, 'published'));
    let source = dec(tag(x, 'source')) || src.name;
    if (src.id.startsWith('gn-')) { const i = title.lastIndexOf(' - '); if (i > 20) { source = title.slice(i + 3).trim() || source; title = title.slice(0, i).trim(); } }
    if (!title || !link) continue;
    if (/investing\.com/i.test(source) && /^(mengapa|why) /i.test(title)) continue; // auto-generated single-stock pieces
    if (src.strict && !relevant(title)) continue; // general feeds: keep only market/finance/geopolitics headlines
    const ts = pub ? Date.parse(pub) : NaN;
    items.push({ title, link, source, publishedAt: isNaN(ts) ? null : new Date(ts).toISOString(), region: src.region, cat: classify(title, src.cat), feed: src.id });
  }
  return items;
}

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9À-ɏ ]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 8).join(' ');

export async function fetchNews(ctx) {
  const { cache } = ctx;
  const perSource = await Promise.all(SOURCES.map(async (src) => {
    const r = await cache.resolve(`news:${src.id}`, 600, async () => parseRss(await fetchText(src.url, { timeoutMs: 12000 }), src));
    return { src, items: r.data || [], error: r.error || null, stale: r.stale, fetchedAt: r.fetchedAt };
  }));
  const seen = new Map(); const items = [];
  for (const { items: list } of perSource) for (const it of list) { const k = norm(it.title); if (!k || seen.has(k)) continue; seen.set(k, 1); items.push(it); }
  const cutoff = Date.now() - 3 * 86400e3;
  const fresh = items.filter(i => !i.publishedAt || Date.parse(i.publishedAt) > cutoff);
  fresh.sort((a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0));
  return { items: fresh.slice(0, 160), sources: perSource.map(p => ({ id: p.src.id, name: p.src.name, region: p.src.region, count: p.items.length, error: p.error, stale: p.stale, fetchedAt: p.fetchedAt ? new Date(p.fetchedAt).toISOString() : null })), asOf: new Date().toISOString() };
}

/* ───────── AI curation (optional, admin or daily job) ───────── */
const CURATE_SYSTEM = `You curate a market-intelligence news panel for an institutional reader covering global and Indonesian markets.
You receive headlines only (title, source, time, region). You cannot browse. Return only the JSON object, with no code fence and no text around it:
{"picks":[{"i":<index>,"score":0-100,"cat":"market|financial|geopolitical","why":"<=18 words on why it matters for markets","assets":["SPX","UST10Y","DXY","WTI","GOLD","BTC","IDR","JCI",...]}],"themes":["<=6 words"...]}
Rules: pick the 20-30 most market-relevant headlines, prefer concrete events over commentary, keep at least 6 Indonesian items when available, never invent facts beyond the headline, no duplicates, assets only from the universe list given.`;

export async function curateNews(ctx, { model } = {}) {
  const { config, env } = ctx; const key = config.keys.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic key not configured');
  const feed = await fetchNews(ctx);
  const lines = feed.items.slice(0, 120).map((it, i) => `${i}\t${it.region}\t${it.source}\t${it.publishedAt ? it.publishedAt.slice(0, 16) : 'n.d.'}\t${it.title}`).join('\n');
  const j = await callClaudeJson(key, { model: model || config.keys.ANTHROPIC_MODEL || 'claude-sonnet-5-5', system: CURATE_SYSTEM, user: `Asset universe: SPX NDX RUT SX5E NKY SHCOMP HSI EEM JCI KOSPI NIFTY UST2Y UST10Y HYOAS BTC ETH GOLD SILVER WTI BRENT NATGAS COPPER DXY EURUSD USDJPY USDCNY USDIDR VIX\n\nHEADLINES (index<TAB>region<TAB>source<TAB>time<TAB>title):\n${lines}`, tag: 'news curation' });
  const parsed = j.json;
  const picks = (parsed.picks || []).filter(p => feed.items[p.i]).map(p => ({ ...feed.items[p.i], score: p.score, cat: p.cat || feed.items[p.i].cat, why: p.why, assets: p.assets || [], curated: true })).sort((a, b) => b.score - a.score);
  const out = { curatedAt: new Date().toISOString(), model: j.model, themes: parsed.themes || [], picks, usage: j.usage || null };
  if (env.__store && env.__store.persistent) await env.__store.putJSON('news/curated', out); else await ctx.cache.write('news:curated', { data: out, fetchedAt: Date.now() }, 86400);
  return out;
}
export async function getCurated(ctx) {
  if (ctx.env.__store) { try { const v = await ctx.env.__store.getJSON('news/curated', { maxAgeMs: 60e3 }); if (v) return v; } catch (e) {} }
  const c = await ctx.cache.read('news:curated'); return c ? c.data : null;
}

/* ───────── Credit and bond headlines for the Fixed Income Credit Monitor ───────── */
const CREDIT_RE = /\b(bond|bonds|yield|yields|treasur|credit|spread|high[- ]yield|junk|investment[- ]grade|downgrade|upgrade|default|rating|moody|fitch|s&p global|sovereign|debt|sukuk|obligasi|sbn|sun\b|surat utang|imbal hasil|kupon|lelang|emerging market|em debt|rupiah|bank indonesia|fed |federal reserve|rate cut|rate hike|ecb|boj)/i;
const NOT_CREDIT_RE = /savings rate|savings account|\bcd rate|certificate of deposit|mortgage rate|refinanc|credit card|personal loan|auto loan|student loan|deposito|kpr\b|kartu kredit/i;
export async function creditNews(ctx) {
  const feed = await fetchNews(ctx);
  const bySrc = Object.fromEntries(SOURCES.map(s => [s.id, s]));
  // the credit feeds in full (the main feed is capped at 160 items), plus any other headline that reads as credit or rates
  const extra = []; for (const src of SOURCES.filter(x => x.topic === 'credit')) { const c = await ctx.cache.read(`news:${src.id}`); if (c && Array.isArray(c.data)) extra.push(...c.data); }
  const seen = new Set(); const items = [];
  for (const it of [...extra, ...feed.items]) { const k = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (seen.has(k)) continue; if (NOT_CREDIT_RE.test(it.title)) continue; if (!((bySrc[it.feed] && bySrc[it.feed].topic === 'credit') || CREDIT_RE.test(it.title))) continue; seen.add(k); items.push(it); }
  items.sort((a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0));
  const tag = (t) => /sbn|obligasi|rupiah|indonesia|sukuk|surat utang|imbal hasil|bank indonesia|lelang|\bsun\b|\bri\b|jakarta|ihsg|kemenkeu|sri mulyani/i.test(t) ? 'Indonesia' : /emerging|\bem\b|asia|china|india|brazil|mexico|turkey|south africa/i.test(t) ? 'EM' : 'Global';
  const pressureHint = (t) => /downgrade|default|distress|sell-?off|selloff|widen|jump|surge|spike|outflow|dump|junk|rout|slump|plunge|tumble|cut to junk|restructur/i.test(t) ? 'pressure' : /upgrade|tighten|rally|inflow|record low|narrow|demand|oversubscribed/i.test(t) ? 'relief' : null;
  return { items: items.slice(0, 24).map(it => ({ title: it.title, url: it.link, source: it.source, publishedAt: it.publishedAt, region: it.region, market: tag(it.title), tone: pressureHint(it.title) })), fetchedAt: new Date().toISOString() };
}
