/* Capital Flow Terminal — front end. Vanilla JS + ECharts.
   Every number on screen comes from /api/* (or an embedded, bannered snapshot of it). Nothing is invented client-side. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* ───────── icons (Lucide-style outlines, inline) ───────── */
  const P = {
    logo: '<path d="M4 17l6-6 4 4 7-8"/><path d="M15 7h6v6"/>',
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    monitor: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    flows: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
    analytics: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    risk: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    intel: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    shock: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    admin: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    droplet: '<path d="M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0z"/>',
    bank: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    line: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.4-6.4 2.1 2.1-6.4z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    scatter: '<circle cx="7.5" cy="7.5" r="1.5"/><circle cx="18.5" cy="5.5" r="1.5"/><circle cx="11.5" cy="11.5" r="1.5"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="17.5" cy="14.5" r="1.5"/><path d="M3 3v18h18"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.4.3 1.7 1.3 2.9 2.5 2.9z"/>',
    swap: '<path d="M7 16V4M3 8l4-4 4 4"/><path d="M17 8v12M21 16l-4 4-4-4"/>',
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const paintIcons = (root = document) => $$('[data-icon]', root).forEach(e => { if (!e.querySelector('svg')) e.innerHTML = ic(e.dataset.icon) + e.innerHTML; });

  /* ───────── view registry ───────── */
  const VIEWS = {
    overview: { label: 'Overview', icon: 'overview', title: 'Global overview', sub: 'Where capital sits, how markets moved, and what to watch next' },
    monitor: { label: 'Monitor', icon: 'monitor', title: 'Market monitor', sub: 'Every tracked instrument with source, freshness and history' },
    flows: { label: 'Flows', icon: 'flows', title: 'Capital flows', sub: 'Measured balance changes only. Price and volume are never treated as flows' },
    analytics: { label: 'Analytics', icon: 'analytics', title: 'Cross-asset analytics', sub: 'What moves together, what moves against, and what is changing' },
    risk: { label: 'Risk & Signals', icon: 'risk', title: 'Risk & signals', sub: 'Market stress, tail risk, drawdowns and trend inflection points', tag: 'new' },
    intel: { label: 'Intelligence', icon: 'intel', title: 'Market intelligence', sub: 'Anomalies, historical pattern checks and AI explanations' },
    shock: { label: 'Shock Sim', icon: 'shock', title: 'Shock simulator', sub: 'Historical sensitivities applied to a hypothetical move' },
    admin: { label: 'Admin', icon: 'admin', title: 'Admin', sub: 'API credentials, source health and reference data' },
  };
  const PRIMARY_MOBILE = ['overview', 'monitor', 'analytics', 'risk'];

  /* ───────── state ───────── */
  const state = {
    view: 'overview', universe: null, perf: [], loadedAt: null,
    watchlist: store.get('cft:watchlist', ['SPX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'VIX', 'HYOAS']),
    monitor: { cls: 'all', region: 'all', q: '', horizon: '1D', sortKey: 'cls', sortAsc: true, watchOnly: false },
    analytics: { window: '30D', ids: ['SPX', 'NDX', 'SX5E', 'NKY', 'EEM', 'UST10Y', 'TLT', 'HYG', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'DXY', 'VIX'], relWindow: '1Y', relIds: ['SPX', 'EEM', 'BTC', 'GOLD', 'TLT', 'DXY'], rollA: 'SPX', rollB: 'UST10Y', rollWindow: '1Y', anchor: 'SPX' },
    risk: { trendId: 'SPX', trendWindow: '1Y', dir: 'all', sortKey: 'volPct', sortAsc: false },
    shock: { driver: 'SPX', value: -10, window: '1Y', betas: null },
    admin: { token: (() => { try { return sessionStorage.getItem('cft:admin') || ''; } catch (e) { return ''; } })() },
  };

  /* ───────── API ───────── */
  const SNAP = window.CFT_SNAPSHOT || null;
  let apiBase = store.get('cft:apiBase', '') || '';
  const snapKey = (path) => path.split('?')[0] + '?' + (path.split('?')[1] || '').split('&').filter(Boolean).sort().join('&');
  async function api(path, opts = {}) {
    if (SNAP && !apiBase) {
      const hit = SNAP.data[snapKey(path)];
      if (hit) return hit;
      throw new Error('This view is not in the embedded snapshot. Connect a deployed API (link icon, top right) for live queries.');
    }
    const r = await fetch((apiBase ? apiBase.replace(/\/$/, '') : '') + '/api' + path, opts);
    const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
    if (!j.ok) throw new Error(j.error || `API error ${r.status}`);
    $('#demo-banner').hidden = !j.demoMode;
    return j;
  }

  /* ───────── formatting ───────── */
  const isDiff = (row) => !!row && (row.kind === 'yield' || row.kind === 'spread' || (row.kind === 'level' && String(row.unit || '').startsWith('%')));
  const fmt = {
    px(v) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); const d = a >= 10000 ? 0 : a >= 100 ? 2 : a >= 1 ? 2 : 4; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); },
    pct(v, d = 2) { if (v == null || !isFinite(v)) return '—'; return (v > 0 ? '+' : '') + v.toFixed(d) + '%'; },
    bp(v) { if (v == null || !isFinite(v)) return '—'; return (v > 0 ? '+' : '') + Math.round(v * 100) + ' bp'; },
    chg(row, v) { return isDiff(row) ? fmt.bp(v) : fmt.pct(v); },
    big(v) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'; if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K'; return String(Math.round(v)); },
    usd(v) { return v == null ? '—' : '$' + fmt.big(v); },
    sbig(v) { return v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + fmt.big(Math.abs(v)); },
    ago(iso) { if (!iso) return '—'; const m = (Date.now() - new Date(iso)) / 60000; if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + 'm ago'; if (m < 2880) return Math.round(m / 60) + 'h ago'; return Math.round(m / 1440) + 'd ago'; },
    time(iso) { return iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + 'Z' : '—'; },
    date(iso) { return iso ? String(iso).slice(0, 10) : '—'; },
  };
  const tone = (v) => v == null ? 'muted' : v > 0 ? 'up' : v < 0 ? 'down' : '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const badge = (q) => { const f = q.stale ? 'stale' : (q.error && !q.available) ? 'error' : (q.freshness || 'eod'); const t = q.stale ? 'Stale: showing the last cached value. Source error: ' + (q.error || '') : 'Data freshness: ' + f; return `<span class="badge ${f}" title="${esc(t)}">${f === 'realtime' ? 'live' : f}</span>`; };
  const heat = (v, max) => { if (v == null || !isFinite(v)) return 'var(--surface-2)'; const t = Math.max(-1, Math.min(1, v / (max || 1))); const p = Math.round(10 + 52 * Math.abs(t)); return `color-mix(in srgb, var(${t >= 0 ? '--up' : '--down'}) ${p}%, var(--surface-2))`; };
  const tok = () => { const g = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return { fg: g('--fg'), fg2: g('--fg-2'), fg3: g('--fg-3'), line: g('--line'), line2: g('--line-2'), surface: g('--surface'), surface2: g('--surface-2'), bg: g('--bg'), accent: g('--accent'), blue: g('--blue'), violet: g('--violet'), teal: g('--teal'), up: g('--up'), down: g('--down'), warn: g('--warn'), mono: g('--mono') }; };
  const CLS_COLOR = (T) => ({ equity: T.accent, rates: T.blue, credit: T.violet, crypto: '#c084fc', commodity: T.teal, fx: '#f472b6', macro: T.fg3 });
  const series = (T) => [T.accent, T.blue, T.up, T.down, T.violet, T.teal, '#f472b6', '#facc15', '#60a5fa', '#fb923c'];

  /* ───────── charts (ResizeObserver keeps every chart sized to its card) ───────── */
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(entries => entries.forEach(e => { const c = window.echarts && echarts.getInstanceByDom(e.target); if (c) c.resize(); })) : null;
  function chart(target, option) {
    const node = typeof target === 'string' ? $(target) : target; if (!node) return null;
    if (typeof echarts === 'undefined') { node.innerHTML = `<div class="empty">${ic('alert')}Chart library unavailable. The tables on this page still carry the data.</div>`; return null; }
    let c = echarts.getInstanceByDom(node);
    if (!c) { c = echarts.init(node, null, { renderer: 'canvas' }); if (ro) ro.observe(node); }
    const T = tok();
    c.setOption({ backgroundColor: 'transparent', textStyle: { fontFamily: T.mono, color: T.fg2, fontSize: 11 }, animationDuration: 350, tooltip: { backgroundColor: T.surface, borderColor: T.line2, textStyle: { color: T.fg, fontSize: 12 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);' }, ...option, ...(option.tooltip ? { tooltip: { backgroundColor: T.surface, borderColor: T.line2, textStyle: { color: T.fg, fontSize: 12 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);', ...option.tooltip } } : {}) }, true);
    return c;
  }
  const axis = (T, extra = {}) => ({ axisLine: { lineStyle: { color: T.line2 } }, axisTick: { show: false }, axisLabel: { color: T.fg3, fontSize: 10.5 }, splitLine: { lineStyle: { color: T.line, type: 'dashed' } }, ...extra });
  const narrow = () => window.innerWidth < 760;

  const areaSpark = (vals, w = 240, h = 42) => {
    if (!vals || vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals);
    const pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 2 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const col = vals[vals.length - 1] >= vals[0] ? 'var(--up)' : 'var(--down)';
    const last = pts[pts.length - 1];
    return `<svg class="area" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d} L${w} ${h} L0 ${h}Z" fill="${col}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${col}"/></svg>`;
  };
  const spark = (vals) => { if (!vals || vals.length < 2) return ''; const w = 76, h = 22, mn = Math.min(...vals), mx = Math.max(...vals); const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 2 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (h - 4)).toFixed(1)}`).join(' '); return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="var(${vals[vals.length - 1] >= vals[0] ? '--up' : '--down'})" stroke-width="1.4" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`; };

  /* ───────── UI building blocks ───────── */
  const card = ({ icon, title, sub, actions = '', body = '', bodyClass = '', foot = '', id = '', cls = '' }) => `<section class="card ${cls}" ${id ? `id="${id}"` : ''}><div class="card-h"><div class="t">${icon ? `<span class="ic">${ic(icon)}</span>` : ''}<div style="min-width:0"><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div></div>${actions ? `<div class="actions">${actions}</div>` : ''}</div><div class="card-b ${bodyClass}">${body}</div>${foot ? `<div class="card-f">${foot}</div>` : ''}</section>`;
  const loading = (msg = 'Loading…') => `<div class="loading"><span class="spin"></span>${esc(msg)}</div>`;
  const emptyState = (msg, icon = 'info') => `<div class="empty">${ic(icon)}${esc(msg)}</div>`;
  const errorBox = (msg) => `<div class="callout err">${ic('alert')}<div>${esc(msg)}</div></div>`;
  function seg(opts, cur, onPick, cls = 'mono') {
    const d = document.createElement('div'); d.className = 'seg ' + cls; d.setAttribute('role', 'tablist');
    d.innerHTML = opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" data-v="${esc(v)}" class="${v === cur ? 'active' : ''}">${esc(l)}</button>`; }).join('');
    d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', d).forEach(x => x.classList.toggle('active', x === b)); onPick(b.dataset.v); });
    return d;
  }
  const mount = (sel, node) => { const t = $(sel); if (t) { t.innerHTML = ''; t.appendChild(node); } };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600); }
  const assetOpts = (cur, filter = () => true) => state.universe.assets.filter(filter).map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.id} · ${esc(a.name)}</option>`).join('');

  /* overlay management */
  function openScrim(onClose) { const s = $('#scrim'); s.hidden = false; s.onclick = () => { closeOverlays(); onClose && onClose(); }; }
  function closeOverlays() { $('#scrim').hidden = true; $('#drawer').hidden = true; $('#sheet').hidden = true; $('#popover').hidden = true; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

  /* asset picker popover */
  function pickAssets(anchor, current, onApply) {
    const pop = $('#popover'); const sel = new Set(current);
    const groups = {}; state.universe.assets.filter(a => a.cls !== 'macro' || a.id === 'VIX').forEach(a => (groups[a.cls] ||= []).push(a));
    const render = (q = '') => {
      $('.pop-b', pop).innerHTML = Object.entries(groups).map(([c, arr]) => { const items = arr.filter(a => !q || (a.id + ' ' + a.name).toLowerCase().includes(q)); if (!items.length) return ''; return `<div class="pop-g">${esc(state.universe.classes[c])}</div><div class="pop-grid">${items.map(a => `<label class="pop-item" title="${esc(a.name)}"><input type="checkbox" value="${a.id}" ${sel.has(a.id) ? 'checked' : ''}><b>${a.id}</b><span>${esc(a.name)}</span></label>`).join('')}</div>`; }).join('') || emptyState('No matches');
    };
    pop.innerHTML = `<div class="pop-h"><label class="search">${ic('search')}<input type="text" id="pop-q" placeholder="Filter instruments" autocomplete="off"></label></div><div class="pop-b"></div><div class="pop-f"><span class="xs muted" id="pop-n" style="margin-right:auto;align-self:center"></span><button class="btn ghost" id="pop-clear">Clear</button><button class="btn" id="pop-apply">Apply</button></div>`;
    const count = () => { $('#pop-n', pop).textContent = sel.size + ' selected'; };
    render(); count(); pop.hidden = false;
    const r = anchor.getBoundingClientRect(); const w = Math.min(360, window.innerWidth - 24);
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
    pop.style.top = Math.min(r.bottom + 8, window.innerHeight - Math.min(560, window.innerHeight * .75) - 12) + 'px';
    openScrim(); $('#scrim').style.background = narrow() ? '' : 'transparent';
    $('#pop-q', pop).oninput = e => render(e.target.value.toLowerCase());
    pop.onchange = e => { if (e.target.type === 'checkbox') { e.target.checked ? sel.add(e.target.value) : sel.delete(e.target.value); count(); } };
    $('#pop-clear', pop).onclick = () => { sel.clear(); render($('#pop-q', pop).value.toLowerCase()); count(); };
    $('#pop-apply', pop).onclick = () => { closeOverlays(); $('#scrim').style.background = ''; onApply([...sel]); };
    if (!narrow()) $('#pop-q', pop).focus();
  }
  const pickerBtn = (id, n) => `<button class="btn ghost" id="${id}">${ic('filter')}Instruments<span class="count">${n}</span></button>`;

  /* ───────── shell ───────── */
  function buildNav() {
    const item = (k) => `<button type="button" data-view="${k}" title="${esc(VIEWS[k].label)}">${ic(VIEWS[k].icon)}<span class="lbl">${esc(VIEWS[k].label)}</span>${VIEWS[k].tag ? `<span class="tag">${VIEWS[k].tag}</span>` : ''}</button>`;
    $('#nav').innerHTML = `<div class="nav-label">Markets</div>${['overview', 'monitor', 'flows'].map(item).join('')}<div class="nav-label">Analysis</div>${['analytics', 'risk', 'intel', 'shock'].map(item).join('')}<div class="nav-label">System</div>${item('admin')}`;
    $('#tabbar').innerHTML = PRIMARY_MOBILE.map(k => `<button type="button" data-view="${k}">${ic(VIEWS[k].icon)}<span>${esc(k === 'risk' ? 'Risk' : VIEWS[k].label)}</span></button>`).join('') + `<button type="button" data-more="1">${ic('more')}<span>More</span></button>`;
    $('#sheet-nav').innerHTML = Object.keys(VIEWS).filter(k => !PRIMARY_MOBILE.includes(k)).map(item).join('');
    const go = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.more) { $('#sheet').hidden = false; openScrim(); return; } if (b.dataset.view) { closeOverlays(); show(b.dataset.view); } };
    $('#nav').onclick = go; $('#tabbar').onclick = go; $('#sheet-nav').onclick = go;
  }
  function setPills(regime, stress) {
    if (regime) { const p = $('#regime-pill'); p.className = 'pill ' + (regime.label.startsWith('RISK-ON') ? 'on' : regime.label.startsWith('RISK-OFF') ? 'off' : 'mid'); $('span', p).textContent = regime.label.replace(' / MIXED', ''); p.title = `Rules-based regime score ${regime.score} (−1 risk-off … +1 risk-on)`; }
    if (stress && stress.latest != null) { const p = $('#stress-pill'); p.className = 'pill ' + (stress.latest >= 75 ? 'off' : stress.latest >= 55 ? 'mid' : 'on'); $('span', p).textContent = `Stress ${Math.round(stress.latest)} · ${stress.level}`; }
  }
  $('#regime-pill').onclick = () => show('overview');
  $('#stress-pill').onclick = () => show('risk');

  async function loadCore() {
    const [u, p] = await Promise.all([state.universe ? Promise.resolve(state.universe) : api('/universe'), api('/performance')]);
    state.universe = u; state.perf = p.rows; state.loadedAt = new Date();
    renderTicker(); renderHealth();
    $('#updated').textContent = (SNAP && !apiBase ? 'Snapshot ' : 'Updated ') + state.loadedAt.toISOString().slice(11, 16) + 'Z';
    Promise.all([api('/analytics/regime').catch(() => null), api('/risk/stress').catch(() => null)]).then(([r, s]) => setPills(r, s));
  }
  function renderTicker() {
    const ids = ['SPX', 'NDX', 'SX5E', 'NKY', 'HSI', 'EEM', 'UST10Y', 'HYOAS', 'DXY', 'USDJPY', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'VIX'];
    const items = ids.map(id => state.perf.find(q => q.id === id)).filter(Boolean).map(q => { const c = isDiff(q) ? q.change : q.pct1d; return `<span class="tk" data-id="${q.id}"><b>${q.id}</b>${fmt.px(q.price)}<span class="${tone(c)}">${isDiff(q) ? fmt.bp(c) : fmt.pct(c)}</span></span>`; }).join('');
    $('#ticker-inner').innerHTML = items + items;
    $('#ticker-inner').onclick = e => { const t = e.target.closest('.tk'); if (t) openDrawer(t.dataset.id); };
  }
  function renderHealth() {
    const by = {}; for (const q of state.perf) { const s = by[q.source] || (by[q.source] = { ok: 0, n: 0 }); s.n++; if (q.available && !q.stale) s.ok++; }
    const name = { yahoo: 'Yahoo Finance', fred: 'FRED', coingecko: 'CoinGecko', goldapi: 'gold-api', demo: 'Demo' };
    $('#side-health').innerHTML = Object.entries(by).map(([s, v]) => `<div class="health-row" title="${esc(name[s] || s)}: ${v.ok}/${v.n} instruments OK"><i class="dot ${v.ok === v.n ? 'ok' : 'bad'}"></i><span>${esc(name[s] || s)}</span><b>${v.ok}/${v.n}</b></div>`).join('');
  }

  /* ═════════════════════ OVERVIEW ═════════════════════ */
  async function renderOverview() {
    const v = $('#view-overview');
    v.innerHTML = `<div class="grid g-kpi">${'<div class="skeleton" style="height:150px"></div>'.repeat(8)}</div>`;
    const [o, sig, an, fl] = await Promise.all([api('/overview'), api('/risk/inflections').catch(() => null), api('/intel/anomalies').catch(() => null), api('/flows').catch(() => null)]);
    setPills(o.regime);
    const Q = Object.fromEntries(state.perf.map(r => [r.id, r]));
    v.innerHTML = `
      <div class="grid g-kpi" id="kpis"></div>
      <div class="grid g-main">
        ${card({ icon: 'layers', title: 'Where capital is concentrated', sub: 'Size of the major asset pools in USD', actions: '<span class="badge reference">reference</span><span class="badge measured">live</span>', body: '<div id="size-strip" class="size-strip"></div><div id="treemap" class="ch-lg ch" style="margin-top:12px"></div>', foot: '<span id="treemap-note"></span>' })}
        ${card({ icon: 'gauge', title: 'Market regime', sub: 'Rules-based read of risk appetite', actions: '<span class="badge estimate">heuristic</span>', body: '<div id="regime-panel" class="stack" style="display:flex;flex-direction:column;gap:14px"></div>', foot: esc(o.regime.method) })}
      </div>
      ${card({ icon: 'grid', title: 'Performance by asset class', sub: 'Return over the selected window. Yields and spreads in basis points', actions: '<span id="perf-window"></span>', body: '<div id="class-perf" class="heat"></div>' })}
      <div class="grid g-2">
        ${card({ icon: 'compass', title: 'Trend signals to watch', sub: 'Most recent inflection points across the universe', actions: '<button class="btn ghost" data-go="risk">All signals</button>', bodyClass: 'flush', body: '<div id="ov-signals" class="list"></div>' })}
        ${card({ icon: 'target', title: 'Unusual moves', sub: 'Latest changes beyond 2σ of their one-year distribution', actions: '<button class="btn ghost" data-go="intel">Intelligence</button>', bodyClass: 'flush', body: '<div id="ov-anom" class="list"></div>' })}
      </div>
      <div class="grid g-main">
        ${card({ icon: 'bank', title: 'Macro conditions', sub: 'Official FRED series', bodyClass: 'flush', body: '<div class="tbl"><table class="t" id="macro-table"></table></div>', foot: 'End-of-day, weekly or monthly as badged. Rate and spread changes in basis points.' })}
        ${card({ icon: 'droplet', title: 'Liquidity & flows', sub: 'Measured balance changes only', actions: '<button class="btn ghost" data-go="flows">Details</button>', body: '<div id="flows-mini" class="mini"></div>', foot: 'Stablecoin supply is on-chain issuance. Net liquidity = Fed assets − reverse repo − Treasury cash, weekly.' })}
      </div>`;
    $$('[data-go]', v).forEach(b => b.onclick = () => show(b.dataset.go));

    // KPIs
    $('#kpis').innerHTML = ['SPX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'VIX', 'HYOAS'].map(id => { const q = Q[id]; if (!q) return ''; const c1 = isDiff(q) ? q.change : q.pct1d; return `<article class="card kpi" data-id="${id}" tabindex="0"><div class="kpi-top"><span>${esc(q.name.replace(/ \(.*\)/, ''))}</span>${badge(q)}</div><div class="kpi-val">${fmt.px(q.price)}<small>${esc(q.unit)}</small></div><div class="chips"><span><b class="${tone(c1)}">${isDiff(q) ? fmt.bp(c1) : fmt.pct(c1)}</b> 1D</span><span><b class="${tone(q.perf['30D'])}">${fmt.chg(q, q.perf['30D'])}</b> 30D</span><span><b class="${tone(q.perf.YTD)}">${fmt.chg(q, q.perf.YTD)}</b> YTD</span></div>${areaSpark(q.sparkline)}<div class="kpi-foot">${esc(q.source)} · ${fmt.ago(q.asOf)}</div></article>`; }).join('');
    $('#kpis').onclick = e => { const k = e.target.closest('.kpi'); if (k) openDrawer(k.dataset.id); };
    $('#kpis').onkeydown = e => { if (e.key === 'Enter') { const k = e.target.closest('.kpi'); if (k) openDrawer(k.dataset.id); } };

    // Concentration
    const T = tok(); const COL = { EQ_GLOBAL: T.accent, FI_GLOBAL: T.blue, GOLD_STOCK: T.teal, CRYPTO_TOTAL: T.violet };
    const total = o.sizes.reduce((s, z) => s + (z.usd || 0), 0);
    $('#size-strip').innerHTML = o.sizes.map(z => `<div class="strip-seg ${total && z.usd / total < 0.12 ? 'narrow' : ''}" style="flex:${z.usd || 0};background:${COL[z.id]}" title="${esc(z.label)}: ${fmt.usd(z.usd)} (${total ? (z.usd / total * 100).toFixed(1) : '—'}%)"><span>${esc(z.label)}</span><b>${fmt.usd(z.usd)} · ${total ? Math.round(z.usd / total * 100) : '—'}%</b></div>`).join('');
    const leaves = [];
    for (const z of o.sizes) { const kids = (z.children || []).filter(c => c.usd > 0 && c.usd / total >= 0.04); if (kids.length) kids.forEach((c, i) => leaves.push({ name: c.label, value: c.usd, grp: z.label, ref: { ...c, measure: z.measure, source: z.source, asOf: z.asOf, live: z.live }, itemStyle: { color: COL[z.id], opacity: 1 - i * .18 } })); else leaves.push({ name: z.id === 'GOLD_STOCK' ? 'Gold' : z.id === 'CRYPTO_TOTAL' ? 'Crypto' : z.label, value: z.usd || 0, grp: z.label, ref: z, itemStyle: { color: COL[z.id] } }); }
    chart('#treemap', { tooltip: { formatter: p => { const r = p.data.ref || {}; return `<b>${esc(p.name)}</b><br>${fmt.usd(p.value)} · ${(p.value / total * 100).toFixed(1)}% of total<br><span style="opacity:.7">${esc(String(r.measure || '').replace(/_/g, ' '))}${r.live ? ' · live' : r.source ? ' · ' + esc(r.source) : ''}</span>`; } }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.2, label: { show: true, overflow: 'truncate', fontFamily: T.mono, fontSize: 12, color: '#fff', lineHeight: 17, formatter: p => p.value / total < 0.03 ? '' : `{n|${p.name}}\n{v|${fmt.usd(p.value)}}`, rich: { n: { fontSize: 12, color: 'rgba(255,255,255,.9)' }, v: { fontSize: 15, fontWeight: 600, color: '#fff' } } }, itemStyle: { borderColor: T.surface, borderWidth: 3, gapWidth: 3, borderRadius: 6 }, data: leaves }] });
    $('#treemap-note').innerHTML = o.sizes.map(s => `<b>${esc(s.label)}</b> ${esc(s.measure.replace(/_/g, ' '))}, ${s.live ? 'live' : 'reference'} (${esc(s.note || s.source)}${s.asOf ? ', ' + esc(String(s.asOf).slice(0, 10)) : ''})${s.error ? ` <span class="down">${/429/.test(s.error) ? 'source rate-limited, retrying shortly' : 'source unavailable'}</span>` : ''}`).join(' · ') + '. Market cap, debt outstanding and physical stock value are different measures and none of them is a capital flow.';

    // Regime
    const r = o.regime; const pos = ((r.score + 1) / 2 * 100).toFixed(0);
    $('#regime-panel').innerHTML = `<div class="regime-head"><span class="big ${r.score > .3 ? 'up' : r.score < -.3 ? 'down' : 'warn-c'}">${r.label}</span><span class="mono dim">${r.score > 0 ? '+' : ''}${r.score}</span></div><div><div class="gauge"><i style="left:${pos}%"></i></div><div class="gauge-l"><span>Risk-off −1</span><span>0</span><span>+1 Risk-on</span></div></div><div class="comp-list">${r.components.map(c => `<div class="comp"><span class="l">${esc(c.label)}</span><span class="d">${esc(c.detail)}</span><span class="s ${c.score > 0 ? 'up' : c.score < 0 ? 'down' : 'muted'}">${c.score == null ? 'n/a' : (c.score > 0 ? '+' : '') + c.score}</span></div>`).join('')}</div>`;

    // Heat grid
    let win = store.get('cft:ovwin', '30D');
    const drawHeat = () => {
      const pv = (r) => win === '1D' ? (isDiff(r) ? r.change : r.pct1d) : r.perf[win];
      const rows = state.perf.filter(r => !r.id.match(/USDT|USDC/) && (r.cls !== 'macro' || ['VIX', 'BROADUSD'].includes(r.id)));
      const groups = {}; rows.forEach(r => (groups[r.cls] ||= []).push(r));
      const clsIcon = { equity: 'up', rates: 'bank', credit: 'layers', crypto: 'coins', commodity: 'flame', fx: 'swap', macro: 'pulse' };
      $('#class-perf').innerHTML = Object.entries(groups).map(([c, arr]) => {
        const scaled = (r) => { const x = pv(r); return x == null ? null : isDiff(r) ? x * 100 : x; };
        const max = Math.max(4, ...arr.filter(r => !isDiff(r)).map(r => Math.abs(scaled(r) || 0)));
        const maxBp = Math.max(20, ...arr.filter(isDiff).map(r => Math.abs(scaled(r) || 0)));
        return `<div class="heat-row"><div class="cls">${ic(clsIcon[c] || 'grid')}${esc(state.universe.classes[c])}</div><div class="heat-tiles">${arr.sort((x, y) => (pv(y) ?? -1e9) - (pv(x) ?? -1e9)).map(r => { const x = pv(r); return `<div class="tile" data-id="${r.id}" style="background:${heat(scaled(r), isDiff(r) ? maxBp : max)}" title="${esc(r.name)}"><div class="a"><b>${r.id}</b></div><div class="n">${esc(r.name)}</div><div class="v ${tone(x)}">${fmt.chg(r, x)}</div></div>`; }).join('')}</div></div>`;
      }).join('');
    };
    mount('#perf-window', seg(['1D', '7D', '30D', '90D', 'YTD', '1Y'], win, w => { win = w; store.set('cft:ovwin', w); drawHeat(); }));
    drawHeat(); $('#class-perf').onclick = e => { const t = e.target.closest('.tile'); if (t) openDrawer(t.dataset.id); };

    // Signals & anomalies
    renderSignalList('#ov-signals', sig ? sig.signals.slice(0, 7) : null, (id) => { state.risk.trendId = id; show('risk'); });
    $('#ov-anom').innerHTML = an && an.items.length ? an.items.slice(0, 7).map(x => `<div class="li" data-id="${x.id}"><span class="ico ${x.move1d > 0 ? 'up' : 'down'}">${ic(x.move1d > 0 ? 'up' : 'down')}</span><span class="ti">${esc(x.name)}<span>${x.id}</span></span><span class="de">${x.date} · 1-day z ${x.z1} · 5-day z ${x.z5}</span><span class="rt"><b class="${tone(x.move1d)}">${x.move1d > 0 ? '+' : ''}${x.move1d}${x.unit === 'bp' ? ' bp' : '%'}</b><span class="badge ${x.severity === 'extreme' ? 'bad' : x.severity === 'high' ? 'mid' : ''}">${x.severity}</span></span></div>`).join('') : emptyState(an ? 'No moves beyond 2σ in the latest observations.' : 'Anomaly scan unavailable.', 'target');
    $('#ov-anom').onclick = e => { const t = e.target.closest('.li'); if (t) openDrawer(t.dataset.id); };

    // Macro table
    const macro = ['FEDFUNDS', 'ECBRATE', 'CPI', 'BREAKEVEN10', 'UST2Y', 'UST10Y', 'T10Y2Y', 'IGOAS', 'HYOAS', 'VIX', 'BROADUSD', 'WALCL', 'RRP', 'TGA', 'M2'];
    $('#macro-table').innerHTML = `<thead><tr><th class="stick">Indicator</th><th class="num">Latest</th><th class="num hide-sm">Last chg</th><th class="num">30D</th><th class="num hide-sm">1Y</th><th class="hide-sm">Data</th></tr></thead><tbody>` + macro.map(id => { const q = Q[id]; if (!q) return ''; const pctUnit = String(q.unit).startsWith('%'); const f = (v) => pctUnit ? fmt.bp(v) : fmt.pct(v); return `<tr data-id="${id}"><td class="stick"><div class="inst"><b>${id}</b><span>${esc(q.name)}</span></div></td><td class="num">${fmt.px(q.price)} <span class="muted xs hide-sm">${esc(q.unit)}</span></td><td class="num hide-sm ${tone(q.change)}">${pctUnit ? fmt.bp(q.change) : fmt.pct(q.pct1d)}</td><td class="num ${tone(q.perf['30D'])}">${f(q.perf['30D'])}</td><td class="num hide-sm ${tone(q.perf['1Y'])}">${f(q.perf['1Y'])}</td><td class="hide-sm" title="As of ${fmt.date(q.asOf)}">${badge(q)}<div class="xs muted" style="margin-top:2px">${fmt.date(q.asOf).slice(5)}</div></td></tr>`; }).join('') + '</tbody>';
    $('#macro-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };

    // Liquidity mini
    if (fl) {
      const st = fl.sections.find(x => x.id === 'stablecoins'), nl = fl.sections.find(x => x.id === 'fed_liquidity');
      const items = [...(st ? st.items.map(i => ({ ...i, v: fmt.usd(i.latest), d: (x) => fmt.sbig(x) })) : []), ...(nl ? nl.items.slice(0, 2).map(i => ({ ...i, v: '$' + fmt.big(i.latest * 1e9), d: (x) => fmt.sbig(x * 1e9) })) : [])].filter(i => i.latest != null);
      $('#flows-mini').innerHTML = items.map((i, k) => `<div class="mini-item"><span class="lab">${esc(i.name)}</span><span class="v">${i.v}</span><div class="chips">${['d7', 'd30', 'd90'].filter(w => i[w]).map(w => `<span><b class="${tone(i[w].abs)}">${i.d(i[w].abs)}</b> ${w.slice(1)}D</span>`).join('')}</div><div id="fm-${k}" class="ch-mini"></div></div>`).join('');
      items.forEach((i, k) => chart('#fm-' + k, { grid: { left: 0, right: 0, top: 4, bottom: 2 }, xAxis: { type: 'time', show: false }, yAxis: { type: 'value', scale: true, show: false }, series: [{ type: 'line', showSymbol: false, smooth: .2, data: (i.series || []).slice(-120), lineStyle: { width: 1.6, color: T.blue }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.blue + '40' }, { offset: 1, color: T.blue + '00' }] } } }] }));
    } else $('#flows-mini').innerHTML = emptyState('Flow series unavailable.', 'droplet');
  }

  function renderSignalList(sel, signals, onPick, selected) {
    const box = $(sel); if (!box) return;
    if (!signals) { box.innerHTML = emptyState('Signal scan unavailable.', 'compass'); return; }
    if (!signals.length) { box.innerHTML = emptyState('No trend events in the current window.', 'compass'); return; }
    const icon = (s) => /Overbought|Oversold/.test(s.type) ? ['gauge', 'mid'] : [s.dir === 'up' ? 'up' : 'down', s.dir];
    box.innerHTML = signals.map(s => { const [i, c] = icon(s); return `<div class="li ${selected === s.id ? 'sel' : ''}" data-id="${s.id}"><span class="ico ${c}">${ic(i)}</span><span class="ti">${esc(s.type)}<span>${s.id}</span></span><span class="de">${esc(s.name)} · ${esc(s.detail)}</span><span class="rt"><span class="muted">${s.date.slice(5)}</span></span></div>`; }).join('');
    box.onclick = e => { const t = e.target.closest('.li'); if (t) onPick(t.dataset.id); };
  }

  /* ═════════════════════ MONITOR ═════════════════════ */
  function renderMonitor() {
    const v = $('#view-monitor'); const m = state.monitor;
    const regions = [...new Set(state.universe.assets.map(a => a.region))];
    v.innerHTML = `<section class="card"><div class="toolbar" id="mon-cls"></div><div class="toolbar">
        <label class="search">${ic('search')}<input type="text" id="mon-q" placeholder="Search instruments" value="${esc(m.q)}" autocomplete="off"></label>
        <select id="mon-region" aria-label="Region"><option value="all">All regions</option>${regions.map(r => `<option ${m.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
        <span id="mon-h"></span>
        <span class="grow"></span>
        <button class="btn ghost ${m.watchOnly ? 'on' : ''}" id="mon-watch">${ic('star')}Watchlist<span class="count" id="mon-wn">${state.watchlist.length}</span></button>
        <button class="btn ghost" id="mon-csv">${ic('download')}<span class="hide-sm">Export CSV</span></button>
      </div><div class="tbl scroll-y"><table class="t" id="mon-table"></table></div>
      <div class="card-f">Volume is exchange-reported turnover (shares or contracts; 24h USD for crypto). Realised volatility is annualised (bp for yields and spreads). The 52-week bar shows where the latest print sits in its one-year range.</div></section>`;
    mount('#mon-cls', seg([['all', 'All'], ...Object.entries(state.universe.classes)], m.cls, c => { m.cls = c; drawMonTable(); }, ''));
    mount('#mon-h', seg(['1D', '7D', '30D', '90D', 'YTD', '1Y'], m.horizon, h => { m.horizon = h; drawMonTable(); }));
    $('#mon-region').onchange = e => { m.region = e.target.value; drawMonTable(); };
    $('#mon-q').oninput = e => { m.q = e.target.value; drawMonTable(); };
    $('#mon-watch').onclick = e => { m.watchOnly = !m.watchOnly; e.currentTarget.classList.toggle('on', m.watchOnly); drawMonTable(); };
    $('#mon-csv').onclick = () => csvDownload(`monitor-${new Date().toISOString().slice(0, 10)}.csv`, filteredRows().map(r => ({ id: r.id, name: r.name, class: r.cls, region: r.region, price: r.price, unit: r.unit, change_1d: isDiff(r) ? r.change : r.pct1d, change_1d_unit: isDiff(r) ? 'pct-pt' : '%', perf_7d: r.perf['7D'], perf_30d: r.perf['30D'], perf_90d: r.perf['90D'], perf_ytd: r.perf.YTD, perf_1y: r.perf['1Y'], vol_30d: r.vol['30D'], vol_1y: r.vol['1Y'], volume: r.volume, market_cap: r.marketCap, drawdown_1y: r.maxDrawdown1Y, source: r.source, freshness: r.stale ? 'stale' : r.freshness, as_of: r.asOf })));
    drawMonTable();
  }
  function filteredRows() { const m = state.monitor; const q = m.q.toLowerCase(); return state.perf.filter(r => (m.cls === 'all' || r.cls === m.cls) && (m.region === 'all' || r.region === m.region) && (!q || (r.name + ' ' + r.id).toLowerCase().includes(q)) && (!m.watchOnly || state.watchlist.includes(r.id))); }
  function drawMonTable() {
    const m = state.monitor; const h = m.horizon; const hv = (r) => h === '1D' ? (isDiff(r) ? r.change : r.pct1d) : r.perf[h];
    const cols = [['id', 'Instrument', '', 'stick'], ['cls', 'Class', '', 'hide-sm'], ['price', 'Last', 'num', ''], ['chg', `${h} chg`, 'num', ''], ['spark', '30D', '', ''], ['vol', 'Vol 30D', 'num', 'hide-sm'], ['range', '52-week', '', 'hide-sm'], ['volume', 'Volume', 'num', 'hide-sm'], ['marketCap', 'Mkt cap', 'num', 'hide-sm'], ['fresh', 'Data', '', 'hide-sm']];
    const rows = filteredRows().slice().sort((a, b) => { const k = m.sortKey; let x, y; if (k === 'chg') { x = hv(a); y = hv(b); } else if (k === 'vol') { x = a.vol['30D']; y = b.vol['30D']; } else { x = a[k]; y = b[k]; } if (x == null) return 1; if (y == null) return -1; const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return m.sortAsc ? c : -c; });
    const sortable = ['id', 'cls', 'price', 'chg', 'vol', 'volume', 'marketCap'];
    $('#mon-table').innerHTML = `<thead><tr><th class="stick" style="width:34px"></th>${cols.map(([k, l, n, x]) => `<th class="${n} ${x} ${k === 'id' ? '' : ''} ${sortable.includes(k) ? 'sortable' : ''} ${m.sortKey === k ? 'sorted' + (m.sortAsc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>` +
      (rows.length ? rows.map(r => { const c = hv(r); return `<tr data-id="${r.id}"><td class="stick" style="padding-right:0"><button class="star ${state.watchlist.includes(r.id) ? 'on' : ''}" data-star="${r.id}" aria-label="Toggle watchlist">${ic('star')}</button></td><td class="stick" style="left:34px"><div class="inst"><b>${r.id}</b><span>${esc(r.name)}</span></div></td><td class="hide-sm muted">${esc(state.universe.classes[r.cls])}</td><td class="num">${fmt.px(r.price)} <span class="muted xs hide-sm">${esc(r.unit)}</span></td><td class="num"><span class="hcell ${tone(c)}" style="background:${heat(c == null ? null : isDiff(r) ? c * 100 : c, isDiff(r) ? 30 : 5)}">${fmt.chg(r, c)}</span></td><td>${spark(r.sparkline)}</td><td class="num muted hide-sm">${r.vol['30D'] == null ? '—' : isDiff(r) ? Math.round(r.vol['30D']) + ' bp' : r.vol['30D'].toFixed(1) + '%'}</td><td class="hide-sm">${r.range52w && r.range52w.pos != null ? `<span class="rangebar" title="1-year low ${fmt.px(r.range52w.low)} · high ${fmt.px(r.range52w.high)}"><i style="left:${(r.range52w.pos * 100).toFixed(0)}%"></i></span>` : '—'}</td><td class="num muted hide-sm">${fmt.big(r.volume)}</td><td class="num muted hide-sm">${r.marketCap ? fmt.usd(r.marketCap) : '—'}</td><td class="hide-sm" title="As of ${fmt.time(r.asOf)}">${badge(r)}<div class="xs muted" style="margin-top:2px">${fmt.ago(r.asOf)}</div></td></tr>`; }).join('') : `<tr><td colspan="12">${emptyState('No instruments match these filters.', 'search')}</td></tr>`) + '</tbody>';
    $('#mon-table').onclick = e => { const s = e.target.closest('[data-star]'); if (s) { e.stopPropagation(); toggleWatch(s.dataset.star); s.classList.toggle('on'); $('#mon-wn').textContent = state.watchlist.length; return; } const th = e.target.closest('th.sortable'); if (th) { if (m.sortKey === th.dataset.k) m.sortAsc = !m.sortAsc; else { m.sortKey = th.dataset.k; m.sortAsc = th.dataset.k === 'id' || th.dataset.k === 'cls'; } drawMonTable(); return; } const tr = e.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id); };
  }
  function toggleWatch(id) { const i = state.watchlist.indexOf(id); if (i >= 0) state.watchlist.splice(i, 1); else state.watchlist.push(id); store.set('cft:watchlist', state.watchlist); }
  async function csvDownload(name, rows) {
    if (!rows.length) return toast('Nothing to export');
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; const head = Object.keys(rows[0]);
    const body = [head.map(q).join(','), ...rows.map(r => head.map(k => q(r[k])).join(','))].join('\n');
    try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: name, data: body }); return; } } catch (e) { return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = name; a.click(); toast('Exported ' + name);
  }

  /* ═════════════════════ DRAWER ═════════════════════ */
  async function openDrawer(id) {
    const q = state.perf.find(r => r.id === id); if (!q) return;
    const asset = state.universe.assets.find(a => a.id === id) || {};
    $('#drawer').hidden = false; openScrim();
    $('#drawer-title').innerHTML = `${esc(q.name)} ${badge(q)}`;
    $('#drawer-sub').textContent = `${id} · ${asset.symbol || ''} · ${state.universe.classes[q.cls]} · ${q.region}`;
    const st = (l, v, c = '') => `<div class="stat"><span>${l}</span><b class="${c}">${v}</b></div>`;
    const c1 = isDiff(q) ? q.change : q.pct1d;
    $('#drawer-body').innerHTML = `
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="mono" style="font-size:30px;font-weight:600;letter-spacing:-.02em">${fmt.px(q.price)}</span><span class="muted">${esc(q.unit)}</span><span class="mono ${tone(c1)}" style="font-size:15px">${isDiff(q) ? fmt.bp(c1) : fmt.pct(c1)} today</span></div>
      <div class="stat-grid">${st('7 days', fmt.chg(q, q.perf['7D']), tone(q.perf['7D']))}${st('30 days', fmt.chg(q, q.perf['30D']), tone(q.perf['30D']))}${st('YTD', fmt.chg(q, q.perf.YTD), tone(q.perf.YTD))}${st('1 year', fmt.chg(q, q.perf['1Y']), tone(q.perf['1Y']))}${st('5 years', fmt.chg(q, q.perf['5Y']), tone(q.perf['5Y']))}${st('10 years', fmt.chg(q, q.perf['10Y']), tone(q.perf['10Y']))}${st('Vol 30D', q.vol['30D'] == null ? '—' : q.vol['30D'] + (isDiff(q) ? ' bp' : '%'))}${st('Max DD 1Y', q.maxDrawdown1Y == null ? '—' : q.maxDrawdown1Y.toFixed(1) + '%', 'down')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>Price history</b><span id="dr-win"></span></div>
      <div id="dr-chart" class="ch"></div>
      <dl class="kv"><dt>Source</dt><dd>${esc(state.universe.sources[q.source]?.name || q.source)}</dd><dt>Freshness</dt><dd>${q.stale ? `<span class="down">Stale: ${esc(q.error)}</span>` : esc(q.freshness)}</dd><dt>Quote time</dt><dd>${fmt.time(q.asOf)} (${fmt.ago(q.asOf)})</dd><dt>History</dt><dd id="dr-hist">—</dd>${q.volume ? `<dt>Volume</dt><dd>${fmt.big(q.volume)}</dd>` : ''}${q.marketCap ? `<dt>Market cap</dt><dd>${fmt.usd(q.marketCap)}</dd>` : ''}</dl>
      ${q.coverageNote ? `<div class="callout warn">${ic('info')}<div>${esc(q.coverageNote)}</div></div>` : ''}${q.changeNote ? `<div class="callout">${ic('info')}<div>${esc(q.changeNote)}</div></div>` : ''}
      <div class="row-actions"><button class="btn ghost ${state.watchlist.includes(id) ? 'on' : ''}" id="dr-star">${ic('star')}<span>${state.watchlist.includes(id) ? 'On watchlist' : 'Add to watchlist'}</span></button><button class="btn ghost" id="dr-csv">${ic('download')}Export history</button><button class="btn ghost" id="dr-trend">${ic('compass')}Trend view</button></div>`;
    let win = '1Y', hist = null;
    const draw = async () => { try { const h = await api(`/history?id=${id}&window=${win}`); hist = h; const T = tok(); $('#dr-hist').innerHTML = `${h.n} obs · ${h.from} → ${h.to}${h.stale ? ' <span class="down">stale</span>' : ''}`; const up = h.points.length > 1 && h.points[h.points.length - 1][1] >= h.points[0][1]; const col = up ? T.up : T.down; chart('#dr-chart', { grid: { left: 8, right: 8, top: 10, bottom: 24, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: v => fmt.px(v) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', scale: true, ...axis(T) }, dataZoom: [{ type: 'inside' }], series: [{ type: 'line', data: h.points, showSymbol: false, lineStyle: { width: 1.6, color: col }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: col + '38' }, { offset: 1, color: col + '00' }] } } }] }); } catch (e) { $('#dr-chart').innerHTML = errorBox(e.message); } };
    mount('#dr-win', seg(['30D', '90D', '1Y', '5Y', '10Y'], win, w => { win = w; draw(); })); draw();
    $('#dr-star').onclick = (e) => { toggleWatch(id); const on = state.watchlist.includes(id); e.currentTarget.classList.toggle('on', on); $('span', e.currentTarget).textContent = on ? 'On watchlist' : 'Add to watchlist'; if (state.view === 'monitor') drawMonTable(); };
    $('#dr-csv').onclick = () => hist && csvDownload(`${id}-${win}.csv`, hist.points.map(p => ({ date: p[0], value: p[1], source: hist.source })));
    $('#dr-trend').onclick = () => { closeOverlays(); state.risk.trendId = id; show('risk'); };
  }
  $('#drawer-close').onclick = closeOverlays;

  /* ═════════════════════ FLOWS ═════════════════════ */
  async function renderFlows() {
    const v = $('#view-flows'); v.innerHTML = loading('Loading flow series…');
    const f = await api('/flows'); const T = tok();
    v.innerHTML = `<div class="callout">${ic('info')}<div>Only measured balance changes count as <b>flows</b> here: stablecoin net issuance and Federal Reserve liquidity. Traded volume and price changes are shown separately and are never read as inflows. Where no licensed data feed exists, the section says so instead of estimating.</div></div><div class="grid g-2" id="flow-grid"></div>`;
    const g = $('#flow-grid'); const sIcon = { stablecoins: 'coins', fed_liquidity: 'bank', crypto_volume: 'pulse', etf_flows: 'layers', exchange_flows: 'swap' };
    for (const sec of f.sections) {
      if (sec.unavailable) { g.insertAdjacentHTML('beforeend', card({ icon: sIcon[sec.id], title: esc(sec.title), actions: '<span class="badge bad">not connected</span>', body: `<p class="dim">${esc(sec.reason)}</p>` })); continue; }
      if (sec.error) { g.insertAdjacentHTML('beforeend', card({ icon: sIcon[sec.id], title: esc(sec.title), body: errorBox(sec.error) })); continue; }
      const id = 'flow-' + sec.id;
      const fmtV = (it) => sec.type === 'volume' ? fmt.usd(it.latest) : it.latest == null ? '—' : sec.id === 'stablecoins' ? fmt.usd(it.latest) : '$' + fmt.big(it.latest * 1e9);
      const fmtD = (x) => sec.id === 'stablecoins' ? fmt.sbig(x) : fmt.sbig(x * 1e9);
      const items = sec.items.map(it => `<div class="mini-item" style="grid-template-columns:1fr"><span class="lab">${esc(it.name)} ${it.stale ? '<span class="badge stale">stale</span>' : ''}</span><span class="v">${fmtV(it)}</span><div class="chips">${sec.type === 'volume' ? `<span>turnover <b>${it.turnover ?? '—'}%</b> of market cap</span><span>${fmt.ago(it.asOf)}</span>` : ['d7', 'd30', 'd90'].filter(k => it[k]).map(k => `<span><b class="${tone(it[k].abs)}">${fmtD(it[k].abs)}</b> ${k.slice(1)}D</span>`).join('')}</div></div>`).join('');
      g.insertAdjacentHTML('beforeend', card({ icon: sIcon[sec.id], title: esc(sec.title.replace(/ \(USD.*?\)| — .*/g, '')), sub: sec.type === 'volume' ? 'Turnover, not a capital flow' : 'USD billions', actions: `<span class="badge ${sec.type === 'volume' ? 'eod' : 'measured'}">${sec.type}</span>`, body: `<div class="mini" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${items}</div>${sec.type !== 'volume' ? `<div id="${id}" class="ch-sm ch" style="margin-top:14px"></div>` : ''}`, foot: esc(sec.measure) }));
      if (sec.type !== 'volume') { const S = series(T); chart('#' + id, { grid: { left: 8, right: 12, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt.big(v * 1e9) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', scale: true, ...axis(T) }, series: sec.items.filter(it => it.series && it.series.length).slice(0, 2).map((it, i) => ({ name: it.name, type: 'line', showSymbol: false, data: it.series, lineStyle: { width: 1.6, color: S[i + 1] }, itemStyle: { color: S[i + 1] } })) }); }
    }
  }

  /* ═════════════════════ ANALYTICS ═════════════════════ */
  function renderAnalytics() {
    const v = $('#view-analytics'); const a = state.analytics;
    const anchors = ['SPX', 'NDX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'HYOAS', 'EEM', 'COPPER', 'USDJPY', 'VIX'];
    v.innerHTML = `
      ${card({ icon: 'analytics', title: 'What moves with it, and against it', sub: 'Correlation of daily changes with the anchor. Bars: last 30 days. Dots: last year', actions: `<select id="lead-anchor" aria-label="Anchor instrument">${anchors.map(x => `<option ${x === a.anchor ? 'selected' : ''}>${x}</option>`).join('')}</select>`, body: '<div class="grid g-2" style="gap:24px"><div><div class="field" style="margin-bottom:6px"><label>Moves with</label></div><div id="lead-pos" class="ch"></div></div><div><div class="field" style="margin-bottom:6px"><label>Moves against</label></div><div id="lead-neg" class="ch"></div></div></div>', foot: '<span id="lead-foot"></span>' })}
      <div class="grid g-main">
        ${card({ icon: 'grid', title: 'Correlation matrix', sub: 'Daily changes, pairwise-aligned on common dates', actions: `${pickerBtn('corr-pick', a.ids.length)}<span id="corr-win"></span>`, body: '<div id="corr-chart" class="ch-xl ch"></div><div id="corr-meta" class="xs muted" style="margin-top:8px"></div>' })}
        ${card({ icon: 'swap', title: 'Correlations that are changing', sub: '30-day vs one-year correlation for the selected set', bodyClass: 'flush', body: '<div class="tbl"><table class="t" id="corr-shift"></table></div>', foot: 'A sign flip or a large gap marks a relationship that is shifting. Both figures are measured; the reading is yours.' })}
      </div>
      <div class="grid g-2">
        ${card({ icon: 'line', title: 'Relative performance', sub: 'Rebased to 100 at the start of the window', actions: `${pickerBtn('rel-pick', a.relIds.length)}<span id="rel-win"></span>`, body: '<div id="rel-chart" class="ch-lg ch"></div>', foot: 'Yields and spreads are plotted in their own units on the right axis. Crypto history covers 365 days unless a CoinGecko key is set.' })}
        ${card({ icon: 'pulse', title: 'Rolling correlation', sub: '30-observation window', actions: `<select id="roll-a" aria-label="First instrument">${assetOpts(a.rollA, x => x.cls !== 'macro' || x.id === 'VIX')}</select><select id="roll-b" aria-label="Second instrument">${assetOpts(a.rollB, x => x.cls !== 'macro' || x.id === 'VIX')}</select><span id="roll-win"></span>`, body: '<div id="roll-chart" class="ch-lg ch"></div>', foot: 'Sustained moves toward ±1, or a change of sign, often line up with regime shifts, for example stocks and bonds falling together in inflationary periods.' })}
      </div>`;
    $('#lead-anchor').onchange = e => { a.anchor = e.target.value; drawLeaders(); };
    mount('#corr-win', seg(['7D', '30D', '90D', '1Y', '5Y'], a.window, w => { a.window = w; drawCorr(); }));
    mount('#rel-win', seg(['90D', '1Y', '5Y', '10Y'], a.relWindow, w => { a.relWindow = w; drawRel(); }));
    mount('#roll-win', seg(['1Y', '5Y', '10Y'], a.rollWindow, w => { a.rollWindow = w; drawRoll(); }));
    $('#corr-pick').onclick = e => pickAssets(e.currentTarget, a.ids, ids => { if (ids.length < 2) return toast('Pick at least two instruments'); a.ids = ids; $('#corr-pick .count').textContent = ids.length; drawCorr(); drawShift(); });
    $('#rel-pick').onclick = e => pickAssets(e.currentTarget, a.relIds, ids => { if (!ids.length) return toast('Pick at least one instrument'); a.relIds = ids; $('#rel-pick .count').textContent = ids.length; drawRel(); });
    $('#roll-a').onchange = e => { a.rollA = e.target.value; drawRoll(); }; $('#roll-b').onchange = e => { a.rollB = e.target.value; drawRoll(); };
    drawLeaders(); drawCorr(); drawShift(); drawRel(); drawRoll();
  }
  const guard = async (sel, fn) => { try { await fn(); } catch (e) { const n = $(sel); if (n) { const c = window.echarts && echarts.getInstanceByDom(n); if (c) c.dispose(); n.innerHTML = errorBox(e.message); } } };
  function drawLeaders() {
    return guard('#lead-pos', async () => {
      const a = state.analytics; const r = await api(`/analytics/leaders?anchor=${a.anchor}`); const T = tok();
      const pos = r.rows.filter(x => x.r30 > 0).slice(0, 10); const neg = r.rows.filter(x => x.r30 < 0).slice(-10).reverse();
      const draw = (sel, rows, col) => {
        const n = $(sel); n.style.height = Math.max(200, rows.length * 30 + 40) + 'px';
        if (!rows.length) { n.innerHTML = emptyState('None in this window.'); return; }
        chart(n, { grid: { left: 8, right: 30, top: 6, bottom: 22, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const x = rows[ps[0].dataIndex]; return `<b>${esc(x.name)}</b><br>30 days: ${x.r30.toFixed(2)} (n ${x.n30})<br>1 year: ${x.r1y == null ? '—' : x.r1y.toFixed(2)} (n ${x.n1y})<br><span style="opacity:.7">shift ${(x.r30 - (x.r1y ?? 0) > 0 ? '+' : '')}${(x.r30 - (x.r1y ?? 0)).toFixed(2)}</span>`; } }, xAxis: { type: 'value', min: col === 'up' ? 0 : -1, max: col === 'up' ? 1 : 0, ...axis(T) }, yAxis: { type: 'category', inverse: true, data: rows.map(x => x.id), ...axis(T, { splitLine: { show: false } }), axisLabel: { color: T.fg, fontSize: 11.5, fontFamily: T.mono } }, series: [{ name: '30 days', type: 'bar', barWidth: 12, data: rows.map(x => ({ value: x.r30, itemStyle: { color: col === 'up' ? T.up : T.down, borderRadius: col === 'up' ? [0, 4, 4, 0] : [4, 0, 0, 4] } })), label: { show: true, position: col === 'up' ? 'right' : 'left', color: T.fg2, fontSize: 10.5, formatter: p => p.value.toFixed(2) } }, { name: '1 year', type: 'scatter', symbol: 'diamond', symbolSize: 10, data: rows.map(x => x.r1y), itemStyle: { color: T.fg, borderColor: T.surface, borderWidth: 1.5 }, z: 5 }] });
      };
      draw('#lead-pos', pos, 'up'); draw('#lead-neg', neg, 'down');
      const shifts = r.rows.filter(x => x.r1y != null).map(x => ({ ...x, d: x.r30 - x.r1y })).sort((p, q) => Math.abs(q.d) - Math.abs(p.d)).slice(0, 3);
      $('#lead-foot').innerHTML = `Biggest changes vs one year for <b>${esc(r.anchorName)}</b>: ${shifts.map(x => `<b>${x.id}</b> ${x.r1y.toFixed(2)} → ${x.r30.toFixed(2)}`).join(' · ')}. ${esc(r.method)}`;
    });
  }
  function drawCorr() {
    return guard('#corr-chart', async () => {
      const a = state.analytics; const c = await api(`/analytics/correlation?window=${a.window}&ids=${a.ids.join(',')}`); const T = tok();
      const node = $('#corr-chart'); const n = c.ids.length; const w = node.clientWidth || 600;
      const cell = (w - 80) / Math.max(1, n); const showLbl = cell >= 34;
      node.style.height = Math.min(600, Math.max(300, n * Math.min(cell, 34) + 120)) + 'px';
      const data = []; c.matrix.forEach((row, i) => row.forEach((val, j) => data.push([j, i, val])));
      chart(node, { grid: { left: 8, right: 8, top: 8, bottom: 52, containLabel: true }, tooltip: { formatter: p => `${c.ids[p.value[1]]} × ${c.ids[p.value[0]]}<br>ρ = <b>${p.value[2] == null ? 'n/a' : p.value[2].toFixed(2)}</b> · n = ${c.samples[p.value[1]][p.value[0]]}` }, xAxis: { type: 'category', data: c.ids, ...axis(T, { splitLine: { show: false } }), axisLabel: { rotate: n > 8 ? 55 : 0, fontSize: 10.5, color: T.fg2, interval: 0 } }, yAxis: { type: 'category', data: c.ids, inverse: true, ...axis(T, { splitLine: { show: false } }), axisLabel: { fontSize: 10.5, color: T.fg2, interval: 0 } }, visualMap: { min: -1, max: 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 160, text: ['+1', '−1'], textStyle: { color: T.fg3, fontSize: 10 }, inRange: { color: [T.down, T.surface2, T.up] } }, series: [{ type: 'heatmap', data, label: { show: showLbl, fontSize: 10, fontFamily: T.mono, color: T.fg, formatter: p => p.value[2] == null ? '' : p.value[2].toFixed(2) }, itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: T.fg } } }] });
      $('#corr-meta').innerHTML = `${c.days}-day window${showLbl ? '' : ' · hover a cell for its value'}${c.excluded.length ? ' · excluded for insufficient data: ' + c.excluded.join(', ') : ''}`;
    });
  }
  function drawShift() {
    return guard('#corr-shift', async () => {
      const a = state.analytics; const [s, l] = await Promise.all([api(`/analytics/correlation?window=30D&ids=${a.ids.join(',')}`), api(`/analytics/correlation?window=1Y&ids=${a.ids.join(',')}`)]);
      const idx = Object.fromEntries(l.ids.map((id, i) => [id, i])); const rows = [];
      s.ids.forEach((x, i) => s.ids.forEach((y, j) => { if (j <= i) return; const r30 = s.matrix[i][j], r1y = idx[x] != null && idx[y] != null ? l.matrix[idx[x]][idx[y]] : null; if (r30 == null || r1y == null) return; rows.push({ x, y, r30, r1y, d: r30 - r1y }); }));
      rows.sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
      $('#corr-shift').innerHTML = `<thead><tr><th>Pair</th><th class="num">30D</th><th class="num">1Y</th><th class="num">Shift</th></tr></thead><tbody>` + rows.slice(0, 15).map(r => { const flip = Math.sign(r.r30) !== Math.sign(r.r1y) && Math.abs(r.r30) > .2; return `<tr><td class="mono">${r.x} × ${r.y}${flip ? ' <span class="badge mid" title="Correlation changed sign">flip</span>' : ''}</td><td class="num">${r.r30.toFixed(2)}</td><td class="num muted">${r.r1y.toFixed(2)}</td><td class="num"><span class="hcell ${tone(r.d)}" style="background:${heat(r.d, 1.2)}">${(r.d > 0 ? '+' : '') + r.d.toFixed(2)}</span></td></tr>`; }).join('') + '</tbody>';
    });
  }
  function drawRel() {
    return guard('#rel-chart', async () => {
      const a = state.analytics; const r = await api(`/analytics/relative?window=${a.relWindow}&ids=${a.relIds.join(',')}`); const T = tok(); const S = series(T);
      const ids = Object.keys(r.series).filter(id => r.series[id].length); const diffIds = ids.filter(id => r.meta[id] && !r.meta[id].rebased);
      chart('#rel-chart', { grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 12, itemHeight: 4, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : v.toFixed(2) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: [{ type: 'value', scale: true, ...axis(T) }, { type: 'value', scale: true, ...axis(T, { splitLine: { show: false } }), show: diffIds.length > 0, axisLabel: { color: T.fg3, fontSize: 10.5, formatter: v => v + '%' } }], series: ids.map((id, i) => ({ name: id, type: 'line', showSymbol: false, yAxisIndex: diffIds.includes(id) ? 1 : 0, data: r.series[id], lineStyle: { width: 1.6, color: S[i % S.length], type: diffIds.includes(id) ? 'dashed' : 'solid' }, itemStyle: { color: S[i % S.length] }, emphasis: { focus: 'series' } })).concat([{ type: 'line', data: [], markLine: { silent: true, symbol: 'none', lineStyle: { color: T.fg3, type: 'dotted' }, label: { show: false }, data: [{ yAxis: 100 }] } }]) });
    });
  }
  function drawRoll() {
    return guard('#roll-chart', async () => {
      const a = state.analytics; const r = await api(`/analytics/rolling?a=${a.rollA}&b=${a.rollB}&window=${a.rollWindow}`); const T = tok();
      chart('#roll-chart', { grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : v.toFixed(2) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', min: -1, max: 1, ...axis(T), splitLine: { lineStyle: { color: T.line, type: 'dashed' } } }, series: [{ type: 'line', showSymbol: false, data: r.points.filter(p => p[1] != null), lineStyle: { width: 1.7, color: T.blue }, itemStyle: { color: T.blue }, areaStyle: { origin: 0, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.up + '40' }, { offset: .5, color: T.up + '05' }, { offset: .5, color: T.down + '05' }, { offset: 1, color: T.down + '40' }] } } }] });
    });
  }

  /* ═════════════════════ RISK & SIGNALS ═════════════════════ */
  async function renderRisk() {
    const v = $('#view-risk'); const R = state.risk;
    v.innerHTML = `
      <div class="grid g-main">
        ${card({ icon: 'flame', title: 'Market stress index', sub: '0 = calmest in three years · 100 = most stressed', actions: '<span id="stress-level"></span>', body: '<div id="stress-chart" class="ch-lg ch"></div>', foot: '<span id="stress-method"></span>' })}
        ${card({ icon: 'gauge', title: 'What is driving stress', sub: 'Each input ranked against its own last three years', body: '<div id="stress-comp" class="comp-list"></div>' })}
      </div>
      <div class="grid g-2">
        ${card({ icon: 'scatter', title: 'Risk map', sub: 'Volatility percentile vs drawdown from the one-year high. Bubble size = expected shortfall', body: '<div id="risk-map" class="ch-lg ch"></div>', foot: 'Upper-right is calm and near highs; lower-right is volatile and well off highs. Yields and spreads are excluded because a drawdown is not meaningful for them.' })}
        ${card({ icon: 'compass', title: 'Inflection points', sub: 'Recent trend events. Select one to chart it', actions: '<span id="sig-dir"></span>', bodyClass: 'flush', body: '<div id="sig-list" class="list" style="max-height:470px;overflow-y:auto"></div>', foot: '<span id="sig-method"></span>' })}
      </div>
      ${card({ icon: 'line', title: 'Trend view', sub: 'Price with 50- and 200-day averages; crosses marked', actions: `<select id="trend-id" aria-label="Instrument">${assetOpts(R.trendId, x => x.cls !== 'macro' || x.id === 'VIX')}</select><span id="trend-win"></span>`, body: '<div id="trend-chart" class="ch-lg ch"></div>' })}
      ${card({ icon: 'risk', title: 'Risk table', sub: 'Volatility regime, tail risk and drawdowns by instrument', actions: `<button class="btn ghost" id="risk-csv">${ic('download')}<span class="hide-sm">Export</span></button>`, bodyClass: 'flush', body: '<div class="tbl scroll-y"><table class="t" id="risk-table"></table></div>', foot: '<span id="risk-method"></span>' })}`;
    mount('#trend-win', seg(['1Y', '5Y', '10Y'], R.trendWindow, w => { R.trendWindow = w; drawTrend(); }));
    $('#trend-id').onchange = e => { R.trendId = e.target.value; drawTrend(); highlightSig(); };
    const T = tok();

    const [stress, tbl, sig] = await Promise.all([api('/risk/stress').catch(e => ({ error: e.message })), api('/risk/table').catch(e => ({ error: e.message })), api('/risk/inflections').catch(e => ({ error: e.message }))]);

    // Stress
    if (stress.error) $('#stress-chart').innerHTML = errorBox(stress.error); else {
      setPills(null, stress);
      $('#stress-level').innerHTML = `<span class="badge ${stress.latest >= 75 ? 'bad' : stress.latest >= 55 ? 'mid' : 'measured'}">${Math.round(stress.latest)} · ${esc(stress.level)}</span>`;
      const band = (a, b, col) => [{ yAxis: a, itemStyle: { color: col } }, { yAxis: b }];
      chart('#stress-chart', { grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : Math.round(v) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', min: 0, max: 100, interval: 25, ...axis(T) }, series: [{ type: 'line', showSymbol: false, data: stress.series, smooth: .15, lineStyle: { width: 2, color: T.accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.accent + '40' }, { offset: 1, color: T.accent + '00' }] } }, markArea: { silent: true, data: [band(75, 100, T.down + '14', 'High'), band(55, 75, T.warn + '12', 'Elevated'), band(35, 55, 'rgba(127,127,127,.04)', 'Normal'), band(0, 35, T.up + '10', 'Low')] }, markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: T.accent, borderColor: T.surface, borderWidth: 2 }, label: { show: false }, data: stress.series.length ? [{ coord: stress.series[stress.series.length - 1] }] : [] } }] });
      $('#stress-comp').innerHTML = stress.components.map(c => { const p = c.percentile; const col = p == null ? 'var(--fg-3)' : p >= 75 ? 'var(--down)' : p >= 55 ? 'var(--warn)' : 'var(--up)'; return `<div class="comp" style="grid-template-columns:minmax(0,1fr) 48px"><span class="l">${esc(c.name)}</span><span class="d">${esc(c.direction)}</span><span class="s" style="color:${col}">${p ?? '—'}</span><span class="meter" style="grid-column:1 / -1;margin-top:6px"><i style="width:${p ?? 0}%;background:${col}"></i></span></div>`; }).join('');
      $('#stress-method').innerHTML = `Bands: <b class="up">Low</b> under 35 · Normal 35–55 · <b class="warn-c">Elevated</b> 55–75 · <b class="down">High</b> 75+. ${esc(stress.method)}`;
    }

    // Risk map + table
    if (tbl.error) { $('#risk-map').innerHTML = errorBox(tbl.error); $('#risk-table').innerHTML = `<tbody><tr><td>${errorBox(tbl.error)}</td></tr></tbody>`; } else {
      const CC = CLS_COLOR(T); const pts = tbl.rows.filter(r => !r.unavailable && r.ddFromHigh != null && r.volPct != null);
      const byCls = {}; pts.forEach(r => (byCls[r.cls] ||= []).push(r));
      chart('#risk-map', { grid: { left: 8, right: 20, top: 40, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, type: 'scroll', icon: 'circle', itemWidth: 8, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { formatter: p => { const r = p.data.r; return `<b>${esc(r.name)}</b> (${r.id})<br>Vol percentile ${Math.round(r.volPct * 100)} · 30D vol ${r.vol30}%<br>From 1Y high ${r.ddFromHigh}% · Max DD ${r.maxDD1y}%<br>1-day VaR95 ${r.var95}% · ES95 ${r.cvar95}%`; } }, xAxis: { type: 'value', min: 0, max: 100, name: 'Volatility percentile →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: T.fg3, fontSize: 11 }, ...axis(T) }, yAxis: { type: 'value', max: 0, ...axis(T), axisLabel: { color: T.fg3, fontSize: 10.5, formatter: v => v + '%' } }, series: Object.entries(byCls).map(([c, arr]) => ({ name: state.universe.classes[c], type: 'scatter', data: arr.map(r => ({ value: [Math.round(r.volPct * 100), r.ddFromHigh], r, symbolSize: Math.max(9, Math.min(34, Math.abs(r.cvar95 || 1) * 6)) })), itemStyle: { color: CC[c], opacity: .85, borderColor: T.surface, borderWidth: 1 }, label: { show: !narrow(), formatter: p => p.data.r.id, position: 'right', fontSize: 10, color: T.fg2 }, labelLayout: { hideOverlap: true }, emphasis: { focus: 'series' } })).concat([{ type: 'scatter', data: [], markLine: { silent: true, symbol: 'none', lineStyle: { color: T.line2, type: 'dashed' }, label: { show: false }, data: [{ xAxis: 50 }, { yAxis: -10 }] } }]) });
      $('#risk-map').onclick = null; const rm = echarts.getInstanceByDom && window.echarts ? echarts.getInstanceByDom($('#risk-map')) : null; if (rm) { rm.off('click'); rm.on('click', p => p.data && p.data.r && openDrawer(p.data.r.id)); }
      const drawTable = () => {
        const cols = [['id', 'Instrument', '', 'stick'], ['vol30', 'Vol 30D', 'num', ''], ['volPct', 'Vol pctile', '', ''], ['volRatio', '30D/1Y', 'num', 'hide-sm'], ['var95', 'VaR 95%', 'num', ''], ['cvar95', 'ES 95%', 'num', 'hide-sm'], ['ddFromHigh', 'From high', 'num', ''], ['maxDD1y', 'Max DD 1Y', 'num', 'hide-sm'], ['vs200', 'vs 200D', 'num', 'hide-sm'], ['rangePos', '52-week', '', 'hide-sm']];
        const rows = tbl.rows.filter(r => !r.unavailable).slice().sort((x, y) => { const k = R.sortKey; const p = x[k], q = y[k]; if (p == null) return 1; if (q == null) return -1; const c = typeof p === 'string' ? p.localeCompare(q) : p - q; return R.sortAsc ? c : -c; });
        $('#risk-table').innerHTML = `<thead><tr>${cols.map(([k, l, n, x]) => `<th class="${n} ${x} sortable ${R.sortKey === k ? 'sorted' + (R.sortAsc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>` + rows.map(r => { const u = r.unit === 'bp' ? ' bp' : '%'; const vp = r.volPct == null ? null : Math.round(r.volPct * 100); const vcol = vp == null ? 'var(--fg-3)' : vp >= 80 ? 'var(--down)' : vp >= 60 ? 'var(--warn)' : 'var(--up)'; return `<tr data-id="${r.id}"><td class="stick"><div class="inst"><b>${r.id}</b><span>${esc(r.name)}</span></div></td><td class="num">${r.vol30 == null ? '—' : r.vol30.toFixed(1) + u}</td><td><div style="display:flex;align-items:center;gap:8px;min-width:110px"><span class="meter" style="flex:1"><i style="width:${vp ?? 0}%;background:${vcol}"></i></span><span class="mono xs" style="width:24px;text-align:right">${vp ?? '—'}</span></div></td><td class="num hide-sm ${r.volRatio > 1.3 ? 'down' : r.volRatio < .8 ? 'up' : ''}">${r.volRatio == null ? '—' : r.volRatio.toFixed(2) + '×'}</td><td class="num"><span class="hcell" style="background:${heat(r.unit === 'bp' ? null : r.var95, 6)}">${r.var95 == null ? '—' : r.var95.toFixed(2) + u}</span></td><td class="num hide-sm">${r.cvar95 == null ? '—' : r.cvar95.toFixed(2) + u}</td><td class="num"><span class="hcell" style="background:${heat(r.ddFromHigh, 25)}">${r.ddFromHigh == null ? '—' : r.ddFromHigh.toFixed(1) + '%'}</span></td><td class="num hide-sm down">${r.maxDD1y == null ? '—' : r.maxDD1y.toFixed(1) + '%'}</td><td class="num hide-sm ${tone(r.vs200)}">${r.vs200 == null ? '—' : (r.vs200 > 0 ? '+' : '') + (r.unit === 'bp' ? Math.round(r.vs200) + ' bp' : r.vs200.toFixed(1) + '%')}</td><td class="hide-sm">${r.rangePos == null ? '—' : `<span class="rangebar"><i style="left:${Math.round(r.rangePos * 100)}%"></i></span>`}</td></tr>`; }).join('') + '</tbody>';
      };
      drawTable();
      $('#risk-table').onclick = e => { const th = e.target.closest('th.sortable'); if (th) { if (R.sortKey === th.dataset.k) R.sortAsc = !R.sortAsc; else { R.sortKey = th.dataset.k; R.sortAsc = ['id', 'var95', 'cvar95', 'ddFromHigh', 'maxDD1y'].includes(th.dataset.k); } drawTable(); return; } const tr = e.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id); };
      $('#risk-method').textContent = tbl.method;
      $('#risk-csv').onclick = () => csvDownload(`risk-${new Date().toISOString().slice(0, 10)}.csv`, tbl.rows.filter(r => !r.unavailable).map(({ id, name, cls, unit, vol30, vol1y, volPct, volRatio, var95, cvar95, ddFromHigh, maxDD1y, vs200, rangePos, asOf, source }) => ({ id, name, class: cls, unit, vol30, vol1y, volPct, volRatio, var95, cvar95, ddFromHigh, maxDD1y, vs200, rangePos, asOf, source })));
    }

    // Signals
    const drawSigs = () => { if (sig.error) { $('#sig-list').innerHTML = errorBox(sig.error); return; } const list = sig.signals.filter(s => R.dir === 'all' || (R.dir === 'rsi' ? /Overbought|Oversold/.test(s.type) : s.dir === R.dir && !/Overbought|Oversold/.test(s.type))); renderSignalList('#sig-list', list, (id) => { R.trendId = id; $('#trend-id').value = id; drawTrend(); highlightSig(); $('#trend-chart').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, R.trendId); };
    mount('#sig-dir', seg([['all', 'All'], ['up', 'Bullish'], ['down', 'Bearish'], ['rsi', 'Stretched']], R.dir, d => { R.dir = d; drawSigs(); }, ''));
    drawSigs(); if (!sig.error) $('#sig-method').textContent = sig.method;
    drawTrend();
  }
  function highlightSig() { $$('#sig-list .li').forEach(x => x.classList.toggle('sel', x.dataset.id === state.risk.trendId)); }
  function drawTrend() {
    return guard('#trend-chart', async () => {
      const R = state.risk; const t = await api(`/risk/trend?id=${R.trendId}&window=${R.trendWindow}`); const T = tok();
      chart('#trend-chart', { grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 4, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt.px(v) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', scale: true, ...axis(T) }, dataZoom: [{ type: 'inside' }], series: [
        { name: `${t.name}`, type: 'line', showSymbol: false, data: t.price, lineStyle: { width: 1.7, color: T.fg }, itemStyle: { color: T.fg }, markPoint: { symbol: 'pin', symbolSize: 34, label: { fontSize: 10, fontWeight: 600, formatter: p => p.data.dir === 'up' ? 'G' : 'D', color: '#fff' }, data: t.events.map(e => ({ coord: [e.date, e.value], dir: e.dir, name: e.type, itemStyle: { color: e.dir === 'up' ? T.up : T.down } })) } },
        { name: '50-day', type: 'line', showSymbol: false, data: t.ma50, lineStyle: { width: 1.3, color: T.accent }, itemStyle: { color: T.accent } },
        { name: '200-day', type: 'line', showSymbol: false, data: t.ma200, lineStyle: { width: 1.3, color: T.blue, type: 'dashed' }, itemStyle: { color: T.blue } },
      ] });
    });
  }

  /* ═════════════════════ INTELLIGENCE ═════════════════════ */
  async function renderIntel() {
    const v = $('#view-intel'); v.innerHTML = loading('Scanning for anomalies and pattern resemblance…');
    const [an, pat] = await Promise.all([api('/intel/anomalies'), api('/intel/patterns')]);
    v.innerHTML = `
      ${card({ icon: 'target', title: 'Detected anomalies', sub: `${an.items.length} instrument${an.items.length === 1 ? '' : 's'} moved beyond 2σ`, actions: '<span class="badge measured">measured</span>', bodyClass: 'flush', body: '<div class="tbl"><table class="t" id="anom-table"></table></div>', foot: esc(an.method) })}
      ${card({ icon: 'history', title: 'Historical pattern resemblance', sub: 'How many signatures of past crises are present today', actions: '<span class="badge estimate">heuristic</span>', body: '<div class="grid g-auto" id="pattern-body"></div>', foot: esc(pat.method) })}
      ${card({ icon: 'intel', title: 'AI market intelligence', sub: 'Signal → evidence → possible cause → cross-asset impact → confidence → what to watch', actions: '<span class="badge ai">AI interpretation</span>', body: `<div class="ai-row"><input type="text" id="ai-q" placeholder="Optional question, e.g. why are long yields falling?"><button class="btn" id="ai-run">${ic('intel')}Run analysis</button></div><div id="ai-body" style="margin-top:14px;display:flex;flex-direction:column;gap:12px"><p class="dim">The model sees only the measured inputs on this page plus recent news snippets when a search key is set. It must separate verified facts, historical relationships, hypotheses and scenarios, and cite its sources.</p></div>` })}`;
    $('#anom-table').innerHTML = an.items.length ? `<thead><tr><th class="stick">Instrument</th><th class="hide-sm">Date</th><th class="num">1-day</th><th class="num">z</th><th class="num hide-sm">5-day</th><th class="num hide-sm">z</th><th class="num hide-sm">Vol ratio</th><th>Severity</th></tr></thead><tbody>` + an.items.map(x => `<tr data-id="${x.id}"><td class="stick"><div class="inst"><b>${x.id}</b><span>${esc(x.name)}</span></div></td><td class="muted hide-sm">${x.date}</td><td class="num ${tone(x.move1d)}">${x.move1d > 0 ? '+' : ''}${x.move1d}${x.unit === 'bp' ? ' bp' : '%'}</td><td class="num">${x.z1}</td><td class="num hide-sm ${tone(x.move5d)}">${x.move5d > 0 ? '+' : ''}${x.move5d}${x.unit === 'bp' ? ' bp' : '%'}</td><td class="num hide-sm">${x.z5}</td><td class="num hide-sm">${x.volRatio ?? '—'}×</td><td><span class="badge ${x.severity === 'extreme' ? 'bad' : x.severity === 'high' ? 'mid' : ''}">${x.severity}</span></td></tr>`).join('') + '</tbody>' : `<tbody><tr><td>${emptyState('No moves beyond 2σ in the latest observations.', 'target')}</td></tr></tbody>`;
    $('#anom-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };
    $('#pattern-body').innerHTML = pat.items.map(p => `<div class="pattern"><div class="pattern-h"><b>${esc(p.name)}</b><span class="mono ${p.hits / p.total >= .5 ? 'warn-c' : 'muted'}">${p.hits}/${p.total}</span></div><span class="meter"><i style="width:${(p.resemblance * 100).toFixed(0)}%"></i></span><p class="sm dim">${esc(p.summary)}</p><div>${p.checks.map(c => `<div class="check ${c.hit ? 'hit' : 'miss'}"><i></i><span>${esc(c.label)}</span></div>`).join('')}</div><div class="xs">${p.sources.map(s => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(new URL(s).host.replace('www.', ''))}</a>`).join(' · ')}</div></div>`).join('');
    $('#ai-run').onclick = runAI;
  }
  async function runAI() {
    const b = $('#ai-body'); const btn = $('#ai-run'); btn.disabled = true; b.innerHTML = loading('Gathering evidence and asking the model…');
    try {
      const r = await api('/intel/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: $('#ai-q').value || undefined }) });
      if (!r.aiStatus.configured) { b.innerHTML = `<div class="callout warn">${ic('key')}<div>${esc(r.aiStatus.message)}</div></div><p class="dim sm">Ready to send: ${r.inputs.anomalies.length} anomalies, regime ${esc(r.regime.label)}, ${r.patterns.items.reduce((s, p) => s + p.hits, 0)} crisis signatures present.</p>`; return; }
      if (r.aiStatus.error) { b.innerHTML = errorBox('AI request failed: ' + r.aiStatus.error); return; }
      const ai = r.ai || {}; const news = (r.news && r.news.items) || [];
      b.innerHTML = `<div class="callout">${ic('intel')}<div><b>Overview.</b> ${esc(ai.overview || '')}</div></div>` + (ai.findings || []).map(f => `<div class="finding"><h4>${esc(f.signal)} <span class="badge ${f.confidence === 'High' ? 'measured' : f.confidence === 'Medium' ? 'mid' : 'bad'}">${esc(f.confidence)} confidence</span></h4>
        <div class="row"><b>Evidence</b><ul>${(f.evidence || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="row"><b>Possible cause</b><div>${esc(f.possibleCause)}</div></div>
        <div class="row"><b>Cross-asset impact</b><div>${esc(f.crossAssetImpact)}</div></div>
        <div class="row"><b>Confidence</b><div>${esc(f.confidence)}: ${esc(f.confidenceWhy)}</div></div>
        <div class="row"><b>What to watch</b><ul>${(f.whatToWatch || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${f.classification ? `<div class="row"><b>Classification</b><div class="sm" style="display:flex;flex-direction:column;gap:6px">${['verifiedFacts', 'historicalRelationships', 'hypotheses', 'scenarios'].filter(k => (f.classification[k] || []).length).map(k => `<div><span class="badge ${k === 'verifiedFacts' ? 'measured' : k === 'hypotheses' ? 'ai' : 'mid'}">${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span> ${(f.classification[k] || []).map(esc).join(' · ')}</div>`).join('')}</div></div>` : ''}
        ${(f.citations || []).length ? `<div class="row"><b>Sources</b><div class="sm">${f.citations.map(n => news[n - 1] ? `[${n}] <a href="${esc(news[n - 1].url)}" target="_blank" rel="noopener">${esc(news[n - 1].title)}</a>` : `[${n}]`).join('<br>')}</div></div>` : ''}</div>`).join('') + `<p class="xs muted">Model ${esc(r.aiStatus.model || '')} · ${news.length ? news.length + ' news snippets supplied' : esc((r.news && r.news.note) || 'no news supplied')}</p>`;
    } catch (e) { b.innerHTML = errorBox(e.message); } finally { btn.disabled = false; }
  }

  /* ═════════════════════ SHOCK SIMULATOR ═════════════════════ */
  function renderShock() {
    const v = $('#view-shock'); const s = state.shock; const drivers = state.universe.shockDrivers;
    v.innerHTML = `<div class="grid g-main">
      ${card({ icon: 'shock', title: 'Scenario', sub: 'Apply a move to one driver and see historical co-movement', actions: '<span class="badge estimate">scenario estimate</span>', body: `<div class="controls"><div class="field"><label for="sh-driver">Shock to</label><select id="sh-driver">${drivers.map(d => `<option value="${d.id}" ${d.id === s.driver ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}</select></div><div class="field"><label>Betas estimated over</label><span id="sh-win"></span></div><div class="field"><label for="sh-num" id="sh-label">Shock size</label><input type="number" id="sh-num" step="1"></div></div><input type="range" id="sh-range" aria-label="Shock size" style="margin-top:10px"><div id="sh-chart" class="ch-xl ch" style="margin-top:6px"></div>`, foot: 'Estimated move = β × shock, where β is the slope of each instrument\'s daily change on the driver\'s daily change. Bar opacity follows R². These are statistical sensitivities, not forecasts: in 2008 most assets fell together, and in 2022 stocks and bonds fell together.' })}
      ${card({ icon: 'grid', title: 'Sensitivities', sub: '<span id="sh-cap"></span>', bodyClass: 'flush', body: '<div class="tbl scroll-y" style="max-height:720px"><table class="t" id="sh-table"></table></div>' })}
    </div>`;
    const setDriver = () => { const d = drivers.find(x => x.id === s.driver); const r = $('#sh-range'); r.min = d.range[0]; r.max = d.range[1]; r.step = d.step; if (s.value < d.range[0] || s.value > d.range[1]) s.value = d.unit === 'bp' ? 50 : -10; r.value = s.value; $('#sh-num').value = s.value; $('#sh-label').textContent = `Shock size (${d.unit})`; };
    $('#sh-driver').onchange = e => { s.driver = e.target.value; setDriver(); loadBetas(); };
    mount('#sh-win', seg(['180D', '1Y', '5Y', '10Y'], s.window, w => { s.window = w; loadBetas(); }));
    $('#sh-range').oninput = e => { s.value = Number(e.target.value); $('#sh-num').value = s.value; drawShock(); };
    $('#sh-num').onchange = e => { s.value = Number(e.target.value); $('#sh-range').value = s.value; drawShock(); };
    setDriver(); loadBetas();
    async function loadBetas() { $('#sh-table').innerHTML = `<tbody><tr><td>${loading('Estimating betas…')}</td></tr></tbody>`; try { s.betas = await api(`/shock/betas?driver=${s.driver}&window=${s.window}`); drawShock(); } catch (e) { $('#sh-table').innerHTML = `<tbody><tr><td>${errorBox(e.message)}</td></tr></tbody>`; } }
    function drawShock() {
      const b = s.betas; if (!b) return; const d = drivers.find(x => x.id === s.driver); const T = tok();
      const rows = b.targets.filter(t => t.beta != null).map(t => ({ ...t, est: t.beta * s.value })).sort((x, y) => y.est - x.est);
      const lbl = (r) => r.id;
      $('#sh-chart').style.height = Math.max(380, rows.length * 22 + 40) + 'px';
      chart('#sh-chart', { grid: { left: 8, right: 56, top: 6, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const r = rows[ps[0].dataIndex]; return `<b>${esc(r.name)}</b><br>Estimated ${r.est > 0 ? '+' : ''}${r.est.toFixed(2)} ${r.unit}<br>β ${r.beta} · R² ${r.r2} · n ${r.n}`; } }, xAxis: { type: 'value', ...axis(T) }, yAxis: { type: 'category', inverse: true, data: rows.map(lbl), ...axis(T, { splitLine: { show: false } }), axisLabel: { fontSize: 11, color: T.fg, fontFamily: T.mono } }, series: [{ type: 'bar', barWidth: '62%', data: rows.map(r => ({ value: Number(r.est.toFixed(2)), itemStyle: { color: r.est >= 0 ? T.up : T.down, opacity: 0.3 + 0.7 * Math.min(1, r.r2 * 2.5), borderRadius: r.est >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] } })), label: { show: true, position: 'right', fontSize: 10, color: T.fg3, formatter: p => `${p.value > 0 ? '+' : ''}${p.value}${rows[p.dataIndex].unit === 'bp' ? ' bp' : '%'}` } }] });
      $('#sh-cap').innerHTML = `If ${esc(d.label)} moves <b class="${tone(s.value)}">${s.value > 0 ? '+' : ''}${s.value} ${d.unit}</b> · betas over ${b.window}`;
      $('#sh-table').innerHTML = `<thead><tr><th class="stick">Instrument</th><th class="num">Est. move</th><th class="num">β</th><th class="num">R²</th><th class="num hide-sm">n</th></tr></thead><tbody>` + rows.map(r => `<tr data-id="${r.id}"><td class="stick"><div class="inst"><b>${r.id}</b><span>${esc(r.name)}</span></div></td><td class="num"><span class="hcell ${tone(r.est)}" style="background:${heat(r.unit === 'bp' ? r.est / 10 : r.est, 10)}">${r.est > 0 ? '+' : ''}${r.est.toFixed(2)}${r.unit === 'bp' ? ' bp' : '%'}</span></td><td class="num">${Number(r.beta).toFixed(3)}</td><td class="num ${r.r2 < 0.05 ? 'muted' : ''}">${Number(r.r2).toFixed(2)}</td><td class="num muted hide-sm">${r.n}</td></tr>`).join('') + '</tbody>';
      $('#sh-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };
    }
  }

  /* ═════════════════════ ADMIN ═════════════════════ */
  function renderAdmin() {
    const v = $('#view-admin'); const a = state.admin;
    const hdr = () => ({ authorization: 'Bearer ' + a.token, 'content-type': 'application/json' });
    v.innerHTML = `<div class="grid g-main">
      ${card({ icon: 'key', title: 'API credentials', sub: 'Stored server-side; values are never shown in full', body: `<div class="form-row"><label for="adm-token">Admin token</label><div class="inline"><input type="password" id="adm-token" value="${esc(a.token)}" placeholder="ADMIN_TOKEN" autocomplete="off"><button class="btn" id="adm-unlock">Unlock</button></div><div class="help">Kept in this browser tab only.</div></div><div id="adm-fields"></div>` })}
      <div style="display:flex;flex-direction:column;gap:var(--gap);min-width:0">
        ${card({ icon: 'db', title: 'Source health & cache', body: '<div id="adm-status"><p class="dim">Unlock to view.</p></div>' })}
        ${card({ icon: 'info', title: 'How data is handled', body: '<div class="sm dim" style="display:flex;flex-direction:column;gap:8px"><p><b>No key needed:</b> Yahoo Finance (delayed), FRED, CoinGecko public, gold-api.com.</p><p><b>Optional:</b> FRED, EIA, CoinGecko (longer history), Anthropic (AI explanations), Exa or Parallel (news citations).</p><p><b>Cache:</b> quotes 60 s, histories 15 min, macro 1 h. If a source fails, the last value is served and flagged stale.</p><p><b>Demo mode</b> shows a permanent banner and every badge reads demo.</p></div>' })}
      </div></div>
      ${card({ icon: 'layers', title: 'Market-size reference data', sub: 'Published aggregates behind the Overview treemap', body: '<div id="adm-sizes"><p class="dim">Unlock to edit.</p></div>', foot: 'Update when a newer SIFMA Fact Book or World Gold Council figure is published, and keep the source and as-of date.' })}`;
    const unlock = async () => {
      a.token = $('#adm-token').value; try { sessionStorage.setItem('cft:admin', a.token); } catch (e) {}
      try {
        const [k, st, sz] = await Promise.all([api('/admin/keys', { headers: hdr() }), api('/admin/status', { headers: hdr() }), api('/admin/sizes', { headers: hdr() })]);
        $('#adm-fields').innerHTML = k.fields.map(f => `<div class="form-row"><label for="k-${f.key}">${esc(f.label)} ${f.configured ? `<span class="badge measured">set${f.fromEnv ? ' · env' : ''}</span>` : '<span class="badge">not set</span>'}</label><input id="k-${f.key}" type="${f.secret === false ? 'text' : 'password'}" data-key="${f.key}" placeholder="${esc(f.value || 'Paste key')}" autocomplete="off"><div class="help">${esc(f.help)}</div></div>`).join('') + `<div class="row-actions" style="margin-top:12px;align-items:center"><button class="btn" id="adm-save">Save credentials</button><span class="xs muted">Blank keeps the current value. Type <code>clear</code> to remove one.</span></div>`;
        $('#adm-save').onclick = async () => { const upd = {}; $$('#adm-fields input[data-key]').forEach(i => { if (i.value) upd[i.dataset.key] = i.value === 'clear' ? '' : i.value; }); if (!Object.keys(upd).length) return toast('Nothing to save'); try { await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify(upd) }); toast('Credentials saved'); unlock(); } catch (e) { toast(e.message); } };
        $('#adm-status').innerHTML = `<div class="tbl"><table class="t"><thead><tr><th>Source</th><th class="num">OK</th><th class="num">Failed</th><th class="num">Stale</th></tr></thead><tbody>${Object.entries(st.bySource).map(([s, x]) => `<tr><td><span style="display:inline-flex;gap:8px;align-items:center"><i class="dot ${x.failed ? 'bad' : 'ok'}"></i>${esc(s)}</span>${x.errors.length ? `<div class="xs muted">${x.errors.map(esc).join('<br>')}</div>` : ''}</td><td class="num up">${x.ok}</td><td class="num ${x.failed ? 'down' : 'muted'}">${x.failed}</td><td class="num ${x.stale ? 'down' : 'muted'}">${x.stale}</td></tr>`).join('')}</tbody></table></div><p class="xs muted" style="margin:10px 0">Key-value store: ${st.kv ? 'connected' : 'not connected (memory cache only)'} · demo mode ${st.demoMode ? 'on' : 'off'}</p><button class="btn ghost" id="adm-clear">${ic('refresh')}Clear cache</button>`;
        $('#adm-clear').onclick = async () => { try { const r = await api('/admin/cache/clear', { method: 'POST', headers: hdr() }); toast(`Cleared ${r.cleared} cache entries`); } catch (e) { toast(e.message); } };
        $('#adm-sizes').innerHTML = sz.references.filter(r => r.id !== 'CRYPTO_TOTAL').map(r => `<div class="form-row"><label>${esc(r.label)} <span class="xs muted">${esc(r.measure.replace(/_/g, ' '))}</span></label><div class="inline"><input type="number" data-sz="${r.id}" data-f="${r.tonnes ? 'tonnes' : 'usd'}" placeholder="${r.tonnes ? r.tonnes + ' tonnes' : (r.usd / 1e12).toFixed(1) + ' $T'}" value="${r.override ? (r.override.tonnes || r.override.usd / 1e12) : ''}" aria-label="${esc(r.label)} value"><input type="text" data-szs="${r.id}" placeholder="${esc(r.source)}" value="${esc(r.override?.source || '')}" aria-label="Source"><input type="text" data-sza="${r.id}" placeholder="${esc(r.asOf)}" value="${esc(r.override?.asOf || '')}" aria-label="As of" style="flex:0 1 90px"></div></div>`).join('') + `<div class="row-actions" style="margin-top:12px"><button class="btn" id="adm-size-save">Save reference data</button></div>`;
        $('#adm-size-save').onclick = async () => { const o = {}; $$('#adm-sizes input[data-sz]').forEach(i => { if (!i.value) return; const id = i.dataset.sz; o[id] = i.dataset.f === 'tonnes' ? { tonnes: Number(i.value) } : { usd: Number(i.value) * 1e12 }; o[id].source = $(`[data-szs="${id}"]`).value || undefined; o[id].asOf = $(`[data-sza="${id}"]`).value || undefined; }); try { await api('/admin/sizes', { method: 'POST', headers: hdr(), body: JSON.stringify(o) }); toast('Reference data saved'); } catch (e) { toast(e.message); } };
      } catch (e) { $('#adm-fields').innerHTML = errorBox(e.message); }
    };
    $('#adm-unlock').onclick = unlock; $('#adm-token').onkeydown = e => { if (e.key === 'Enter') unlock(); };
    if (a.token) unlock();
  }

  /* ═════════════════════ navigation & boot ═════════════════════ */
  const renderers = { overview: renderOverview, monitor: renderMonitor, flows: renderFlows, analytics: renderAnalytics, risk: renderRisk, intel: renderIntel, shock: renderShock, admin: renderAdmin };
  async function show(view) {
    if (!(view in renderers)) view = 'overview';
    state.view = view; const meta = VIEWS[view];
    $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + view));
    $('#page-title').textContent = meta.title; $('#page-sub').textContent = meta.sub; document.title = `${meta.label} · Capital Flow Terminal`;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    window.scrollTo({ top: 0 });
    $$('.view:not(.active) .ch, .view:not(.active) [id$="-chart"], .view:not(.active) .ch-mini').forEach(n => { const c = window.echarts && echarts.getInstanceByDom(n); if (c) { if (ro) ro.unobserve(n); c.dispose(); } });
    try { await renderers[view](); } catch (e) { $('#view-' + view).innerHTML = errorBox('Could not load this view: ' + e.message); }
  }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h in renderers && h !== state.view) show(h); });
  const syncThemeIcon = () => { const b = $('#theme-btn'); b.innerHTML = ic(document.documentElement.dataset.theme === 'light' ? 'moon' : 'sun'); };
  $('#theme-btn').onclick = () => { const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = t; try { localStorage.setItem('cft:theme', t); } catch (e) {} syncThemeIcon(); show(state.view); };
  $('#refresh-btn').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { await loadCore(); await show(state.view); toast('Data refreshed'); } catch (err) { toast(err.message); } finally { b.disabled = false; } };
  $('#connect-btn').onclick = () => { $('#connect-box').hidden = !$('#connect-box').hidden; };
  $('#connect-url').value = apiBase;
  $('#connect-save').onclick = () => { apiBase = $('#connect-url').value.trim(); store.set('cft:apiBase', apiBase); location.reload(); };
  if (apiBase) $('#connect-btn').classList.add('on');
  if (SNAP && !apiBase) { const b = $('#snapshot-banner'); b.hidden = false; b.innerHTML = `Snapshot of live data captured ${esc(SNAP.capturedAt.replace('T', ' ').slice(0, 16))} UTC from Yahoo Finance, FRED, CoinGecko and gold-api. It does not update. Use the link icon to connect the live API.`; }

  // theme attribute from storage may be JSON-encoded by store.set; normalise once
  try { const raw = localStorage.getItem('cft:theme'); if (raw && raw.startsWith('"')) { const t = JSON.parse(raw); localStorage.setItem('cft:theme', t); document.documentElement.dataset.theme = t; } } catch (e) {}
  buildNav(); paintIcons(); syncThemeIcon();
  (async () => {
    try { await loadCore(); } catch (e) { $('#ticker-inner').innerHTML = `<span class="down">Quotes unavailable: ${esc(e.message)}</span>`; $('#view-overview').innerHTML = errorBox(`The API could not be reached (${e.message}). Check that the server is running and can reach the data sources.`); return; }
    show(location.hash.slice(1) || 'overview');
    setInterval(async () => { if (SNAP && !apiBase) return; try { await loadCore(); if (state.view === 'monitor') drawMonTable(); } catch (e) {} }, 60000);
  })();
})();
