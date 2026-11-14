// News reader: opens a headline from this site's own feeds as a clean, read-only article.
//   1. The link must be one of the headlines the site is showing (news feed or credit news), so this is not an open
//      proxy for arbitrary pages.
//   2. Google News links are resolved to the publisher's URL.
//   3. The page is fetched once and run through Mozilla Readability (the engine behind Firefox Reader View), then
//      reduced to plain blocks: headings, paragraphs, lists, quotes and images. No publisher scripts, styles, ads or
//      links reach the browser; the client renders the blocks as text.
//   4. Paywalled or blocked pages come back as `partial` with whatever summary the page offers, and the reader
//      points to the original. Paywalls are never bypassed.
// Results are cached for a few hours; nothing is stored permanently.
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import { record } from './lib/usage.js';
import { fetchNews, creditNews } from './news.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const TTL = 6 * 3600;
const MAX_BYTES = 3_000_000;

async function get(url, { method = 'GET', body, headers = {}, timeoutMs = 10000, tag = 'news reader' } = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs); const t0 = Date.now(); let status = 0;
  try {
    const res = await fetch(url, { method, body, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9,id;q=0.8', ...headers } });
    status = res.status;
    const ct = res.headers.get('content-type') || '';
    let text = await res.text(); if (text.length > MAX_BYTES) text = text.slice(0, MAX_BYTES);
    try { record({ svc: new URL(url).host, op: tag, status, ms: Date.now() - t0, bytes: text.length, quiet: true }); } catch (e) {}
    return { ok: res.ok, status, url: res.url || url, text, contentType: ct };
  } catch (e) {
    try { record({ svc: new URL(url).host, op: tag, status, ms: Date.now() - t0, err: e.name === 'AbortError' ? 'timeout' : e.message, quiet: true }); } catch (x) {}
    throw e.name === 'AbortError' ? new Error('The publisher took too long to respond.') : e;
  } finally { clearTimeout(t); }
}

// ── safety: only public http(s) hosts ──
function publicUrl(u) {
  let x; try { x = new URL(u); } catch (e) { return null; }
  if (!/^https?:$/.test(x.protocol) || (x.port && !['80', '443'].includes(x.port))) return null;
  const h = x.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^\[/.test(h) || /^(\d+\.){3}\d+$/.test(h) && /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./.test(h + '.')) return null;
  if (/^(\d+\.){3}\d+$/.test(h)) return null; // no bare IPs at all
  return x;
}

// ── Google News links → publisher URL ──
async function resolveGoogle(u) {
  const x = new URL(u); if (x.hostname !== 'news.google.com') return u;
  const m = x.pathname.match(/\/(?:rss\/)?articles\/([^/?]+)/); if (!m) return u;
  const id = m[1];
  // older ids carry the URL in their base64 payload
  try {
    const raw = atob(id.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((id.length + 3) % 4));
    const hit = raw.match(/https?:\/\/[\x21-\x7e]+/); if (hit && !/AU_yqL/.test(raw.slice(0, 12))) return hit[0].replace(/[\x00-\x1f]+.*$/, '');
  } catch (e) {}
  // current ids: read the signature from the article page, then ask Google's own decoder
  const page = await get(`https://news.google.com/articles/${id}?hl=en-US&gl=US&ceid=US:en`, { tag: 'google news resolve' });
  const sg = (page.text.match(/data-n-a-sg="([^"]+)"/) || [])[1], ts = (page.text.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  if (!sg || !ts) { if (page.url && !/news\.google\.com/.test(page.url)) return page.url; throw new Error('Could not resolve the Google News link.'); }
  const req = [[['Fbv4je', `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`, null, 'generic']]];
  const r = await get('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', body: 'f.req=' + encodeURIComponent(JSON.stringify(req)), headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, tag: 'google news resolve' });
  const line = r.text.split('\n').find(l => l.includes('garturlres')); if (!line) throw new Error('Could not resolve the Google News link.');
  const outer = JSON.parse(line); const inner = JSON.parse(outer[0][2]); if (!inner || !inner[1]) throw new Error('Could not resolve the Google News link.');
  return inner[1];
}

