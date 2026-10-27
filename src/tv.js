// Live TV: broadcasters' own HLS (.m3u8) streams, played in the browser with hls.js (no YouTube).
//
// Each channel lists one or more sources tried in order. Most broadcasters allow playback from any site (CORS *),
// so the browser fetches them directly and this server carries no video traffic. A source marked `relay` goes
// through /api/hls, which adds CORS headers and any Referer the broadcaster needs; the relay only serves hosts in
// this list (or links it signed itself while rewriting a playlist), and only to this site.
// Stream addresses change without notice; admins can edit the list, and github.com/iptv-org/iptv is a good place to
// find current official addresses.
const D = (url) => ({ url }), R = (url) => ({ url, relay: true });

export const DEFAULT_CHANNELS = [
  // Markets
  { id: 'btvus', group: 'Markets', name: 'Bloomberg TV US', where: 'New York', sources: [D('https://www.bloomberg.com/media-manifest/streams/us.m3u8'), R('https://www.bloomberg.com/media-manifest/streams/us.m3u8')], referer: 'https://www.bloomberg.com/' },
  { id: 'btvplus', group: 'Markets', name: 'Bloomberg TV+', where: 'New York · originals', sources: [D('https://www.bloomberg.com/media-manifest/streams/phoenix-us.m3u8'), R('https://www.bloomberg.com/media-manifest/streams/phoenix-us.m3u8')], referer: 'https://www.bloomberg.com/' },
  { id: 'btvasia', group: 'Markets', name: 'Bloomberg TV Asia', where: 'Hong Kong · Singapore', sources: [D('https://www.bloomberg.com/media-manifest/streams/asia.m3u8'), R('https://www.bloomberg.com/media-manifest/streams/asia.m3u8')], referer: 'https://www.bloomberg.com/' },
  { id: 'btveu', group: 'Markets', name: 'Bloomberg TV Europe', where: 'London', sources: [D('https://www.bloomberg.com/media-manifest/streams/eu.m3u8'), R('https://www.bloomberg.com/media-manifest/streams/eu.m3u8')], referer: 'https://www.bloomberg.com/' },
  { id: 'btvapac', group: 'Markets', name: 'Bloomberg TV Australia', where: 'Sydney', sources: [D('https://www.bloomberg.com/media-manifest/streams/aus.m3u8'), R('https://www.bloomberg.com/media-manifest/streams/aus.m3u8')], referer: 'https://www.bloomberg.com/' },
  { id: 'cnbcarabiya', group: 'Markets', name: 'CNBC Arabiya', where: 'Dubai · Arabic', sources: [D('https://cnbc-live.akamaized.net/cnbc/master.m3u8'), R('https://cnbc-live.akamaized.net/cnbc/master.m3u8')] },
  // Indonesia
  { id: 'beritasatu', group: 'Indonesia', name: 'BeritaSatu', where: 'Jakarta · business news', sources: [R('https://xtdslboppkkv-pull.bpmedialive.com/live/beritasatu/abr.m3u8')], referer: 'https://www.beritasatu.com/' },
  { id: 'tvriworld', group: 'Indonesia', name: 'TVRI World', where: 'Jakarta · English', sources: [D('https://ott-balancer.tvri.go.id/live/eds/TVRIWorld/hls/TVRIWorld.m3u8'), R('https://ott-balancer.tvri.go.id/live/eds/TVRIWorld/hls/TVRIWorld.m3u8')] },
  { id: 'tvri', group: 'Indonesia', name: 'TVRI Nasional', where: 'Jakarta · Bahasa Indonesia', sources: [D('https://ott-balancer.tvri.go.id/live/eds/Nasional/hls/Nasional.m3u8'), R('https://ott-balancer.tvri.go.id/live/eds/Nasional/hls/Nasional.m3u8')] },
  // World news
  { id: 'aje', group: 'World News', name: 'Al Jazeera English', where: 'Doha', sources: [D('https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8'), R('https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8')] },
  { id: 'bbc', group: 'World News', name: 'BBC News', where: 'London · worldwide feed', sources: [D('https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8'), R('https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8')], referer: 'https://www.bbc.com/' },
  { id: 'france24', group: 'World News', name: 'France 24 English', where: 'Paris', sources: [D('https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_2300.m3u8'), R('https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_2300.m3u8')] },
  { id: 'dw', group: 'World News', name: 'DW English', where: 'Berlin', sources: [D('https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8'), R('https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8')] },
  { id: 'euronews', group: 'World News', name: 'Euronews English', where: 'Lyon · Brussels', sources: [D('https://cdn-euronews.akamaized.net/live/eds/euronews-en/25002/index.m3u8'), R('https://cdn-euronews.akamaized.net/live/eds/euronews-en/25002/index.m3u8')] },
  { id: 'nhkworld', group: 'World News', name: 'NHK World-Japan', where: 'Tokyo · English', sources: [D('https://media-tyo.hls.nhkworld.jp/hls/w/live/master.m3u8'), D('https://media-osa.hls.nhkworld.jp/hls/w/live/master.m3u8'), R('https://media-tyo.hls.nhkworld.jp/hls/w/live/master.m3u8')] },
  { id: 'cgtn', group: 'World News', name: 'CGTN', where: 'Beijing · English', sources: [D('https://english-livebkali.cgtn.com/live/encgtn.m3u8'), R('https://english-livebkali.cgtn.com/live/encgtn.m3u8')] },
  { id: 'abcau', group: 'World News', name: 'ABC News Australia', where: 'Sydney', sources: [D('https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8'), R('https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8')] },
  // Middle East
  { id: 'alarabiya', group: 'Middle East', name: 'Al Arabiya', where: 'Dubai · Arabic', sources: [D('https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8'), R('https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8')] },
  { id: 'skynewsarabia', group: 'Middle East', name: 'Sky News Arabia', where: 'Abu Dhabi · Arabic', sources: [D('https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8'), R('https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8')] },
];

