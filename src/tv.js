// Live TV streams for the sidebar player. Each entry is a YouTube channel whose live broadcast is embedded
// with the channel's "live_stream" embed; when a channel is not live, YouTube shows its own notice.
// Channel IDs below were verified against each channel's public feed title. Admins can edit the list.
export const DEFAULT_STREAMS = [
  { id: 'bloomberg', name: 'Bloomberg Television', group: 'Markets', channel: 'UCIALMKvObZNtJ6AmdCLP7Lg', region: 'global' },
  { id: 'yahoo', name: 'Yahoo Finance', group: 'Markets', channel: 'UCEAZeUIeJs0IjQiqTCdVSIg', region: 'global' },
  { id: 'cnbc', name: 'CNBC Television', group: 'Markets', channel: 'UCrp_UI8XtuYfpiqluWLD7Lw', region: 'global' },
  { id: 'cnbc-intl', name: 'CNBC International', group: 'Markets', channel: 'UCo7a6riBFJ3tkeHjvkXPn1g', region: 'global' },
  { id: 'bloomberg-orig', name: 'Bloomberg Originals', group: 'Markets', channel: 'UCUMZ7gohGI9HcU9VNsr2FJQ', region: 'global' },
  { id: 'idx', name: 'IDX Channel', group: 'Indonesia', channel: 'UCQA6NejSxQguRkD3L8eXHzA', region: 'indonesia' },
  { id: 'kompas', name: 'KompasTV', group: 'Indonesia', channel: 'UC5BMIWZe9isJXLZZWPWvBlg', region: 'indonesia' },
  { id: 'cna', name: 'CNA (Singapore)', group: 'World', channel: 'UC83jt4dlz1Gjl58fzQrrKZg', region: 'asia' },
  { id: 'sky', name: 'Sky News', group: 'World', channel: 'UCoMdktPbSTixAyNGwb-UYkQ', region: 'global' },
  { id: 'aljazeera', name: 'Al Jazeera English', group: 'World', channel: 'UCNye-wNBqNL5ZzHSJj3l8Bg', region: 'global' },
  { id: 'dw', name: 'DW News', group: 'World', channel: 'UCknLrEdhRCp1aegoMqRaCZg', region: 'global' },
  { id: 'france24', name: 'FRANCE 24 English', group: 'World', channel: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', region: 'global' },
];

const STORE_KEY = 'tv/streams';
export const embedUrl = (s) => s.video ? `https://www.youtube.com/embed/${encodeURIComponent(s.video)}?autoplay=1&mute=1` : `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(s.channel)}&autoplay=1&mute=1`;
export const watchUrl = (s) => s.video ? `https://www.youtube.com/watch?v=${encodeURIComponent(s.video)}` : `https://www.youtube.com/channel/${encodeURIComponent(s.channel)}/live`;

export async function getStreams(ctx) {
  let custom = null;
  if (ctx.env.__store) { try { custom = await ctx.env.__store.getJSON(STORE_KEY, { maxAgeMs: 60e3 }); } catch (e) {} }
  const list = (custom && Array.isArray(custom.streams) && custom.streams.length ? custom.streams : DEFAULT_STREAMS).map(s => ({ ...s, embed: embedUrl(s), watch: watchUrl(s) }));
  return { streams: list, custom: !!custom, updatedAt: custom ? custom.updatedAt : null };
}

/** Validate and save an admin-supplied list. Each item needs name and either a channel id (UC…) or a video id. */
export async function saveStreams(ctx, streams) {
  if (!Array.isArray(streams)) throw new Error('streams must be an array');
  const clean = streams.map((s, i) => {
    const name = String(s.name || '').trim(); const channel = String(s.channel || '').trim(); const video = String(s.video || '').trim();
    if (!name) throw new Error(`Stream ${i + 1}: name is required`);
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(channel) && !/^[A-Za-z0-9_-]{11}$/.test(video)) throw new Error(`Stream "${name}": needs a YouTube channel ID (starts with UC, 24 characters) or an 11-character video ID`);
    return { id: (s.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 40), name, group: String(s.group || 'Other').slice(0, 30), channel: channel || undefined, video: video || undefined, region: String(s.region || 'global') };
  });
  if (!ctx.env.__store || !ctx.env.__store.persistent) throw new Error('No persistent store configured; the stream list cannot be saved');
  const doc = { streams: clean, updatedAt: new Date().toISOString() };
  await ctx.env.__store.putJSON(STORE_KEY, doc);
  return doc;
}
export async function resetStreams(ctx) { if (ctx.env.__store) await ctx.env.__store.del(STORE_KEY); return { streams: DEFAULT_STREAMS }; }