// ── HTML → plain blocks ──
const clean = (s) => String(s || '').replace(/\[(?:Gambas|Embed|Video|Baca juga)[^\]]*\]/gi, '').replace(/ /g, ' ').replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
const absUrl = (src, base) => { try { const x = new URL(src, base); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } };
const BOILER = /^(advertisement|iklan|scroll to continue|baca juga|read more|related|share this|subscribe|sign up|updated \d+ (minutes?|hours?|days?) ago|published \d+ (minutes?|hours?|days?) ago)\b/i;
const BYLINE = /^by\s?[A-Z][^.]{0,90}$/;
const FOLLOW = /(you're|you are) currently following this author|click to (un)?subscribe from email alerts|follow (this )?author/i;
// Same picture at different sizes or CDN variants → one key (path without query, size tokens and extension).
export const imgKey = (u) => { try { const x = new URL(u); let k = decodeURIComponent(x.pathname).toLowerCase(); const inner = k.match(/https?:\/\/.+$/); if (inner) k = new URL(inner[0]).pathname.toLowerCase(); return k.replace(/\/(w|h|c|q|f|fit|crop|resize|width|height)[_=,:][^/]*/g, '/').replace(/[-_.@]?\d{2,4}x\d{2,4}/g, '').replace(/[-_]?(small|medium|large|thumb|thumbnail|scaled|original)(?=\.|$)/g, '').replace(/(\.(jpe?g|png|webp|avif|gif))+$/, '').replace(/\/(\d{3,4})(?=\/)/g, '/').replace(/\/+/g, '/'); } catch (e) { return u; } };

function toBlocks(html, base) {
  const { document } = parseHTML(`<!doctype html><html><body><div id="r">${html}</div></body></html>`);
  const out = []; const seenImg = new Set();
  const push = (b) => { if (b.text != null && (!b.text || BOILER.test(b.text) || (out.length < 4 && BYLINE.test(b.text)) || FOLLOW.test(b.text) || /^\([a-z0-9/.,\s-]{1,24}\)$/i.test(b.text))) return; out.push(b); };
  const walk = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType !== 1) { if (n.nodeType === 3 && clean(n.textContent).length > 40 && el.id === 'r') push({ t: 'p', text: clean(n.textContent) }); continue; }
      const tag = n.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) push({ t: 'h', level: Math.min(4, Math.max(2, Number(tag[1]))), text: clean(n.textContent) });
      else if (tag === 'p') { const imgs = n.querySelectorAll('img'); const tx = clean(n.textContent); if (tx) push({ t: 'p', text: tx }); else imgs.forEach(i => img(i)); }
      else if (tag === 'ul' || tag === 'ol') { const items = [...n.querySelectorAll(':scope > li')].map(li => clean(li.textContent)).filter(Boolean); if (items.length) out.push({ t: 'list', ordered: tag === 'ol', items }); }
      else if (tag === 'blockquote') push({ t: 'quote', text: clean(n.textContent) });
      else if (tag === 'figure') { const i = n.querySelector('img'); if (i) img(i, clean((n.querySelector('figcaption') || {}).textContent)); }
      else if (tag === 'img') img(n);
      else if (tag === 'pre') push({ t: 'p', text: clean(n.textContent) });
      else if (tag === 'table') { const tx = clean(n.textContent); if (tx) push({ t: 'p', text: tx.slice(0, 600) }); }
      else walk(n);
    }
  };
  const img = (i, caption) => {
    const src = absUrl(i.getAttribute('src') || i.getAttribute('data-src') || (i.getAttribute('srcset') || '').split(/\s+/)[0], base);
    if (!src || seenImg.has(imgKey(src)) || /\.(svg|gif)(\?|$)/i.test(src) || /pixel|tracking|logo|avatar|icon/i.test(src)) return;
    seenImg.add(imgKey(src)); out.push({ t: 'img', src, alt: clean(i.getAttribute('alt')), caption: caption || '' });
  };
  walk(document.getElementById('r'));
  // merge duplicates and drop trailing boilerplate
  return out.filter((b, k) => !(b.t === 'p' && k > 0 && out[k - 1].t === 'p' && out[k - 1].text === b.text)).slice(0, 400);
}