/** Channels without a public stream: shown as links to the broadcaster's own player. */
export const LINK_OUT = [
  { name: 'CNBC Indonesia TV', url: 'https://www.cnbcindonesia.com/tv' },
  { name: 'IDX Channel', url: 'https://www.idxchannel.com/live' },
  { name: 'CNBC (US)', url: 'https://www.cnbc.com/live-tv/' },
];

const STORE_KEY = 'tv/channels';
const clean = (c) => ({ id: c.id, group: c.group, name: c.name, where: c.where || '', sources: c.sources, referer: c.referer || undefined });

export async function getChannels(ctx) {
  let custom = null;
  if (ctx.env.__store) { try { custom = await ctx.env.__store.getJSON(STORE_KEY, { maxAgeMs: 60e3 }); } catch (e) {} }
  const list = custom && Array.isArray(custom.channels) && custom.channels.length ? custom.channels : DEFAULT_CHANNELS;
  return { channels: list.map(clean), links: LINK_OUT, custom: !!custom, updatedAt: custom ? custom.updatedAt : null };
}

/** Admin edit: each channel needs a name and at least one https .m3u8 address. */
export async function saveChannels(ctx, channels) {
  if (!Array.isArray(channels)) throw new Error('channels must be an array');
  const out = channels.map((c, i) => {
    const name = String(c.name || '').trim(); if (!name) throw new Error(`Channel ${i + 1}: name is required`);
    const srcs = (Array.isArray(c.sources) ? c.sources : String(c.url || '').split(/\s+/).filter(Boolean).map(url => ({ url, relay: !!c.relay })))
      .map(s => ({ url: String(s.url || '').trim(), relay: !!s.relay || undefined })).filter(s => s.url);
    if (!srcs.length) throw new Error(`"${name}": add at least one stream address`);
    for (const s of srcs) { let u; try { u = new URL(s.url); } catch (e) { throw new Error(`"${name}": ${s.url} is not a valid address`); } if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`"${name}": stream addresses must start with https://`); }
    // a direct source gets a relay fallback automatically
    const withFallback = srcs.some(s => s.relay) ? srcs : [...srcs, { url: srcs[0].url, relay: true }];
    return { id: (c.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 40), group: String(c.group || 'Other').slice(0, 30), name, where: String(c.where || '').slice(0, 60), sources: withFallback, referer: c.referer ? String(c.referer).trim() : undefined };
  });
  if (!ctx.env.__store || !ctx.env.__store.persistent) throw new Error('No persistent store configured; the channel list cannot be saved');
  const doc = { channels: out, updatedAt: new Date().toISOString() };
  await ctx.env.__store.putJSON(STORE_KEY, doc);
  return doc;
}
export async function resetChannels(ctx) { if (ctx.env.__store) { await ctx.env.__store.del(STORE_KEY); await ctx.env.__store.del('tv/streams').catch(() => {}); } return { channels: DEFAULT_CHANNELS }; }