const meta = (doc, ...names) => { for (const n of names) { const el = doc.querySelector(`meta[property="${n}"]`) || doc.querySelector(`meta[name="${n}"]`); const v = el && el.getAttribute('content'); if (v) return clean(v); } return ''; };

async function extract(url) {
  const page = await get(url);
  if (!page.ok) { const e = new Error(page.status === 403 || page.status === 401 ? 'The publisher does not allow this article to be read outside its site.' : `The publisher answered HTTP ${page.status}.`); e.status = page.status; e.finalUrl = page.url; throw e; }
  if (!/html|xml/.test(page.contentType)) throw new Error('This link is not an article page.');
  const { document } = parseHTML(page.text);
  const base = page.url;
  const info = {
    url: base, site: meta(document, 'og:site_name', 'application-name') || new URL(base).hostname.replace(/^www\./, ''),
    title: meta(document, 'og:title', 'twitter:title') || clean((document.querySelector('title') || {}).textContent),
    description: meta(document, 'og:description', 'description', 'twitter:description'),
    image: absUrl(meta(document, 'og:image', 'twitter:image'), base),
    published: meta(document, 'article:published_time', 'og:published_time', 'pubdate', 'date'),
    author: meta(document, 'author', 'article:author'),
    lang: (document.documentElement && document.documentElement.getAttribute('lang')) || '',
  };
  let art = null; try { art = new Readability(document, { charThreshold: 300, keepClasses: false }).parse(); } catch (e) { art = null; }
  const blocks = art && art.content ? toBlocks(art.content, base) : [];
  const words = blocks.reduce((t, b) => t + (b.text ? b.text.split(/\s+/).length : b.items ? b.items.join(' ').split(/\s+/).length : 0), 0);
  // the lead (og:image) is shown as the hero, so drop any copy of it from the body
  if (info.image) { const hk = imgKey(info.image); for (let k = blocks.length - 1; k >= 0; k--) if (blocks[k].t === 'img' && imgKey(blocks[k].src) === hk) blocks.splice(k, 1); }
  // and if the body starts with a picture while the page has no og:image, promote it to the hero
  if (!info.image && blocks[0] && blocks[0].t === 'img') info.image = blocks.shift().src;
  return {
    ...info, title: (art && art.title) || info.title, author: clean((art && art.byline) || info.author), site: clean((art && art.siteName) || info.site),
    published: (art && art.publishedTime) || info.published, excerpt: clean((art && art.excerpt) || info.description),
    blocks, words, minutes: Math.max(1, Math.round(words / 220)), partial: words < 120,
  };
}

/** Is `link` one of the headlines the site currently shows? */
async function known(ctx, link) {
  const [feed, credit] = await Promise.all([fetchNews(ctx).catch(() => null), creditNews(ctx).catch(() => null)]);
  const items = [...((feed && feed.items) || []), ...((credit && credit.items) || [])];
  return items.find(it => (it.link || it.url) === link) || null;
}

export async function readArticle(ctx, link) {
  if (!link || !publicUrl(link)) throw Object.assign(new Error('Not a valid article link.'), { status: 400 });
  const item = await known(ctx, link);
  if (!item) throw Object.assign(new Error('Only headlines shown on this site can open in the reader.'), { status: 404 });
  const r = await ctx.cache.resolve('reader3:' + link, TTL, async () => {
    const target = await resolveGoogle(link);
    if (!publicUrl(target)) throw new Error('The article address is not a public web page.');
    try { return await extract(target); }
    catch (e) { return { url: e.finalUrl || target, site: item.source || new URL(target).hostname, title: item.title, blocks: [], words: 0, minutes: 0, partial: true, blocked: true, reason: e.message }; }
  });
  if (!r.data) throw Object.assign(new Error(r.error || 'Could not open this article.'), { status: 502 });
  return { ...r.data, headline: item.title, source: item.source, publishedAt: item.publishedAt, original: link, cachedAt: r.fetchedAt };
}