/* ───────── HLS relay ───────── */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-length,content-type' };
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('cft-hls:' + (secret || 'capital-flow')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
const relayUrl = async (secret, abs, ref) => `/api/hls?u=${encodeURIComponent(abs)}${ref ? `&r=${encodeURIComponent(ref)}` : ''}&s=${await hmac(secret, abs + '|' + (ref || ''))}`;

export async function hlsRelay(ctx, request, url) {
  if ((request.headers.get('sec-fetch-site') || '') === 'cross-site') return new Response('The relay serves this dashboard only', { status: 403 });
  const secret = ctx.env.STORE_SECRET || ctx.env.ADMIN_TOKEN || '';
  let target; try { target = new URL(url.searchParams.get('u') || ''); } catch (e) { return new Response('Bad stream address', { status: 400 }); }
  if (!/^https?:$/.test(target.protocol)) return new Response('Bad stream address', { status: 400 });
  const { channels } = await getChannels(ctx);
  const hosts = new Set(); let chRef = null;
  for (const ch of channels) for (const s of ch.sources) { const h = new URL(s.url).hostname; hosts.add(h); if (h === target.hostname && ch.referer) chRef = ch.referer; }
  const rParam = url.searchParams.get('r') || '';
  const ref = rParam || chRef;
  const signed = url.searchParams.get('s') && url.searchParams.get('s') === (await hmac(secret, target.href + '|' + rParam));
  if (!hosts.has(target.hostname) && !signed) return new Response('Stream host not allowed', { status: 403, headers: CORS });
  const headers = { 'user-agent': UA, accept: '*/*' };
  if (ref) { headers.referer = ref; headers.origin = new URL(ref).origin; }
  const isPlaylist = /\.m3u8?(\?|$)/i.test(target.pathname + target.search);
  let up; try { up = await fetch(target.href, { headers, redirect: 'follow' }); } catch (e) { return new Response('Stream server unreachable', { status: 502, headers: CORS }); }
  if (!up.ok) return new Response(`Stream server answered ${up.status}`, { status: up.status === 404 ? 404 : 502, headers: CORS });
  const ct = up.headers.get('content-type') || '';
  const finalUrl = new URL(up.url || target.href);
  if (/mpegurl/i.test(ct) || isPlaylist) {
    const text = await up.text();
    if (!text.trimStart().startsWith('#EXTM3U')) return new Response(text, { headers: { ...CORS, 'content-type': ct || 'application/octet-stream', 'cache-control': 'no-cache' } });
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) { out.push(line); continue; }
      if (t.startsWith('#')) {
        const m = [...t.matchAll(/URI="([^"]+)"/g)]; if (!m.length) { out.push(line); continue; }
        let nl = line; for (const mm of m) nl = nl.replace(mm[0], `URI="${await relayUrl(secret, new URL(mm[1], finalUrl).href, ref)}"`);
        out.push(nl); continue;
      }
      out.push(await relayUrl(secret, new URL(t, finalUrl).href, ref));
    }
    return new Response(out.join('\n'), { headers: { ...CORS, 'content-type': 'application/vnd.apple.mpegurl', 'cache-control': 'public, s-maxage=2, max-age=1' } });
  }
  // media segments: let the CDN share them between viewers
  return new Response(up.body, { status: up.status, headers: { ...CORS, 'content-type': ct || 'video/mp2t', 'cache-control': 'public, s-maxage=60, max-age=30' } });
}
