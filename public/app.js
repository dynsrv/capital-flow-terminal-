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
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18.5 14.4c2.1.8 3.5 2.8 3.5 5.6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 17-5-5 5-5"/><path d="M5 12h11"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.9-2.6 2.4-2.6 4.1"/><path d="M12 17.6h.01"/>',
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
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h14v9H4"/><path d="M4 8.5h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    vol: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    volx: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    news: '<path d="M4 4h12a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M18 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2"/><path d="M8 8h6M8 12h6M8 16h4"/>',
    tv: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="m17 2-5 5-5-5"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    popout: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
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
    glossary: { label: 'Glossary', icon: 'book', title: 'Glossary and simple explanations for finance terms', sub: 'Every term used in this dashboard, in plain language, with where to see it' },
    admin: { label: 'Admin', icon: 'admin', title: 'Admin console', sub: 'Keys, members, real-time data, usage and settings' },
  };

  /* ───────── state ───────── */
  const state = {
    view: 'overview', universe: null, perf: [], loadedAt: null,
    watchlist: store.get('cft:watchlist', ['SPX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'VIX', 'HYOAS']),
    monitor: { cls: 'all', region: 'all', q: '', horizon: '1D', sortKey: 'cls', sortAsc: true, watchOnly: false },
    analytics: { window: '30D', ids: ['SPX', 'NDX', 'SX5E', 'NKY', 'EEM', 'UST10Y', 'TLT', 'HYG', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'DXY', 'VIX'], relWindow: '1Y', relIds: ['SPX', 'EEM', 'BTC', 'GOLD', 'TLT', 'DXY'], rollA: 'SPX', rollB: 'UST10Y', rollWindow: '1Y', anchor: 'SPX' },
    risk: { trendId: 'SPX', trendWindow: '1Y', dir: 'all', sortKey: 'volPct', sortAsc: false },
    shock: { driver: 'SPX', value: -10, window: '1Y', betas: null },
    admin: { token: (() => { try { return sessionStorage.getItem('cft:admin') || ''; } catch (e) { return ''; } })() },
    news: { region: 'all', cat: 'all', data: null },
    tv: { streams: [], current: store.get('cft:tv', 'bloomberg'), playing: false },
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

  /* ───────── roles: visitor (delayed), member (PIN → live), admin (token) ───────── */
  const auth = { m: store.get('cft:member', null), role: 'visitor' };
  const memberTok = () => (auth.m && auth.m.token && new Date(auth.m.expiresAt) > new Date() ? auth.m.token : null);
  const liveTok = () => state.admin.token || memberTok();
  const liveHeaders = () => { const t = liveTok(); return t ? { authorization: 'Bearer ' + t } : {}; };
  const isLive = () => !!liveTok();
  function setMember(m) { auth.m = m; store.set('cft:member', m); syncRole(); }
  function syncRole() {
    const m = memberTok() ? auth.m : null; const admin = !!state.admin.token;
    auth.role = admin ? 'admin' : m ? 'member' : 'visitor';
    document.body.dataset.role = auth.role;
    const b = $('#member-btn');
    if (b) {
      b.classList.toggle('on', !!m || admin);
      b.innerHTML = m ? `<span class="mb-av">${esc((m.name || '?').trim().charAt(0).toUpperCase())}</span><span class="mb-t">${esc(m.name)}</span>` : admin ? `${ic('key')}<span class="mb-t">Admin</span>` : `${ic('user')}<span class="mb-t">Sign in</span>`;
      b.title = m ? `Signed in as ${m.name} · live prices` : admin ? 'Admin session (this tab)' : 'Members: sign in with your PIN for live prices';
    }
    syncTickerTag();
  }
  function syncTickerTag() {
    const t = $('#ticker-tag'); if (!t) return;
    const live = document.body.classList.contains('rt-on');
    t.className = 'ticker-tag ' + (live ? 'is-live' : isLive() ? 'member' : 'visitor');
    t.innerHTML = live ? '<i></i>Live' : isLive() ? 'Delayed' : `Delayed<span class="tt-cta">· Sign in for live</span>`;
    t.title = live ? 'Real-time prices are on for your session' : isLive() ? 'Real-time is switched off on the server; prices are delayed' : 'Visitors see delayed prices. Members sign in with a PIN for live prices.';
  }
  function openAccount() {
    const m = memberTok() ? auth.m : null;
    const ov = document.createElement('div'); ov.className = 'pin-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    if (m) {
      ov.innerHTML = `<div class="pin-card"><button class="icon-btn sm pin-x" aria-label="Close">${ic('x')}</button><div class="pin-av">${esc(m.name.charAt(0).toUpperCase())}</div><h3>${esc(m.name)}</h3><p class="dim sm">Member · signed in until ${esc(fmt.date(m.expiresAt))}</p>
        <div class="kv pin-kv"><dt>Prices</dt><dd class="${document.body.classList.contains('rt-on') ? 'up' : 'muted'}">${document.body.classList.contains('rt-on') ? 'Live (real-time)' : 'Delayed: real-time is off on the server'}</dd><dt>Live TV</dt><dd>All channels, including relayed ones</dd></div>
        <button class="btn ghost pin-out">${ic('logout')}Sign out</button></div>`;
      $('.pin-out', ov).onclick = () => { setMember(null); close(); startRt(); loadCore().catch(() => {}); toast('Signed out. Prices are delayed.'); };
    } else {
      ov.innerHTML = `<div class="pin-card"><button class="icon-btn sm pin-x" aria-label="Close">${ic('x')}</button><div class="pin-ic">${ic('lock')}</div><h3>Member sign-in</h3><p class="dim sm">Enter your PIN for live prices and every TV channel. Visitors see delayed prices.</p>
        <form class="pin-form" autocomplete="off"><input class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="one-time-code" placeholder="••••••" aria-label="PIN"><div class="pin-dots" aria-hidden="true"></div>
        <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clr', 0, 'del'].map(k => `<button type="button" data-k="${k}" ${k === 'clr' || k === 'del' ? 'class="fn"' : ''}>${k === 'del' ? '⌫' : k === 'clr' ? 'Clear' : k}</button>`).join('')}</div>
        <div class="pin-err" role="alert"></div><button class="btn pin-go" type="submit">Sign in</button></form><p class="xs muted">Ask the administrator for a PIN.</p></div>`;
      const inp = $('.pin-in', ov); const dots = $('.pin-dots', ov); const err = $('.pin-err', ov);
      const sync = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 10); dots.innerHTML = Array.from({ length: Math.max(6, inp.value.length) }, (_, i) => `<i class="${i < inp.value.length ? 'on' : ''}"></i>`).join(''); err.textContent = ''; };
      inp.oninput = sync; sync(); setTimeout(() => inp.focus(), 30);
      $('.pin-pad', ov).onclick = (e) => { const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k; inp.value = v === 'del' ? inp.value.slice(0, -1) : v === 'clr' ? '' : inp.value + v; sync(); inp.focus(); };
      $('.pin-form', ov).onsubmit = async (e) => {
        e.preventDefault(); const pin = inp.value; if (pin.length < 6) { err.textContent = 'PINs have 6 to 10 digits.'; return; }
        const go = $('.pin-go', ov); go.disabled = true; go.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>Checking…';
        try {
          if (SNAP && !apiBase) throw new Error('Connect the live API to sign in.');
          const r = await fetch((apiBase ? apiBase.replace(/\/$/, '') : '') + '/api/auth/member', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
          const j = await r.json().catch(() => ({})); if (!j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setMember({ token: j.token, name: j.member.name, id: j.member.id, expiresAt: j.expiresAt }); close(); await startRt();
          toast(document.body.classList.contains('rt-on') ? `Welcome, ${j.member.name}. Prices are live.` : `Welcome, ${j.member.name}. Real-time is off on the server, so prices stay delayed.`);
          if (state.tv && state.tv.current) loadTv();
        } catch (x) { err.textContent = x.message; inp.value = ''; sync(); go.disabled = false; go.textContent = 'Sign in'; ov.querySelector('.pin-card').classList.add('shake'); setTimeout(() => { const c = ov.querySelector('.pin-card'); if (c) c.classList.remove('shake'); }, 400); }
      };
    }
    $('.pin-x', ov).onclick = close; ov.onclick = (e) => { if (e.target === ov) close(); };
    document.body.appendChild(ov); applyTitleCase(ov);
  }
  async function checkMember() {
    if (!auth.m) return;
    if (!memberTok()) { setMember(null); return; }
    if (SNAP && !apiBase) return;
    try { const r = await api('/auth/me', { headers: { authorization: 'Bearer ' + auth.m.token } }); if (r.role !== 'member') { setMember(null); toast(r.revoked ? 'Your member session was ended by the administrator.' : 'Your member session has expired. Sign in again.'); } } catch (e) {}
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
  const ord = (n) => { const v = Math.round(n); const t = v % 100; return v + (t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th')); };
  const tone = (v) => v == null ? 'muted' : v > 0 ? 'up' : v < 0 ? 'down' : '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const badge = (q) => { const f = q.stale ? 'stale' : (q.error && !q.available) ? 'error' : (q.freshness || 'eod'); const t = q.stale ? 'Stale: showing the last cached value. Source error: ' + (q.error || '') : 'Data freshness: ' + f; return `<span class="badge ${f}" title="${esc(t)}">${f === 'realtime' ? 'live' : f}</span>`; };
  const heat = (v, max) => { if (v == null || !isFinite(v)) return 'var(--surface-2)'; const t = Math.max(-1, Math.min(1, v / (max || 1))); const p = Math.round(10 + 52 * Math.abs(t)); return `color-mix(in srgb, var(${t >= 0 ? '--up' : '--down'}) ${p}%, var(--surface-2))`; };
  const tok = () => { const g = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return { fg: g('--fg'), fg2: g('--fg-2'), fg3: g('--fg-3'), line: g('--line'), line2: g('--line-2'), surface: g('--surface'), surface2: g('--surface-2'), bg: g('--bg'), accent: g('--accent'), blue: g('--blue'), violet: g('--violet'), teal: g('--teal'), up: g('--up'), down: g('--down'), warn: g('--warn'), mono: g('--mono'), c1: g('--c1'), c2: g('--c2'), c3: g('--c3'), c4: g('--c4'), dark: document.documentElement.dataset.theme !== 'light' }; };
  // Chart palette from the brand swatch: red #ff433d, blue #0068ff, orange #fb8b1e, mint #4af6c3 on black.
  // The four swatch colours come first; series five onward use lighter (dark theme) or deeper (light theme) tints of the same hues.
  const series = (T) => T.dark ? [T.c1, '#3d8bff', T.c3, T.c4, '#ff8f8b', '#9cc4ff', '#fdba76', '#a6fbe0'] : [T.c1, T.c2, T.c3, T.c4, '#b8231e', '#0048b3', '#b85f00', '#0b8a64'];
  const CLS_COLOR = (T) => { const S = series(T); return { equity: S[0], rates: S[1], credit: S[5], crypto: S[3], commodity: S[2], fx: S[6], macro: T.fg3 }; };
  const shade = (hex, f) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f); return '#' + [m(r), m(g), m(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };

  // Blend two hex colours (t = share of b). Used for the softer, gradient fills of the capital-concentration view.
  const blend = (a, b, t) => { const p = (h) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map(c => c + c).join('') : x, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }; const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const softFill = (hex, T) => { const base = T.dark ? T.surface : '#ffffff'; return T.dark ? [blend(hex, base, 0.42), blend(hex, base, 0.68)] : [blend(hex, base, 0.30), blend(hex, base, 0.58)]; };
  // Text colour that stays readable on a given fill: black on light fills (mint, orange), white on dark ones.
  const inkOn = (hex) => { const h = String(hex || '').replace('#', ''); if (h.length !== 6) return '#fff'; const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? '#000' : '#fff'; };
  /* ───────── Title Case for titles and labels ─────────
     Applied to the text of headings, navigation, buttons, badges and labels (not to sentences, headlines or data).
     Acronyms and tickers keep their capitals; short joining words stay lowercase unless they open the phrase. */
  const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via', 'with']);
  const ACR = { eod: 'EOD', ai: 'AI', id: 'ID', us: 'US', usd: 'USD', etf: 'ETF', etfs: 'ETFs', vix: 'VIX', oas: 'OAS', gdp: 'GDP', cpi: 'CPI', fx: 'FX', idr: 'IDR', ihsg: 'IHSG', bp: 'bp', tv: 'TV', api: 'API', url: 'URL', utc: 'UTC', ytd: 'YTD', hy: 'HY', ig: 'IG', em: 'EM', uk: 'UK', eu: 'EU', fred: 'FRED', eia: 'EIA', csv: 'CSV', ols: 'OLS', yoy: 'YoY', '1d': '1D', '30d': '30D', '1y': '1Y', '5y': '5Y', '10y': '10Y' };
  function titleCase(str) {
    if (!/[a-z]/i.test(str)) return str;
    const letters = str.replace(/[^A-Za-z]/g, '');
    let t = (letters.length >= 6 && letters === letters.toUpperCase() && /[A-Z]{4,}/.test(str)) ? str.toLowerCase() : str; // SHOUTED text → normal first
    let first = true;
    return t.replace(/[A-Za-z0-9][A-Za-z0-9'’&.]*/g, (w, i) => {
      const lw = w.toLowerCase(); const isFirst = first; first = false;
      if (ACR[lw]) return ACR[lw];
      if (/[A-Z]/.test(w.slice(1)) || /\d/.test(w) || w.includes('&')) return w; // tickers, 10Y, S&P, iShares
      const prev = t.slice(0, i).trimEnd().slice(-1);
      const isLast = !/[A-Za-z0-9]/.test(t.slice(i + w.length));
      if (!isFirst && !isLast && SMALL.has(lw) && prev !== ':' && prev !== '·' && prev !== '/' && (prev !== '-' || /^(in|of|to|a|the|and)$/.test(lw))) return lw;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }
  const TC_SEL = '.strip-seg span, .comp .l, .nav .lbl, .card-h h3, .page-head h1, .side-h h2, .kpi-top > span:first-child, .badge, .pill > span, .btn, .seg button, .chip, .cchip, table.t th, .field > label, .pop-g, .news-day, .news-item .ct, .reading .lab, .finding h4, .finding .row > b, .drawer-h h3, .mini-item .lab, .heat-row .cls, .stat span, .tag, .kv dt, .regime-head .big, .tv-poster b, .legend span, .gauge-l span';
  function applyTitleCase(root = document) {
    const els = root.querySelectorAll ? root.querySelectorAll(TC_SEL) : [];
    for (const el of els) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { if (n.parentElement && n.parentElement.closest('input, select, option, textarea, code')) continue; const v = n.nodeValue; if (v && v.trim()) { const nv = titleCase(v); if (nv !== v) n.nodeValue = nv; } }
    }
  }
  let tcQueued = false;
  const tcObserver = new MutationObserver(() => { if (tcQueued) return; tcQueued = true; requestAnimationFrame(() => { tcQueued = false; applyTitleCase(); }); });
  tcObserver.observe(document.body, { childList: true, subtree: true });

  /* ───────── charts (ResizeObserver keeps every chart sized to its card) ───────── */
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(entries => entries.forEach(e => { const c = window.echarts && echarts.getInstanceByDom(e.target); if (c) c.resize(); })) : null;
  function chart(target, option) {
    const node = typeof target === 'string' ? $(target) : target; if (!node) return null;
    if (typeof echarts === 'undefined') { node.innerHTML = `<div class="empty">${ic('alert')}Chart library unavailable. The tables on this page still carry the data.</div>`; return null; }
    let c = echarts.getInstanceByDom(node);
    if (!c) { c = echarts.init(node, null, { renderer: 'canvas' }); if (ro) ro.observe(node); }
    const T = tok();
    c.setOption({ backgroundColor: 'transparent', textStyle: { fontFamily: T.mono, color: T.fg2, fontSize: 11 * fs() }, animationDuration: 350, tooltip: { backgroundColor: T.surface, borderColor: T.line2, textStyle: { color: T.fg, fontSize: 12 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);' }, ...option, ...(option.tooltip ? { tooltip: { backgroundColor: T.surface, borderColor: T.line2, textStyle: { color: T.fg, fontSize: 12 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);', ...option.tooltip } } : {}) }, true);
    return c;
  }
  const fs = () => Number(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 1;
  const axis = (T, extra = {}) => ({ axisLine: { lineStyle: { color: T.line2 } }, axisTick: { show: false }, axisLabel: { color: T.fg3, fontSize: 10.5 * fs() }, splitLine: { lineStyle: { color: T.line, type: 'dashed' } }, ...extra });
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
  function closeOverlays() { $('#scrim').hidden = true; $('#drawer').hidden = true; $('#popover').hidden = true; $('#side').classList.remove('open'); const sh = $('#sheet'); if (sh) sh.hidden = true; const sp = $('#search'); if (sp) sp.hidden = true; document.body.classList.remove('news-open', 'sheet-open', 'search-open'); closeTvModal(); syncTabs(); }
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
    const item = (k) => `<button type="button" data-view="${k}" title="${esc(VIEWS[k].title)}">${ic(VIEWS[k].icon)}<span class="lbl">${esc(VIEWS[k].label)}</span>${VIEWS[k].tag ? `<span class="tag">${VIEWS[k].tag}</span>` : ''}</button>`;
    const html = ['monitor', 'flows'].map(item).join('') + '<span class="nav-sep"></span>' + ['analytics', 'risk', 'intel', 'shock'].map(item).join(''); // Overview is the logo; Glossary is the (?) button; // Admin is not in the nav: open it at #admin
    $('#nav').innerHTML = html; $('#nav-mobile').innerHTML = html;
    const go = (e) => { const b = e.target.closest('button'); if (b && b.dataset.view) { closeOverlays(); show(b.dataset.view); } };
    $('#nav').onclick = go; $('#nav-mobile').onclick = go;
    $('#side-btn').onclick = () => { const o = $('#side').classList.toggle('open'); if (o) openScrim(() => $('#side').classList.remove('open')); else closeOverlays(); };
    $('#side-close').onclick = closeOverlays;
    initSideResize();
    initPhoneShell();
  }

  /* ═════════════════════ PHONE APP SHELL (<760px) ═════════════════════
     Native-app patterns: bottom tab bar (Markets · Monitor · News · Risk · More), a compact header whose title
     appears once the large page title scrolls away, News as a full-screen tab, a More sheet for the remaining
     sections and settings, pull-to-refresh, swipe-down to dismiss sheets, light haptics where supported. */
  const phoneMQ = window.matchMedia('(max-width: 759px)');
  const isPhone = () => phoneMQ.matches;
  const haptic = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} };
  const TABS = [['overview', 'Markets', 'overview'], ['monitor', 'Monitor', 'monitor'], ['news', 'News', 'news'], ['risk', 'Risk', 'risk'], ['more', 'More', 'more']];
  function syncTabs() {
    const bar = document.getElementById('tabbar'); if (!bar) return;
    const newsOpen = document.body.classList.contains('news-open');
    const sheetOpen = document.body.classList.contains('sheet-open');
    const inMore = !['overview', 'monitor', 'risk'].includes(state.view);
    bar.querySelectorAll('[data-tab]').forEach(b => { const k = b.dataset.tab; const on = sheetOpen ? k === 'more' : newsOpen ? k === 'news' : (k === state.view || (k === 'more' && inMore)); b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function openNewsTab() { closeOverlays(); $('#side').classList.add('open'); document.body.classList.add('news-open'); $('#news-list').scrollTop = 0; syncTabs(); }
  function openSheet() {
    closeOverlays();
    const tile = (k) => `<button type="button" class="sh-tile ${state.view === k ? 'active' : ''}" data-go="${k}"><span class="sh-ic">${ic(VIEWS[k].icon)}</span><span>${esc(VIEWS[k].label)}</span></button>`;
    const pill = (id) => { const p = $('#' + id); return p ? `<span class="${p.className}"><i class="dot"></i><span>${esc(p.textContent.trim())}</span></span>` : ''; };
    const dark = document.documentElement.dataset.theme !== 'light';
    $('#sheet-body').innerHTML = `
      <div class="sh-status">${pill('regime-pill')}${pill('stress-pill')}<span class="xs muted">${esc($('#updated').textContent)}</span></div>
      <div class="sh-sec">Explore</div>
      <div class="sh-grid">${['intel', 'analytics', 'flows', 'shock', 'glossary'].map(tile).join('')}<button type="button" class="sh-tile" data-act="tv"><span class="sh-ic">${ic('tv')}</span><span>Live TV</span></button><button type="button" class="sh-tile" data-act="news"><span class="sh-ic">${ic('news')}</span><span>News</span></button></div>
      <div class="sh-sec">Settings</div>
      <div class="sh-list">
        <button type="button" data-act="theme"><span class="sh-ic">${ic(dark ? 'sun' : 'moon')}</span><span>Appearance</span><b>${dark ? 'Dark' : 'Light'}</b></button>
        <button type="button" data-act="refresh"><span class="sh-ic">${ic('refresh')}</span><span>Refresh Data</span><b>or pull down</b></button>
        <button type="button" data-act="connect"><span class="sh-ic">${ic('link')}</span><span>Connect API</span><b>${apiBase ? 'connected' : SNAP ? 'snapshot' : 'this site'}</b></button>
      </div>
      <div class="sh-foot">${$('#side-health').innerHTML}<p class="xs muted">Information only. Not investment advice.</p></div>`;
    applyTitleCase($('#sheet-body'));
    const sh = $('#sheet'); sh.hidden = false; sh.style.transform = ''; document.body.classList.add('sheet-open'); openScrim(); syncTabs();
    sh.onclick = async (e) => {
      const g = e.target.closest('[data-go]'); if (g) { haptic(); closeOverlays(); show(g.dataset.go); return; }
      const a = e.target.closest('[data-act]'); if (!a) return; haptic();
      const act = a.dataset.act;
      if (act === 'tv') { closeOverlays(); openTvModal(); }
      else if (act === 'news') openNewsTab();
      else if (act === 'theme') { $('#theme-btn').click(); openSheet(); }
      else if (act === 'refresh') { closeOverlays(); $('#refresh-btn').click(); }
      else if (act === 'connect') { closeOverlays(); $('#connect-box').hidden = false; window.scrollTo({ top: 0 }); $('#connect-url').focus(); }
    };
  }
  /** Drag a handle down to dismiss a bottom sheet. */
  function swipeToClose(panel, handleSel, onClose) {
    let y0 = null, dy = 0;
    panel.addEventListener('touchstart', (e) => { if (!isPhone() || !e.target.closest(handleSel)) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; panel.style.transition = 'none'; }, { passive: true });
    panel.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
    panel.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; panel.style.transition = ''; if (dy > 90) { panel.style.transform = ''; onClose(); } else panel.style.transform = ''; });
  }
  function initPhoneShell() {
    const bar = $('#tabbar');
    bar.innerHTML = TABS.map(([k, l, i]) => `<button type="button" data-tab="${k}"><span class="tab-ic">${ic(i)}</span><span class="tab-l">${l}</span></button>`).join('');
    bar.onclick = (e) => {
      const b = e.target.closest('[data-tab]'); if (!b) return; haptic(); const k = b.dataset.tab;
      if (k === 'news') { if (document.body.classList.contains('news-open')) closeOverlays(); else openNewsTab(); return; }
      if (k === 'more') { if (document.body.classList.contains('sheet-open')) closeOverlays(); else openSheet(); return; }
      const wasOverlay = document.body.classList.contains('news-open') || document.body.classList.contains('sheet-open');
      closeOverlays();
      if (state.view === k && !wasOverlay) window.scrollTo({ top: 0, behavior: 'smooth' }); else if (state.view !== k) show(k);
    };
    swipeToClose($('#sheet'), '[data-grab], .sh-status', closeOverlays);
    swipeToClose($('#drawer'), '.drawer-h', closeOverlays);
    // header height → CSS var (News tab sits right under it)
    const hdr = $('.topbar'); const setH = () => document.documentElement.style.setProperty('--hdr-h', hdr.getBoundingClientRect().height + 'px');
    setH(); if (typeof ResizeObserver !== 'undefined') new ResizeObserver(setH).observe(hdr);
    // compact title appears in the header once the large page title scrolls under it
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(([en]) => { $('.topbar').classList.toggle('titled', !en.isIntersecting && en.boundingClientRect.top < 80); }, { rootMargin: '-60px 0px 0px 0px', threshold: 0 });
      io.observe($('#page-title'));
    }
    // pull to refresh (only at the very top of the page, outside sheets)
    const ptr = { y0: null, pull: 0, busy: false }; const el = $('#ptr');
    window.addEventListener('touchstart', (e) => { const b = document.body.classList; ptr.y0 = (!isPhone() || window.scrollY > 2 || ptr.busy || b.contains('news-open') || b.contains('sheet-open') || !$('#drawer').hidden || !$('#popover').hidden || e.target.closest('.ch, canvas, input, select, .tbl')) ? null : e.touches[0].clientY; ptr.pull = 0; }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (ptr.y0 == null) return; if (window.scrollY > 2) { ptr.y0 = null; el.style.transform = ''; el.style.opacity = ''; return; } ptr.pull = Math.min(90, Math.max(0, e.touches[0].clientY - ptr.y0) * 0.5); el.style.transform = `translate(-50%, ${ptr.pull}px) rotate(${ptr.pull * 4}deg)`; el.style.opacity = String(Math.min(1, ptr.pull / 45)); el.classList.toggle('ready', ptr.pull >= 64); }, { passive: true });
    window.addEventListener('touchend', async () => {
      if (ptr.y0 == null) return; ptr.y0 = null; const go = ptr.pull >= 64;
      if (go) { ptr.busy = true; haptic(); el.classList.add('busy'); el.style.transform = 'translate(-50%, 56px)'; try { await loadCore(); await show(state.view); loadNews(); toast('Updated'); } catch (err) { toast(err.message); } ptr.busy = false; el.classList.remove('busy'); }
      el.style.transform = ''; el.style.opacity = ''; el.classList.remove('ready');
    });
    const onMQ = () => { if (!isPhone()) document.body.classList.remove('news-open', 'sheet-open'); syncTabs(); };
    if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', onMQ);
    syncTabs();
  }
  /* Resizable sidebar (docked layout only). Width is kept per browser; double-click the handle to reset. */
  const SIDE_MIN = 260, SIDE_MAX = 640, SIDE_DEF = 312;
  const clampSide = (w) => Math.round(Math.max(SIDE_MIN, Math.min(SIDE_MAX, Math.min(w, window.innerWidth * 0.5))));
  function setSideW(w, save = true) { const v = clampSide(w); document.documentElement.style.setProperty('--side-w', v + 'px'); if (save) store.set('cft:sideW', v); return v; }
  function initSideResize() {
    const h = $('#side-resize'); if (!h) return;
    const saved = store.get('cft:sideW', null); if (saved) setSideW(saved, false);
    let startX = 0, startW = 0, drag = false;
    const move = (e) => { if (!drag) return; const x = (e.touches ? e.touches[0] : e).clientX; setSideW(startW + x - startX, false); };
    const end = () => { if (!drag) return; drag = false; document.body.classList.remove('resizing'); h.classList.remove('active'); setSideW(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--side-w')) || SIDE_DEF); window.dispatchEvent(new Event('resize')); };
    h.addEventListener('pointerdown', (e) => { drag = true; startX = e.clientX; startW = $('#side').getBoundingClientRect().width; document.body.classList.add('resizing'); h.classList.add('active'); h.setPointerCapture(e.pointerId); e.preventDefault(); });
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    h.addEventListener('dblclick', () => { setSideW(SIDE_DEF); window.dispatchEvent(new Event('resize')); });
    h.addEventListener('keydown', (e) => { const cur = $('#side').getBoundingClientRect().width; if (e.key === 'ArrowLeft') { setSideW(cur - 16); e.preventDefault(); } if (e.key === 'ArrowRight') { setSideW(cur + 16); e.preventDefault(); } });
    window.addEventListener('resize', () => { const cur = store.get('cft:sideW', null); if (cur) setSideW(cur, false); });
  }
  function setPills(regime, stress) {
    if (regime) { const p = $('#regime-pill'); p.className = 'pill ' + (regime.label.startsWith('RISK-ON') ? 'on' : regime.label.startsWith('RISK-OFF') ? 'off' : 'mid'); $('span', p).textContent = regime.label.replace(' / MIXED', ''); p.title = `Rules-based regime score ${regime.score} (−1 risk-off … +1 risk-on)`; }
    if (stress && stress.latest != null) { const p = $('#stress-pill'); p.className = 'pill ' + (stress.latest >= 75 ? 'off' : stress.latest >= 55 ? 'mid' : 'on'); $('span', p).textContent = `Stress ${Math.round(stress.latest)} · ${stress.level}`; }
  }
  $('#regime-pill').onclick = () => show('overview');
  $('#stress-pill').onclick = () => show('risk');

  async function loadCore() {
    const [u, p] = await Promise.all([state.universe ? Promise.resolve(state.universe) : api('/universe'), api('/performance')]);
    state.universe = u; state.perf = p.rows; state.loadedAt = new Date(); reapplyRt();
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
    $('#side-health').innerHTML = Object.entries(by).map(([s, v]) => `<span class="health-row" title="${esc(name[s] || s)}: ${v.ok}/${v.n} instruments OK"><i class="dot ${v.ok === v.n ? 'ok' : 'bad'}"></i>${esc(name[s] || s)} <b>${v.ok}/${v.n}</b></span>`).join('');
  }

  /* ═════════════════════ SIDEBAR: NEWS ═════════════════════ */
  const dayLabel = (iso) => { if (!iso) return 'Undated'; const d = new Date(iso); const t = new Date(); const diff = Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3); return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
  function newsItem(it) {
    const pick = it.curated;
    const t = it.publishedAt ? new Date(it.publishedAt) : null;
    const hhmm = t ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    return `<a class="news-item ${pick ? 'pick' : ''}" href="${esc(it.link)}" target="_blank" rel="noopener"><div class="nh"><div class="nt">${esc(it.title)}</div>${t ? `<time class="ntime" datetime="${esc(it.publishedAt)}" title="${esc(t.toLocaleString())} · ${fmt.ago(it.publishedAt)}">${hhmm}</time>` : ''}</div><div class="nm"><span class="src">${esc(it.source)}</span><span class="ago">${t ? fmt.ago(it.publishedAt) : ''}</span><span class="ct ${it.cat}">${it.cat}</span><span class="rg">${it.region === 'indonesia' ? 'ID' : 'Global'}</span>${pick ? '<span class="badge ai">AI pick</span>' : ''}</div>${pick && it.why ? `<div class="why">${esc(it.why)}</div>` : ''}${pick && it.assets && it.assets.length ? `<div class="assets">${it.assets.slice(0, 6).map(a => `<span>${esc(a)}</span>`).join('')}</div>` : ''}</a>`;
  }
  function drawNews() {
    const n = state.news; const box = $('#news-list'); const d = n.data; if (!d) return;
    const aiBtn = $('#news-cat [data-v="ai"]'); const hasAI = !!(d.curated && d.curated.picks && d.curated.picks.length); aiBtn.hidden = !hasAI; if (!hasAI && n.cat === 'ai') n.cat = 'all';
    $$('#news-cat .chip').forEach(b => b.classList.toggle('active', b.dataset.v === n.cat));
    const pickMap = new Map(hasAI ? d.curated.picks.map(p => [p.link, p]) : []);
    let items = n.cat === 'ai' ? d.curated.picks.map(p => ({ ...p, curated: true })) : d.items.map(it => pickMap.has(it.link) ? { ...it, ...pickMap.get(it.link), curated: true } : it);
    if (n.region !== 'all') items = items.filter(i => i.region === n.region);
    if (n.cat !== 'all' && n.cat !== 'ai') items = items.filter(i => i.cat === n.cat);
    if (!items.length) { box.innerHTML = emptyState('No headlines match these filters', 'news'); return; }
    let html = '', day = null;
    for (const it of items) { if (n.cat !== 'ai') { const l = dayLabel(it.publishedAt); if (l !== day) { day = l; html += `<div class="news-day">${l}</div>`; } } html += newsItem(it); }
    const failed = (d.sources || []).filter(s => s.error).map(s => s.name);
    html += `<div class="news-foot">${hasAI ? `AI curation ${fmt.ago(d.curated.curatedAt)} (${esc(d.curated.model)})${d.curated.themes && d.curated.themes.length ? ' · themes: ' + esc(d.curated.themes.join(', ')) : ''}. ` : ''}${d.sources ? `${d.sources.length - failed.length}/${d.sources.length} feeds` : ''}${failed.length ? ` · unavailable: ${esc(failed.join(', '))}` : ''}. Headlines are public RSS; opening a story leaves this site.</div>`;
    box.innerHTML = html;
  }
  async function loadNews(force = false) {
    const n = state.news; const meta = $('#news-meta');
    try { const d = await api('/news' + (force ? '?t=' + Date.now() : '')); n.data = d; meta.textContent = `${d.items.length} · ${fmt.ago(d.asOf)}`; drawNews(); }
    catch (e) { if (!n.data) $('#news-list').innerHTML = errorBox(SNAP && !apiBase ? 'Headlines are not part of the embedded snapshot. Connect the live API to load them.' : e.message); }
  }
  $('#news-region').onclick = e => { const b = e.target.closest('button'); if (!b) return; state.news.region = b.dataset.v; $$('#news-region button').forEach(x => x.classList.toggle('active', x === b)); drawNews(); };
  $('#news-cat').onclick = e => { const b = e.target.closest('button'); if (!b) return; state.news.cat = b.dataset.v; drawNews(); };
  $('#news-refresh').onclick = () => loadNews(true);

  /* ═════════════════════ SIDEBAR: LIVE TV (HLS) ═════════════════════
     Broadcasters' own .m3u8 streams played with hls.js (Safari plays HLS natively). Each channel has sources tried
     in order: direct first (no server traffic), then the /api/hls relay. hls.js loads only when something plays. */
  const LIVE_SITE = 'https://capital-flow-terminal-dyn-srv.vercel.app';
  const tvCur = () => state.tv.streams.find(s => s.id === state.tv.current) || state.tv.streams[0];
  const canEmbed = !(SNAP && !apiBase);
  let hlsLoader = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoader) return hlsLoader;
    hlsLoader = new Promise((res, rej) => {
      const add = (src, next) => { const el = document.createElement('script'); el.src = src; el.async = true; el.onload = () => (window.Hls ? res(window.Hls) : next()); el.onerror = next; document.head.appendChild(el); };
      add('https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.20/hls.light.min.js', () => add('/vendor/hls.light.min.js', () => { hlsLoader = null; rej(new Error('Player library unavailable')); }));
    });
    return hlsLoader;
  }
  const relayBase = () => (apiBase ? apiBase.replace(/\/$/, '') : '') + '/api/hls?u=';
  function stopPlayer(box) { if (box && box._player) { box._player.destroy(); box._player = null; } }
  /** Play channel `ch` inside `box`. Tries each source; reports status on the tile. */
  function playChannel(box, ch, { muted = true } = {}) {
    stopPlayer(box);
    box.innerHTML = `<video playsinline autoplay ${muted ? 'muted' : ''}></video>
      <div class="tv-status"><span class="spin"></span><span class="tv-msg">Connecting to ${esc(ch.name)}…</span></div>
      <div class="tv-ui"><span class="tv-live"><i></i>Live</span><span class="tv-name">${esc(ch.name)}</span><button type="button" class="tv-btn" data-mute aria-label="Toggle sound">${ic(muted ? 'volx' : 'vol')}</button><button type="button" class="tv-btn" data-fs aria-label="Full screen">${ic('expand')}</button></div>`;
    const video = $('video', box); video.muted = muted;
    // the relay streams through our server (bandwidth we pay for), so it is offered to members and admin only
    const lt = liveTok(); const relayed = ch.sources.some(x => x.relay);
    const srcs = ch.sources.filter(x => !x.relay || lt).map(x => (x.relay ? relayBase() + encodeURIComponent(x.url) + '&a=' + encodeURIComponent(lt) : x.url));
    let i = 0, hls = null, timer = null, dead = false;
    const status = (msg, cls = '') => { const st = $('.tv-status', box); if (!st) return; st.className = 'tv-status ' + cls; st.hidden = !msg; if (msg) $('.tv-msg', st).textContent = msg; const sp = $('.spin', st); if (sp) sp.hidden = cls === 'err'; };
    if (!srcs.length) { status(`${ch.name} plays through our relay, which is for members. Sign in with your PIN to watch.`, 'err'); box.classList.add('off'); return; }
    const syncMute = () => { const b = $('[data-mute]', box); if (b) b.innerHTML = ic(video.muted ? 'volx' : 'vol'); };
    const fail = () => {
      if (dead) return; clearTimeout(timer); i++;
      if (i < srcs.length) { start(); return; }
      status(relayed && !lt ? `${ch.name} did not answer directly. Members can watch it through our relay: sign in with your PIN.` : `${ch.name} is not broadcasting right now, or its stream address has changed.`, 'err');
      box.classList.add('off');
    };
    const tryPlay = () => video.play().catch(() => { if (!video.muted) { video.muted = true; syncMute(); video.play().catch(() => {}); } });
    async function start() {
      if (dead) return;
      status(i ? 'Trying the backup route…' : `Connecting to ${ch.name}…`);
      if (hls) { hls.destroy(); hls = null; }
      clearTimeout(timer); timer = setTimeout(fail, 15000);
      const src = srcs[i];
      let Hls = null; try { Hls = await loadHls(); } catch (e) { Hls = null; }
      if (dead) return;
      if (Hls && Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 20, liveSyncDurationCount: 3, manifestLoadingTimeOut: 10000, levelLoadingTimeOut: 10000, fragLoadingTimeOut: 15000, capLevelToPlayerSize: true });
        hls.on(Hls.Events.ERROR, (_, d) => { if (!d.fatal) return; if (d.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; } fail(); });
        hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        hls.loadSource(src); hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src; video.onerror = fail; tryPlay();
      } else { status('This browser cannot play live streams.', 'err'); }
    }
    video.addEventListener('playing', () => { clearTimeout(timer); status(''); box.classList.remove('off'); });
    video.addEventListener('waiting', () => status('Buffering…'));
    box.onclick = (e) => {
      if (e.target.closest('[data-mute]')) { video.muted = !video.muted; if (!video.muted) tryPlay(); syncMute(); return; }
      if (e.target.closest('[data-fs]')) { const el = box; (el.requestFullscreen || el.webkitRequestFullscreen || (() => video.webkitEnterFullscreen && video.webkitEnterFullscreen())).call(el); return; }
    };
    box._player = { destroy() { dead = true; clearTimeout(timer); if (hls) hls.destroy(); try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {} } };
    start();
  }
  const tvPoster = (s) => `<div class="tv-poster" data-play="1"><span class="play">${ic('play')}</span><b>${esc(s.name)}</b><span>${canEmbed ? esc(s.where || 'Live') : 'Live TV plays on the live terminal'}</span>${canEmbed ? '' : `<a href="${LIVE_SITE}" target="_blank" rel="noopener">Open the live terminal</a>`}</div>`;
  function drawTv() {
    const t = state.tv; const s = tvCur(); if (!s) { $('#tv-frame').innerHTML = emptyState('No channels configured', 'tv'); return; }
    const opts = (sel) => { const groups = {}; t.streams.forEach(x => (groups[x.group] ||= []).push(x)); sel.innerHTML = Object.entries(groups).map(([g, arr]) => `<optgroup label="${esc(g)}">${arr.map(x => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${esc(x.name)}${x.where ? ' · ' + esc(x.where) : ''}</option>`).join('')}</optgroup>`).join(''); };
    opts($('#tv-select')); opts($('#tv-modal-select'));
    const modalOpen = !$('#tv-modal').hidden; const frame = $('#tv-frame');
    if (t.playing && canEmbed && !modalOpen && !document.hidden) playChannel(frame, s, { muted: true }); else { stopPlayer(frame); frame.innerHTML = tvPoster(s); }
    if (modalOpen) { const mf = $('#tv-modal-frame'); if (canEmbed) playChannel(mf, s, { muted: false }); else mf.innerHTML = tvPoster(s); }
    const links = $('#tv-links'); if (links) links.innerHTML = (t.links || []).length ? `Also: ${t.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join(' · ')}` : '';
  }
  function openTvModal() { const s = tvCur(); if (!s) return; stopPlayer($('#tv-frame')); $('#tv-modal').hidden = false; state.tv.playing = true; drawTv(); }
  function closeTvModal() { const m = $('#tv-modal'); if (m.hidden) return; stopPlayer($('#tv-modal-frame')); m.hidden = true; $('#tv-modal-frame').innerHTML = ''; drawTv(); }
  function popOutTv() { const s = tvCur(); if (!s) return; const base = apiBase ? apiBase.replace(/\/$/, '') : (canEmbed ? '' : LIVE_SITE); const w = window.open(`${base}/tv.html?c=${encodeURIComponent(s.id)}`, 'cft-tv', 'popup=yes,width=960,height=600,resizable=yes'); if (!w) { toast('Pop-up blocked by the browser'); return; } state.tv.playing = false; closeTvModal(); drawTv(); }
  async function loadTv() {
    try { const r = await api('/tv/channels'); state.tv.streams = r.channels || []; state.tv.links = r.links || []; if (!tvCur()) state.tv.current = state.tv.streams[0] && state.tv.streams[0].id; drawTv(); }
    catch (e) { $('#tv-frame').innerHTML = emptyState('Channel list unavailable', 'tv'); }
  }
  const pickTv = (id) => { state.tv.current = id; store.set('cft:tv', id); if (!$('#tv-modal').hidden || state.tv.playing) state.tv.playing = true; drawTv(); };
  $('#tv-select').onchange = e => pickTv(e.target.value);
  $('#tv-modal-select').onchange = e => pickTv(e.target.value);
  $('#tv-frame').addEventListener('click', e => { if (e.target.closest('[data-play]') && !e.target.closest('a')) { if (!canEmbed) return; state.tv.playing = true; drawTv(); } });
  $('#tv-modal-frame').addEventListener('click', e => { if (e.target.closest('[data-play]') && !e.target.closest('a') && canEmbed) playChannel($('#tv-modal-frame'), tvCur(), { muted: false }); });
  $('#tv-max').onclick = openTvModal; $('#tv-modal-close').onclick = closeTvModal;
  $('#news-tv').onclick = () => { haptic(); openTvModal(); };
  $('#tv-pop').onclick = popOutTv; $('#tv-modal-pop').onclick = popOutTv;
  // save data: stop streams while the tab is hidden, resume when it is visible again
  document.addEventListener('visibilitychange', () => { if (!state.tv.playing) return; if (document.hidden) { stopPlayer($('#tv-frame')); stopPlayer($('#tv-modal-frame')); } else drawTv(); });

  /* ───────── analysis renderers ───────── */
  const peerMove = (p) => p.move == null ? 'n/a' : p.unit === 'bp' ? `${p.move > 0 ? '+' : ''}${Math.round(p.move)} bp` : fmt.pct(p.move);
  function anomalyPoints(a) { return a.points && a.points.length ? `<ul>${a.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; }
  function anomalyPeers(a) {
    if (!a.cross || !a.cross.peers || !a.cross.peers.length || a.cross.peers.every(p => p.move == null)) return '';
    return `<div><div class="lab">${ic('analytics')}Related markets that day</div><div class="peers">${a.cross.peers.map(p => `<span class="peer" title="One-year correlation ${p.r.toFixed(2)}. ${p.confirmed == null ? 'No print that day.' : p.confirmed ? 'Moved as the correlation implies.' : 'Moved against the usual relationship.'}"><i style="background:${p.confirmed == null ? 'var(--fg-3)' : p.confirmed ? 'var(--up)' : 'var(--down)'}"></i>${p.id} ${peerMove(p)}</span>`).join('')}</div></div>`;
  }
  const watchList = (w) => w && w.length ? `<div><div class="lab">${ic('compass')}What to watch</div><ul>${w.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  function anomalyReading(x) { const a = x.analysis || {}; return `<div class="reading"><p class="hl">${esc(a.headline || '')}</p>${anomalyPoints(a)}${anomalyPeers(a)}${watchList(a.watch)}<p class="foot">${esc(a.note || '')}</p></div>`; }
  function signalReading(sg) { const a = sg.analysis || {}; return `<div class="reading"><p class="hl">${esc(sg.type)} · ${esc(sg.name)}</p><p>${esc(a.meaning || sg.detail)}</p>${a.context ? `<p>${esc(a.context)}</p>` : ''}${a.watch ? `<div><div class="lab">${ic('compass')}What to watch</div><p>${esc(a.watch)}</p></div>` : ''}<p class="foot">${esc(a.note || '')}</p></div>`; }
  const sevIcon = { high: 'alert', elevated: 'alert', info: 'info' };
  function highlightItems(items, max) {
    return (max ? items.slice(0, max) : items).map(h => `<div class="hl-item ${h.severity}"><span class="ico">${ic(h.icon && P[h.icon] ? h.icon : sevIcon[h.severity])}</span><b>${esc(h.title)}</b><p>${esc(h.text)}</p>${h.ids && h.ids.length ? `<div class="ids">${h.ids.filter(id => state.perf.some(q => q.id === id)).map(id => `<button type="button" data-open="${id}">${id}</button>`).join('')}</div>` : ''}</div>`).join('');
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) { e.stopPropagation(); openDrawer(b.dataset.open); } });

  /* ═════════════════════ OVERVIEW ═════════════════════ */
  async function renderOverview() {
    const v = $('#view-overview');
    v.innerHTML = `<div class="grid g-kpi">${'<div class="skeleton" style="height:150px"></div>'.repeat(8)}</div>`;
    const [o, sig, an, fl, hl] = await Promise.all([api('/overview'), api('/risk/inflections').catch(() => null), api('/intel/anomalies').catch(() => null), api('/flows').catch(() => null), api('/risk/highlights').catch(() => null)]);
    setPills(o.regime);
    const Q = Object.fromEntries(state.perf.map(r => [r.id, r]));
    v.innerHTML = `
      <div class="grid g-kpi" id="kpis"></div>
      <div class="grid g-main">
        ${card({ icon: 'layers', title: 'Where capital is concentrated', sub: 'Size of the major asset pools in USD', actions: '<span class="badge reference">reference</span><span class="badge measured">live</span>', body: '<div id="size-strip" class="size-strip"></div><div id="size-legend" class="legend xs muted" style="margin-top:10px"></div><div id="treemap" class="ch-lg ch" style="margin-top:8px"></div>', foot: '<span id="treemap-note"></span>' })}
        ${card({ icon: 'gauge', title: 'Market regime', sub: 'Rules-based read of risk appetite', actions: '<span class="badge estimate">heuristic</span>', body: '<div id="regime-panel" class="stack" style="display:flex;flex-direction:column;gap:14px"></div>', foot: esc(o.regime.method) })}
      </div>
      ${card({ icon: 'grid', title: 'Performance by asset class', sub: 'Return over the selected window. Yields and spreads in basis points', actions: '<span id="perf-window"></span>', body: '<div id="class-perf" class="heat"></div>' })}
      <div class="grid g-3">
        ${card({ icon: 'target', title: 'Unusual moves', sub: 'Beyond 2σ of the one-year distribution. Tap for the reading', actions: '<button class="btn ghost" data-go="intel">All</button>', bodyClass: 'flush', body: '<div id="ov-anom" class="list"></div>' })}
        ${card({ icon: 'compass', title: 'Trend signals', sub: 'Latest inflection points. Tap for the reading', actions: '<button class="btn ghost" data-go="risk">All</button>', bodyClass: 'flush', body: '<div id="ov-signals" class="list" style="max-height:520px;overflow-y:auto"></div>' })}
        ${card({ icon: 'risk', title: 'Key risks', sub: 'What stands out in volatility, drawdowns and stress', actions: '<button class="btn ghost" data-go="risk">All</button>', body: '<div id="ov-risks" class="hl-list" style="grid-template-columns:minmax(0,1fr)"></div>' })}
      </div>
      <div class="grid g-main">
        ${card({ icon: 'bank', title: 'Macro conditions', sub: 'Official FRED series', bodyClass: 'flush', body: '<div class="tbl"><table class="t" id="macro-table"></table></div>', foot: 'End-of-day, weekly or monthly as badged. Rate and spread changes in basis points.' })}
        ${card({ icon: 'droplet', title: 'Liquidity & flows', sub: 'Measured balance changes only', actions: '<button class="btn ghost" data-go="flows">Details</button>', body: '<div id="flows-mini" class="mini"></div>', foot: 'Stablecoin supply is on-chain issuance. Net liquidity = Fed assets − reverse repo − Treasury cash, weekly.' })}
      </div>`;
    $$('[data-go]', v).forEach(b => b.onclick = () => show(b.dataset.go));

    // KPIs
    $('#kpis').innerHTML = ['SPX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'VIX', 'HYOAS'].map(id => { const q = Q[id]; if (!q) return ''; const c1 = isDiff(q) ? q.change : q.pct1d; return `<article class="card kpi" data-id="${id}" tabindex="0"><div class="kpi-top"><span>${esc(q.name.replace(/ \(.*\)/, ''))}</span>${badge(q)}</div><div class="kpi-val"><span data-rt-px="${id}">${fmt.px(q.price)}</span><small>${esc(q.unit)}</small></div><div class="chips"><span><b class="${tone(c1)}" data-rt-pct="${id}">${isDiff(q) ? fmt.bp(c1) : fmt.pct(c1)}</b> 1D</span><span><b class="${tone(q.perf['30D'])}">${fmt.chg(q, q.perf['30D'])}</b> 30D</span><span><b class="${tone(q.perf.YTD)}">${fmt.chg(q, q.perf.YTD)}</b> YTD</span></div>${areaSpark(q.sparkline)}<div class="kpi-foot" data-rt-foot="${id}">${esc(q.source)} · ${fmt.ago(q.asOf)}</div></article>`; }).join('');
    $('#kpis').onclick = e => { const k = e.target.closest('.kpi'); if (k) openDrawer(k.dataset.id); };
    $('#kpis').onkeydown = e => { if (e.key === 'Enter') { const k = e.target.closest('.kpi'); if (k) openDrawer(k.dataset.id); } };

    // Concentration
    const T = tok();
    // Simple, calm palette for the asset-pool view: one flat colour per pool, a deeper shade for the US slice.
    const COL = { EQ_GLOBAL: '#5B8DEF', FI_GLOBAL: '#3BAE96', GOLD_STOCK: '#E9A23B', CRYPTO_TOTAL: '#9A80E8' };
    const KID = { EQ_US: shade(COL.EQ_GLOBAL, -0.22), FI_US: shade(COL.FI_GLOBAL, -0.22) };
    const total = o.sizes.reduce((s, z) => s + (z.usd || 0), 0);
    // softer fills: the palette colour blended toward the card surface as a diagonal gradient, with a hairline in the full colour
    const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    const ink = (hex) => (hex === COL.GOLD_STOCK ? '#2a1a04' : '#ffffff'); // white on every pool except the light amber
    const softCss = (hex) => `background:${hex};color:${ink(hex)}`;
    const softItem = (hex) => ({ itemStyle: { color: hex, borderWidth: 0 }, label: { color: ink(hex) } });
    $('#size-strip').innerHTML = o.sizes.map(z => `<div class="strip-seg ${total && z.usd / total < 0.12 ? 'narrow' : ''}" style="flex:${z.usd || 0};${softCss(COL[z.id])}" title="${esc(z.label)}: ${fmt.usd(z.usd)} (${total ? (z.usd / total * 100).toFixed(1) : '—'}%)"><span>${esc(z.label)}</span><b>${fmt.usd(z.usd)} · ${total ? Math.round(z.usd / total * 100) : '—'}%</b></div>`).join('');
    $('#size-legend').innerHTML = o.sizes.map(z => `<span><i class="dot" style="background:${COL[z.id]};border-radius:3px"></i>${esc(z.label)}</span>`).join('');
    const leaves = [];
    for (const z of o.sizes) { const kids = (z.children || []).filter(c => c.usd > 0 && c.usd / total >= 0.04); if (kids.length) kids.forEach((c) => leaves.push({ name: c.label, value: c.usd, grp: z.label, ref: { ...c, measure: z.measure, source: z.source, asOf: z.asOf, live: z.live }, ...softItem(KID[c.id] || COL[z.id]) })); else leaves.push({ name: z.id === 'GOLD_STOCK' ? 'Gold' : z.id === 'CRYPTO_TOTAL' ? 'Crypto' : z.label, value: z.usd || 0, grp: z.label, ref: z, ...softItem(COL[z.id]) }); }
    chart('#treemap', { tooltip: { formatter: p => { const r = p.data.ref || {}; return `<b>${esc(p.name)}</b><br>${fmt.usd(p.value)} · ${(p.value / total * 100).toFixed(1)}% of total<br><span style="opacity:.7">${esc(String(r.measure || '').replace(/_/g, ' '))}${r.live ? ' · live' : r.source ? ' · ' + esc(r.source) : ''}</span>`; } }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.2, label: { show: true, overflow: 'truncate', fontFamily: T.mono, fontSize: 12, color: '#fff', lineHeight: 17, formatter: p => p.value / total < 0.03 ? '' : `{n|${titleCase(p.name)}}\n{v|${fmt.usd(p.value)}}`, rich: { n: { fontSize: 12 }, v: { fontSize: 15, fontWeight: 600 } } }, levels: [{ itemStyle: { borderColor: T.surface, borderWidth: 0, gapWidth: 4 } }, { itemStyle: { borderColor: 'rgba(255,255,255,.10)', borderWidth: 1, borderRadius: 6 } }], data: leaves }] });
    $('#treemap-note').innerHTML = o.sizes.map(s => `<b>${esc(s.label)}</b> ${esc(s.measure.replace(/_/g, ' '))}, ${s.live ? 'live' : 'reference'} (${esc(s.note || s.source)}${s.asOf ? ', ' + esc(String(s.asOf).slice(0, 10)) : ''})${s.error ? ` <span class="down">${/429/.test(s.error) ? 'source rate-limited, retrying shortly' : 'source unavailable'}</span>` : ''}`).join(' · ') + '. Market cap, debt outstanding and physical stock value are different measures and none of them is a capital flow.';

    // Regime
    const r = o.regime; const pos = ((r.score + 1) / 2 * 100).toFixed(0);
    $('#regime-panel').innerHTML = `<div class="regime-head"><span class="big ${r.score > .3 ? 'up' : r.score < -.3 ? 'down' : 'warn-c'}">${r.label}</span><span class="score">${r.score > 0 ? '+' : ''}${r.score}</span></div><div><div class="gauge"><i style="left:${pos}%"></i></div><div class="gauge-l"><span>Risk-off −1</span><span>0</span><span>+1 Risk-on</span></div></div><div class="comp-list">${r.components.map(c => `<div class="comp"><span class="l">${esc(c.label)}</span><span class="d">${esc(c.detail)}</span><span class="s ${c.score > 0 ? 'up' : c.score < 0 ? 'down' : 'muted'}">${c.score == null ? 'n/a' : (c.score > 0 ? '+' : '') + c.score}</span></div>`).join('')}</div>`;

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
    renderSignalList('#ov-signals', sig ? sig.signals.slice(0, 8) : null, (id) => { state.risk.trendId = id; show('risk'); }, null, true);
    $('#ov-anom').innerHTML = an && an.items.length ? an.items.slice(0, 6).map((x, i) => { const five = Math.abs(x.z5) > Math.abs(x.z1); const mvv = five ? x.move5d : x.move1d; return `<div class="li ${i === 0 ? 'open' : ''}" data-id="${x.id}"><span class="ico ${mvv > 0 ? 'up' : 'down'}">${ic(mvv > 0 ? 'up' : 'down')}</span><span class="ti">${esc(x.name)}<span>${x.id}</span>${an.changes && an.changes.added.includes(x.id) && an.changes.previousScan ? '<em class="an-new">new</em>' : an.changes && an.changes.escalated.includes(x.id) ? '<em class="an-new up">stronger</em>' : ''}</span><span class="de">${five ? '5-day' : '1-day'} ${x.unit === 'bp' ? Math.round(mvv) + ' bp' : fmt.pct(mvv)} · ${Math.abs(five ? x.z5 : x.z1).toFixed(1)}σ · ${x.date.slice(5)}</span><span class="rt"><span class="badge ${x.severity === 'extreme' ? 'bad' : x.severity === 'high' ? 'mid' : ''}">${x.severity}</span>${ic('down', 'chev')}</span><div class="li-x">${anomalyReading(x)}<div class="row-actions" style="margin-top:10px"><button class="btn ghost" data-open="${x.id}">${ic('line')}Chart</button></div></div></div>`; }).join('') : emptyState(an ? 'No moves beyond 2σ in the latest observations.' : 'Anomaly scan unavailable.', 'target');
    $('#ov-anom').onclick = e => { if (e.target.closest('button')) return; const t = e.target.closest('.li'); if (t) t.classList.toggle('open'); };
    $('#ov-risks').innerHTML = hl && hl.items.length ? highlightItems(hl.items, 4) : emptyState(hl ? 'No risk flags right now.' : 'Risk scan unavailable.', 'risk');

    // Macro table
    const macro = ['FEDFUNDS', 'ECBRATE', 'CPI', 'BREAKEVEN10', 'UST2Y', 'UST10Y', 'T10Y2Y', 'IGOAS', 'HYOAS', 'VIX', 'BROADUSD', 'WALCL', 'RRP', 'TGA', 'M2'];
    $('#macro-table').innerHTML = `<thead><tr><th class="stick">Indicator</th><th class="num">Latest</th><th class="num hide-sm">Last chg</th><th class="num">30D</th><th class="num hide-sm">1Y</th><th class="hide-sm">Data</th></tr></thead><tbody>` + macro.map(id => { const q = Q[id]; if (!q) return ''; const pctUnit = String(q.unit).startsWith('%'); const f = (v) => pctUnit ? fmt.bp(v) : fmt.pct(v); return `<tr data-id="${id}"><td class="stick"><div class="inst"><b>${id}</b><span>${esc(q.name)}</span></div></td><td class="num">${fmt.px(q.price)} <span class="muted xs hide-sm">${esc(q.unit)}</span></td><td class="num hide-sm ${tone(q.change)}">${pctUnit ? fmt.bp(q.change) : fmt.pct(q.pct1d)}</td><td class="num ${tone(q.perf['30D'])}">${f(q.perf['30D'])}</td><td class="num hide-sm ${tone(q.perf['1Y'])}">${f(q.perf['1Y'])}</td><td class="hide-sm" title="As of ${fmt.date(q.asOf)}">${badge(q)}<div class="xs muted" style="margin-top:2px">${fmt.date(q.asOf).slice(5)}</div></td></tr>`; }).join('') + '</tbody>';
    $('#macro-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };

    // Liquidity mini
    if (fl) {
      const st = fl.sections.find(x => x.id === 'stablecoins'), nl = fl.sections.find(x => x.id === 'fed_liquidity');
      const items = [...(st ? st.items.map(i => ({ ...i, v: fmt.usd(i.latest), d: (x) => fmt.sbig(x) })) : []), ...(nl ? nl.items.slice(0, 2).map(i => ({ ...i, v: '$' + fmt.big(i.latest * 1e9), d: (x) => fmt.sbig(x * 1e9) })) : [])].filter(i => i.latest != null);
      $('#flows-mini').innerHTML = items.map((i, k) => `<div class="mini-item"><span class="lab">${esc(i.name)}</span><span class="v">${i.v}</span><div class="chips">${['d7', 'd30', 'd90'].filter(w => i[w]).map(w => `<span><b class="${tone(i[w].abs)}">${i.d(i[w].abs)}</b> ${w.slice(1)}D</span>`).join('')}</div><div id="fm-${k}" class="ch-mini"></div></div>`).join('');
      items.forEach((i, k) => chart('#fm-' + k, { grid: { left: 0, right: 0, top: 4, bottom: 2 }, xAxis: { type: 'time', show: false }, yAxis: { type: 'value', scale: true, show: false }, series: [{ type: 'line', showSymbol: false, smooth: .2, data: (i.series || []).slice(-120), lineStyle: { width: 1.6, color: T.c4 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.c4 + '55' }, { offset: 1, color: T.c4 + '00' }] } } }] }));
    } else $('#flows-mini').innerHTML = emptyState('Flow series unavailable.', 'droplet');
  }

  function renderSignalList(sel, signals, onPick, selected, expand) {
    const box = $(sel); if (!box) return;
    if (!signals) { box.innerHTML = emptyState('Signal scan unavailable.', 'compass'); return; }
    if (!signals.length) { box.innerHTML = emptyState('No trend events in the current window.', 'compass'); return; }
    const icon = (s) => /Overbought|Oversold/.test(s.type) ? ['gauge', 'mid'] : [s.dir === 'up' ? 'up' : 'down', s.dir];
    box.innerHTML = signals.map((s, k) => { const [i, c] = icon(s); return `<div class="li ${selected === s.id ? 'sel' : ''}" data-id="${s.id}" data-k="${k}"><span class="ico ${c}">${ic(i)}</span><span class="ti">${esc(s.type)}<span>${s.id}</span></span><span class="de">${esc(s.name)} · ${esc(s.detail)}</span><span class="rt"><span class="muted">${s.date.slice(5)}</span>${expand ? ic('down', 'chev') : ''}</span>${expand ? `<div class="li-x">${signalReading(s)}<div class="row-actions" style="margin-top:10px"><button class="btn ghost" data-trend="${s.id}">${ic('line')}Trend chart</button></div></div>` : ''}</div>`; }).join('');
    box.onclick = e => { const tb = e.target.closest('[data-trend]'); if (tb) { onPick(tb.dataset.trend); return; } if (e.target.closest('button')) return; const t = e.target.closest('.li'); if (!t) return; if (expand) t.classList.toggle('open'); else onPick(t.dataset.id, signals[Number(t.dataset.k)]); };
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
    v.innerHTML = `<div class="callout">${ic('info')}<div>Only measured balance changes count as <b>flows</b> here: stablecoin net issuance and Federal Reserve liquidity. Traded volume and price changes are shown separately and are never read as inflows. Where no licensed data feed exists, the section says so instead of estimating.</div></div><div class="grid g-main" id="flow-grid"></div>
      <div class="flow-sec-h"><h2>${ic('globe')}World bonds</h2><p>Sovereign yields and their deviations, bond-market performance, and cross-border flows into sovereign debt. Indonesia, EM and the markets that move them.</p></div>
      <div id="wb-box">${loading('Loading sovereign yields, TIC holdings and bond ETFs…')}</div>
      <div class="flow-sec-h"><h2>${ic('shield')}Fixed income credit monitor</h2><p>Option-adjusted spreads by market, rating, maturity and sector, a pressure reading for each, and the latest credit headlines.</p></div>
      <div id="cm-box">${loading('Loading credit spreads…')}</div>`;
    renderWorldBonds(); renderCreditMonitor();
    const g = $('#flow-grid'); const sIcon = { stablecoins: 'coins', fed_liquidity: 'bank', crypto_volume: 'pulse', etf_flows: 'layers', exchange_flows: 'swap' };
    const ORDER = ['fed_liquidity', 'stablecoins', 'crypto_volume', 'etf_flows'];
    for (const sec of [...f.sections].sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99))) {
      if (sec.unavailable) { g.insertAdjacentHTML('beforeend', `<div class="flow-strip nc">${ic('layers')}<div><b>${esc(sec.title)}</b> <span class="badge bad">not connected</span><p>${esc(sec.reason)}</p></div></div>`); continue; }
      if (sec.error) { g.insertAdjacentHTML('beforeend', card({ icon: sIcon[sec.id], title: esc(sec.title), body: errorBox(sec.error) })); continue; }
      const id = 'flow-' + sec.id;
      const fmtV = (it) => sec.type === 'volume' ? fmt.usd(it.latest) : it.latest == null ? '—' : sec.id === 'stablecoins' ? fmt.usd(it.latest) : '$' + fmt.big(it.latest * 1e9);
      const fmtD = (x) => sec.id === 'stablecoins' ? fmt.sbig(x) : fmt.sbig(x * 1e9);
      const items = sec.items.map(it => `<div class="mini-item" style="grid-template-columns:1fr"><span class="lab">${esc(it.name)} ${it.stale ? '<span class="badge stale">stale</span>' : ''}</span><span class="v">${fmtV(it)}</span><div class="chips">${sec.type === 'volume' ? `<span>turnover <b>${it.turnover ?? '—'}%</b> of market cap</span><span>${fmt.ago(it.asOf)}</span>` : ['d7', 'd30', 'd90'].filter(k => it[k]).map(k => `<span><b class="${tone(it[k].abs)}">${fmtD(it[k].abs)}</b> ${k.slice(1)}D</span>`).join('')}</div></div>`).join('');
      if (sec.type === 'volume') { g.insertAdjacentHTML('beforeend', `<div class="flow-strip vol">${ic('pulse')}<div class="fs-h"><b>${esc(sec.title.replace(/ \(USD.*?\)| — .*/g, ''))}</b><span class="badge eod">volume</span><p>Turnover, not a capital flow. ${esc(sec.measure)}</p></div><div class="fs-items">${sec.items.map(it => `<div class="fs-it"><span class="lab">${esc(it.name)}</span><b>${fmt.usd(it.latest)}</b><small>${it.turnover ?? '—'}% of market cap · ${fmt.ago(it.asOf)}</small></div>`).join('')}</div></div>`); continue; }
      g.insertAdjacentHTML('beforeend', card({ icon: sIcon[sec.id], title: esc(sec.title.replace(/ \(USD.*?\)| — .*/g, '')), sub: 'USD billions', actions: `<span class="badge measured">${sec.type}</span>`, bodyClass: 'grow', body: `<div class="mini" style="grid-template-columns:repeat(${sec.id === 'stablecoins' ? 2 : 4},minmax(0,1fr))">${items}</div><div id="${id}" class="ch-sm ch flow-ch"></div>`, foot: esc(sec.measure) }));
      if (sec.type !== 'volume') { const S = series(T); chart('#' + id, { grid: { left: 8, right: 12, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt.big(v * 1e9) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: sec.id === 'stablecoins' ? [{ type: 'value', scale: true, ...axis(T) }, { type: 'value', scale: true, ...axis(T), splitLine: { show: false } }] : { type: 'value', scale: true, ...axis(T) }, series: sec.items.filter(it => it.series && it.series.length).slice(0, 2).map((it, i) => ({ name: it.name, type: 'line', showSymbol: false, smooth: 0.15, yAxisIndex: sec.id === 'stablecoins' ? i : 0, data: it.series, lineStyle: { width: 1.6, color: S[i + 1] }, itemStyle: { color: S[i + 1] }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: S[i + 1] + '2a' }, { offset: 1, color: S[i + 1] + '00' }] } } })) }); }
    }
  }

  /* ───────── World bonds (WB) ───────── */
  const bpf = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v} bp`);
  const bpTone = (v) => (v == null ? '' : v > 0 ? 'down' : v < 0 ? 'up' : ''); // for yields and spreads, up is "worse"
  const pctBar = (p, cls = '') => (p == null ? '—' : `<span class="pbar ${cls}" title="${p}th percentile of its own range"><i style="width:${p}%"></i><b>${p}</b></span>`);
  const freqBadge = (f, asOf) => (f === 'daily' ? esc(fmt.date(asOf)) : `${esc(String(asOf).slice(0, 7))} <span class="badge stale" style="padding:0 5px">monthly</span>`);
  const wbState = { tic: 'top', etfWin: 'm3' };
  async function renderWorldBonds() {
    const box = $('#wb-box'); if (!box) return;
    let d; try { d = await api('/bonds/world'); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const T = tok();
    const idn = d.indonesia || {}; const m = idn.manual || {}; const curve = d.curve;
    const tile = (label, value, sub, extra = '') => `<div class="wb-tile"><span class="lab">${label}</span><b>${value}</b><small>${sub}</small>${extra}</div>`;
    const sovRows = d.sovereigns.map(s => s.error ? `<tr><td><b>${esc(s.name)}</b></td><td colspan="5" class="xs down">${esc(s.error.slice(0, 60))}</td></tr>` : `<tr class="${s.id === 'US' ? 'wb-us' : ''}"><td><div class="wb-m"><b>${esc(s.name)}</b>${s.region === 'Global' ? '' : `<span class="wb-tag ${s.region.toLowerCase()}">${esc(s.region)}</span>`}<span class="xs muted" title="${s.freq === 'daily' ? 'Daily close' : 'OECD monthly average'}">${s.freq === 'daily' ? esc(fmt.date(s.asOf)) : esc(String(s.asOf).slice(0, 7)) + ' <i class="wb-mo">M</i>'}</span></div></td><td class="num mono"><b>${s.latest.toFixed(2)}%</b></td><td class="num mono ${bpTone(s.d1m)}">${bpf(s.d1m)}</td><td class="num mono ${bpTone(s.d1y)}">${bpf(s.d1y)}</td><td class="num mono">${s.id === 'US' ? '<span class="muted">base</span>' : bpf(s.vsUS)}</td><td>${pctBar(s.pct2y)}</td></tr>`).join('');
    const idRow = `<tr class="wb-id"><td><div class="wb-m"><b>Indonesia</b><span class="wb-tag em">EM</span><span class="xs muted">${m.y10 != null ? `${esc(m.y10AsOf || '')} <i class="wb-mo">manual</i>` : '<i class="wb-mo bad">not set</i>'}</span></div></td><td class="num mono"><b>${m.y10 != null ? m.y10.toFixed(2) + '%' : '—'}</b></td><td class="num mono muted">—</td><td class="num mono muted">—</td><td class="num mono">${m.y10 != null ? bpf(idn.vsUS) : '—'}</td><td class="xs muted nowrap">${m.y10 != null ? esc(m.source || '') : 'enter in Admin'}</td></tr>`;
    const tic = d.tic && !d.tic.error ? d.tic : null;
    const idRowT = tic && tic.indonesia ? `<tr class="wb-id"><td><b>Indonesia</b> <span class="xs muted">${esc(tic.indonesia.asOf)}</span></td><td class="num mono">${fmt.px(tic.indonesia.latest)}</td><td class="num mono ${tone(tic.indonesia.d1m)}">${tic.indonesia.d1m == null ? '—' : (tic.indonesia.d1m > 0 ? '+' : '') + tic.indonesia.d1m}</td><td class="num mono ${tone(tic.indonesia.d12m)}">${tic.indonesia.d12m == null ? '—' : (tic.indonesia.d12m > 0 ? '+' : '') + tic.indonesia.d12m}</td></tr>` : '';
    const ticRows = (list) => list.map(t => `<tr><td><b>${esc(t.name)}</b></td><td class="num mono">${fmt.px(t.latest)}</td><td class="num mono ${tone(t.d1m)}">${t.d1m == null ? '—' : (t.d1m > 0 ? '+' : '') + t.d1m}</td><td class="num mono ${tone(t.d12m)}">${t.d12m == null ? '—' : (t.d12m > 0 ? '+' : '') + t.d12m}</td></tr>`).join('') + idRowT;
    const etfRows = d.etfs.map(e => e.error ? `<tr><td><b>${e.id}</b> ${esc(e.name)}</td><td colspan="4" class="xs down">${esc(e.error)}</td></tr>` : `<tr><td><div class="wb-m"><b>${e.id}</b><span class="xs muted">${esc(e.name)}</span><span class="wb-tag ${e.group.toLowerCase()}">${esc(e.group)}</span></div></td><td class="num mono ${tone(e.m1)}">${fmt.pct(e.m1)}</td><td class="num mono ${tone(e.m3)}">${fmt.pct(e.m3)}</td><td class="num mono ${tone(e.ytd)}">${fmt.pct(e.ytd)}</td><td class="num mono ${tone(e.y1)}">${fmt.pct(e.y1)}</td></tr>`).join('');
    box.innerHTML = `<div class="wb">
      <div class="wb-tiles">
        ${curve ? tile('US 10Y Treasury', `${curve.y10.toFixed(2)}%`, `2Y ${curve.y2.toFixed(2)} · 30Y ${curve.y30.toFixed(2)} · 2s10s ${bpf(curve.s2s10)} · ${esc(fmt.date(curve.asOf))}`) : ''}
        ${tic && tic.total ? tile('Foreign-held US Treasuries', '$' + fmt.px(tic.total.latest) + ' bn', `${esc(tic.asOf)} · 1M ${(tic.total.d1m > 0 ? '+' : '') + tic.total.d1m} · 12M ${(tic.total.d12m > 0 ? '+' : '') + tic.total.d12m} bn · TIC`) : ''}
        ${tile('Indonesia 10Y', m.y10 != null ? m.y10.toFixed(2) + '%' : '<span class="muted">not set</span>', m.y10 != null ? `${esc(m.y10AsOf || '')} · vs US ${bpf(idn.vsUS)} · ${esc(m.source || 'manual')}` : 'No free source; admin can enter it')}
        ${idn.reserves ? tile('Indonesia FX reserves', '$' + idn.reserves.latest.toFixed(1) + ' bn', `${esc(String(idn.reserves.asOf).slice(0, 7))} · 1M ${(idn.reserves.d1m > 0 ? '+' : '') + idn.reserves.d1m} · 1Y ${idn.reserves.d1y == null ? '—' : (idn.reserves.d1y > 0 ? '+' : '') + idn.reserves.d1y} bn · excl. gold, FRED`) : ''}
        ${tile('Foreign holdings of SBN', m.sbnForeignTn != null ? 'Rp ' + fmt.px(m.sbnForeignTn) + ' tn' : '<span class="muted">not set</span>', m.sbnForeignTn != null ? `${m.sbnForeignPct != null ? m.sbnForeignPct + '% of tradable SBN · ' : ''}${esc(m.sbnAsOf || '')} · ${esc(m.source || 'DJPPR')}` : 'DJPPR publishes it as PDF; admin can enter it')}
        ${idn.overnightRate ? tile('Indonesia overnight rate', idn.overnightRate.latest.toFixed(2) + '%', `${esc(String(idn.overnightRate.asOf).slice(0, 7))} · 1Y ${bpf(idn.overnightRate.d1y)} · interbank, monthly avg`) : ''}
      </div>
      <div class="grid g-main wb-grid">
        ${card({ icon: 'line', title: 'Sovereign 10-year yields and deviations', sub: 'Level, change, spread versus the US, and where each sits in its own two-year range', bodyClass: 'flush', body: `<div class="tbl"><table class="t wb-t"><thead><tr><th>Market</th><th class="num">10Y</th><th class="num">1M</th><th class="num">1Y</th><th class="num">vs US</th><th>2Y range</th></tr></thead><tbody>${sovRows}${idRow}</tbody></table></div>`, foot: 'US daily (FRED); others OECD monthly averages (M). Range: percentile of the level within its own last two years. vs US in bp.' })}
        ${card({ icon: 'swap', title: 'Cross-border flows into US Treasuries', sub: 'Foreign holdings by country, USD bn · US Treasury TIC', actions: '<span id="wb-tic-seg"></span>', bodyClass: 'flush', body: tic ? `<div class="tbl"><table class="t wb-t"><thead><tr><th>Holder</th><th class="num">${esc(tic.asOf)}</th><th class="num">1M</th><th class="num">12M</th></tr></thead><tbody id="wb-tic-rows">${ticRows(tic.top)}</tbody></table></div>` : errorBox((d.tic && d.tic.error) || 'TIC data unavailable'), foot: `TIC Table 5, monthly, ~6-week lag; changes include valuation effects. Indonesia from the TIC history file (lags further).${d.foreignHeldUS ? ` All foreign investors: $${d.foreignHeldUS.latest} tn (${esc(String(d.foreignHeldUS.asOf).slice(0, 7))}, FRED).` : ''}` })}
      </div>
      ${card({ icon: 'analytics', title: 'National bond-market performance', sub: 'ETF proxies, price return · 3-month path rebased to 100', body: `<div class="grid g-main wb-perf"><div class="tbl"><table class="t wb-t"><thead><tr><th>Fund</th><th class="num">1M</th><th class="num">3M</th><th class="num">YTD</th><th class="num">1Y</th></tr></thead><tbody>${etfRows}</tbody></table></div><div id="wb-etf-chart" class="ch"></div></div>`, foot: 'ETF closes as proxies (price only, Yahoo, 15-min delayed). No free source covers Indonesian government bonds directly; EMLC holds about 10% Indonesia.' })}
    </div>`;
    if (tic) mount('#wb-tic-seg', seg([['top', 'Top holders'], ['asia', 'Asia & Indonesia']], wbState.tic, (v) => { wbState.tic = v; $('#wb-tic-rows').innerHTML = ticRows(v === 'asia' ? tic.asia : tic.top); }, ''));
    const S = series(T);
    const ok = d.etfs.filter(e => !e.error && e.spark && e.spark.length);
    chart('#wb-etf-chart', { grid: { left: 8, right: 44, top: 30, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: T.fg2, fontSize: 11 * fs() } }, tooltip: { trigger: 'axis', valueFormatter: v => v.toFixed(1) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', scale: true, ...axis(T), axisLabel: { color: T.fg3, fontSize: 10.5 * fs(), formatter: v => v.toFixed(0) } }, series: ok.map((e, i) => ({ name: e.id, type: 'line', showSymbol: false, smooth: 0.2, data: e.spark, lineStyle: { width: e.group === 'EM' ? 2 : 1.4, color: S[i % S.length] }, itemStyle: { color: S[i % S.length] }, emphasis: { focus: 'series' }, endLabel: { show: true, formatter: '{a}', color: S[i % S.length], fontSize: 10 * fs(), fontFamily: T.mono, distance: 4 }, labelLayout: { moveOverlap: 'shiftY' } })) });
  }

  /* ───────── Fixed income credit monitor (FICM) ───────── */
  const cmState = { group: 'US' };
  const pLevel = (p) => (!p ? '' : `<span class="pp ${p.level}" title="${esc(p.notes.join('; ') || 'pressure score ' + p.score)}"><b>${p.score}</b>${p.level}</span>`);
  async function renderCreditMonitor() {
    const box = $('#cm-box'); if (!box) return;
    let d, news; try { [d, news] = await Promise.all([api('/credit/monitor'), api('/credit/news').catch(() => null)]); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const rows = d.rows.filter(r => !r.error); const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    const groups = [['US', 'US'], ['EM', 'Emerging markets'], ['Europe', 'Europe']];
    const kinds = { headline: 'Headline', rating: 'By rating', maturity: 'By maturity', region: 'By region', sector: 'By issuer type' };
    const rangeBar = (r) => { const lo = r.lo1y, hi = r.hi1y, v = r.latest; const p = hi > lo ? Math.round((v - lo) / (hi - lo) * 100) : 50; return `<span class="rng" title="1-year range ${Math.round(lo * 100)}–${Math.round(hi * 100)} bp"><i style="left:${Math.max(0, Math.min(100, p))}%"></i></span>`; };
    const row = (r) => `<tr title="1W ${bpf(r.d1w)} · ${r.pct3y == null ? '' : r.pct3y + 'th percentile of 3 years'} · 1Y range ${Math.round(r.lo1y * 100)}–${Math.round(r.hi1y * 100)} bp"><td><b>${esc(r.name)}</b></td><td class="num mono"><b>${r.latestBp}</b></td><td class="num mono ${bpTone(r.d1d)}">${bpf(r.d1d)}</td><td class="num mono ${bpTone(r.d1m)}">${bpf(r.d1m)}</td><td class="num mono ${bpTone(r.ytd)} hide-sm">${bpf(r.ytd)}</td><td>${rangeBar(r)}</td><td>${pLevel(r.pressure)}</td></tr>`;
    const table = (g) => { const list = rows.filter(r => r.group === g); const order = ['headline', 'region', 'sector', 'rating', 'maturity']; return order.filter(k => list.some(r => r.kind === k)).map(k => `<tr class="cm-grp"><td colspan="7">${kinds[k]}</td></tr>` + list.filter(r => r.kind === k).map(row).join('')).join(''); };
    const gauge = (g) => `<div class="cm-g" title="${esc(g.why)}"><span>${esc(g.label)}</span><b>${g.value == null ? '—' : g.unit === '×' ? g.value.toFixed(2) + '×' : (g.value > 0 ? '+' : '') + g.value + ' bp'}</b></div>`;
    const etfRows = d.etfs.map(e => e.error ? '' : `<tr><td><div class="wb-m"><b>${e.id}</b><span class="xs muted">${esc(e.name)}</span></div></td><td class="num mono ${tone(e.m1)}">${fmt.pct(e.m1)}</td><td class="num mono ${tone(e.m3)}">${fmt.pct(e.m3)}</td><td class="num mono ${tone(e.y1)}">${fmt.pct(e.y1)}</td></tr>`).join('');
    const newsRows = news && news.items.length ? news.items.slice(0, 12).map(n => `<a class="cm-n" href="${esc(n.url)}" target="_blank" rel="noopener"><span class="cm-nt">${esc(n.title)}</span><span class="cm-nm"><span class="chip-mkt ${n.market.toLowerCase()}">${esc(n.market)}</span>${n.tone ? `<span class="chip-tone ${n.tone}">${n.tone}</span>` : ''}<span class="xs muted">${esc(n.source)} · ${fmt.ago(n.publishedAt)}</span></span></a>`).join('') : `<p class="dim sm">No credit headlines in the last day.</p>`;
    const ov = d.overall;
    box.innerHTML = `<div class="cm">
      <div class="cm-top">
        <div class="cm-overall ${ov ? ov.level : ''}"><div class="cm-ov-l"><span class="lab">Credit pressure</span><div class="cm-ov-v"><b>${ov ? ov.score : '—'}</b><span>${ov ? ov.level : ''}</span></div><span class="meter"><i style="width:${ov ? ov.score : 0}%"></i></span><small>Average of the seven segments on the right · 0 calm → 100 stressed</small></div><div class="cm-ov-c">${['US_IG', 'US_HY', 'EM_ALL', 'EM_IG', 'EM_HY', 'EM_ASIA', 'EU_HY'].map(id => byId[id]).filter(r => r && r.pressure).map(r => `<div class="cm-ov-i"><span>${esc(r.name)}</span>${pLevel(r.pressure)}</div>`).join('')}</div></div>
        <div class="cm-gauges">${d.gauges.map(gauge).join('')}</div>
      </div>
      <div class="cm-ra"><div class="cm-ra-h"><b>${ic('flag')}Indonesia and EM read-across</b><span class="xs muted">No free Indonesia spread index; EM Asia and EM public-sector issuers include Indonesian sovereign and quasi-sovereign USD bonds.</span></div><div class="cm-ra-tiles">${['EM_ASIA', 'EM_PUB', 'EM_IG', 'EM_HY'].map(id => byId[id]).filter(Boolean).map(r => `<div class="cm-ra-t"><span class="lab">${esc(r.name)}</span><div class="cm-ra-v"><b>${r.latestBp}</b><span class="xs muted">bp · 1M <span class="${bpTone(r.d1m)}">${bpf(r.d1m)}</span></span></div>${pLevel(r.pressure)}</div>`).join('')}</div></div>
      <div class="grid g-main cm-grid">
        ${card({ icon: 'grid', title: 'Spreads and pressure', sub: 'Option-adjusted spread in bp, changes, 1-year range and pressure reading', actions: '<span id="cm-seg"></span>', bodyClass: 'flush', body: `<div class="tbl"><table class="t cm-t"><thead><tr><th>Segment</th><th class="num">OAS bp</th><th class="num">1D</th><th class="num">1M</th><th class="num hide-sm">YTD</th><th>1Y range</th><th>Pressure</th></tr></thead><tbody id="cm-rows">${table(cmState.group)}</tbody></table></div>`, foot: 'ICE BofA option-adjusted spreads via FRED, daily. Pressure 0–100: where the spread sits in its 3-year range plus how fast it widened over the week and month; a rules-based reading, not a forecast. Industry sectors need a licensed feed.' })}
        <div class="cm-side">
          ${card({ icon: 'layers', title: 'Credit ETFs', sub: 'Price return', bodyClass: 'flush', body: `<div class="tbl"><table class="t"><thead><tr><th>Fund</th><th class="num">1M</th><th class="num">3M</th><th class="num">1Y</th></tr></thead><tbody>${etfRows}</tbody></table></div>` })}
          ${card({ icon: 'news', title: 'Credit and bond headlines', sub: 'Global, EM and Indonesia', cls: 'cm-news-card', bodyClass: 'cm-news-b', body: `<div class="cm-news">${newsRows}</div>` })}
        </div>
      </div>
    </div>`;
    mount('#cm-seg', seg(groups, cmState.group, (v) => { cmState.group = v; $('#cm-rows').innerHTML = table(v); }, ''));
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
        ${card({ icon: 'line', title: 'Relative performance', sub: 'Rebased to 100 at the start of the window', actions: `${pickerBtn('rel-pick', a.relIds.length)}<span id="rel-win"></span>`, bodyClass: 'grow', body: '<div id="rel-chart" class="ch-lg ch"></div>', foot: 'Yields and spreads are plotted in their own units on the right axis. Crypto history covers 365 days unless a CoinGecko key is set.' })}
        ${card({ icon: 'pulse', title: 'Rolling correlation', sub: '30-observation window', actions: '<span id="roll-win"></span>', bodyClass: 'grow', body: `<div class="roll-ctl"><select id="roll-a" aria-label="First instrument">${assetOpts(a.rollA, x => x.cls !== 'macro' || x.id === 'VIX')}</select><span class="roll-vs">vs</span><select id="roll-b" aria-label="Second instrument">${assetOpts(a.rollB, x => x.cls !== 'macro' || x.id === 'VIX')}</select></div><div id="roll-chart" class="ch-lg ch"></div>`, foot: 'Sustained moves toward ±1, or a change of sign, often line up with regime shifts, for example stocks and bonds falling together in inflationary periods.' })}
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
        chart(n, { grid: { left: 8, right: 30, top: 6, bottom: 22, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const x = rows[ps[0].dataIndex]; return `<b>${esc(x.name)}</b><br>30 days: ${x.r30.toFixed(2)} (n ${x.n30})<br>1 year: ${x.r1y == null ? '—' : x.r1y.toFixed(2)} (n ${x.n1y})<br><span style="opacity:.7">shift ${(x.r30 - (x.r1y ?? 0) > 0 ? '+' : '')}${(x.r30 - (x.r1y ?? 0)).toFixed(2)}</span>`; } }, xAxis: { type: 'value', min: col === 'up' ? 0 : -1.2, max: col === 'up' ? 1.2 : 0, interval: 0.2, ...axis(T, { axisLabel: { color: T.fg3, fontSize: 10.5, formatter: v => Math.abs(v) > 1.0001 ? '' : (Math.round(v * 10) / 10).toString() } }) }, yAxis: { type: 'category', inverse: true, data: rows.map(x => x.id), ...axis(T, { splitLine: { show: false } }), axisLabel: { color: T.fg, fontSize: 11.5, fontFamily: T.mono } }, series: [{ name: '30 days', type: 'bar', barWidth: 12, data: rows.map(x => ({ value: x.r30, itemStyle: { color: col === 'up' ? T.c4 : T.c1, borderRadius: col === 'up' ? [0, 4, 4, 0] : [4, 0, 0, 4] } })), label: { show: true, position: col === 'up' ? 'right' : 'left', color: T.fg2, fontSize: 10.5, formatter: p => p.value.toFixed(2) } }, { name: '1 year', type: 'scatter', symbol: 'diamond', symbolSize: 10, data: rows.map(x => x.r1y), itemStyle: { color: T.fg, borderColor: T.surface, borderWidth: 1.5 }, z: 5 }] });
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
      chart(node, { grid: { left: 8, right: 8, top: 8, bottom: 52, containLabel: true }, tooltip: { formatter: p => `${c.ids[p.value[1]]} × ${c.ids[p.value[0]]}<br>ρ = <b>${p.value[2] == null ? 'n/a' : p.value[2].toFixed(2)}</b> · n = ${c.samples[p.value[1]][p.value[0]]}` }, xAxis: { type: 'category', data: c.ids, ...axis(T, { splitLine: { show: false } }), axisLabel: { rotate: n > 8 ? 55 : 0, fontSize: 10.5, color: T.fg2, interval: 0 } }, yAxis: { type: 'category', data: c.ids, inverse: true, ...axis(T, { splitLine: { show: false } }), axisLabel: { fontSize: 10.5, color: T.fg2, interval: 0 } }, visualMap: { min: -1, max: 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 160, text: ['+1', '−1'], textStyle: { color: T.fg3, fontSize: 10 }, inRange: { color: [T.c1, T.surface2, T.c4] } }, series: [{ type: 'heatmap', data, label: { show: showLbl, fontSize: 10, fontFamily: T.mono, color: T.fg, formatter: p => p.value[2] == null ? '' : p.value[2].toFixed(2) }, itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: T.fg } } }] });
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
      chart('#roll-chart', { grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : v.toFixed(2) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', min: -1, max: 1, ...axis(T), splitLine: { lineStyle: { color: T.line, type: 'dashed' } } }, series: [{ type: 'line', showSymbol: false, data: r.points.filter(p => p[1] != null), lineStyle: { width: 1.7, color: T.fg2 }, itemStyle: { color: T.fg2 }, areaStyle: { origin: 0, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.c4 + '66' }, { offset: .5, color: T.c4 + '08' }, { offset: .5, color: T.c1 + '08' }, { offset: 1, color: T.c1 + '66' }] } } }] });
    });
  }

  /* ═════════════════════ RISK & SIGNALS ═════════════════════ */
  async function renderRisk() {
    const v = $('#view-risk'); const R = state.risk;
    v.innerHTML = `
      ${card({ icon: 'alert', title: 'Risk highlights', sub: 'What stands out today, in plain language', actions: '<span class="badge estimate">rules-based reading</span>', body: '<div id="risk-hl" class="hl-list"></div>', foot: '<span id="risk-hl-note"></span>' })}
      <div class="grid g-main">
        ${card({ icon: 'flame', title: 'Market stress index', sub: '0 = calmest in three years · 100 = most stressed', actions: '<span id="stress-level"></span>', body: '<div id="stress-chart" class="ch-lg ch"></div>', foot: '<span id="stress-method"></span>' })}
        ${card({ icon: 'gauge', title: 'What is driving stress', sub: 'Each input ranked against its own last three years', body: '<div id="stress-comp" class="comp-list"></div>' })}
      </div>
      <div class="grid g-2">
        ${card({ icon: 'scatter', title: 'Risk map', sub: 'Volatility percentile vs drawdown from the one-year high. Bubble size = expected shortfall', body: '<div id="risk-map" class="ch-lg ch"></div>', foot: 'Upper-right is calm and near highs; lower-right is volatile and well off highs. Yields and spreads are excluded because a drawdown is not meaningful for them.' })}
        ${card({ icon: 'compass', title: 'Inflection points', sub: 'Recent trend events. Select one to chart it', actions: '<span id="sig-dir"></span>', bodyClass: 'flush', body: '<div id="sig-list" class="list" style="max-height:470px;overflow-y:auto"></div>', foot: '<span id="sig-method"></span>' })}
      </div>
      ${card({ icon: 'line', title: 'Trend view', sub: 'Price with 50- and 200-day averages; crosses marked', actions: `<select id="trend-id" aria-label="Instrument">${assetOpts(R.trendId, x => x.cls !== 'macro' || x.id === 'VIX')}</select><span id="trend-win"></span>`, body: '<div class="grid g-main" style="gap:20px;align-items:start"><div id="trend-chart" class="ch-lg ch"></div><div id="trend-reading"></div></div>' })}
      ${card({ icon: 'risk', title: 'Risk table', sub: 'Volatility regime, tail risk and drawdowns by instrument', actions: `<button class="btn ghost" id="risk-csv">${ic('download')}<span class="hide-sm">Export</span></button>`, bodyClass: 'flush', body: '<div class="tbl scroll-y"><table class="t" id="risk-table"></table></div>', foot: '<span id="risk-method"></span>' })}`;
    mount('#trend-win', seg(['1Y', '5Y', '10Y'], R.trendWindow, w => { R.trendWindow = w; drawTrend(); }));
    $('#trend-id').onchange = e => { R.trendId = e.target.value; R.sigPick = null; drawTrend(); highlightSig(); };
    const T = tok();

    const [stress, tbl, sig, hl] = await Promise.all([api('/risk/stress').catch(e => ({ error: e.message })), api('/risk/table').catch(e => ({ error: e.message })), api('/risk/inflections').catch(e => ({ error: e.message })), api('/risk/highlights').catch(e => ({ error: e.message }))]);
    state.risk.sig = sig.error ? [] : sig.signals; state.risk.rows = tbl.error ? [] : tbl.rows;
    if (hl.error) $('#risk-hl').innerHTML = errorBox(hl.error); else { $('#risk-hl').innerHTML = hl.items.length ? highlightItems(hl.items) : emptyState('No risk flags right now.', 'risk'); $('#risk-hl-note').textContent = hl.note; }

    // Stress
    if (stress.error) $('#stress-chart').innerHTML = errorBox(stress.error); else {
      setPills(null, stress);
      $('#stress-level').innerHTML = `<span class="badge ${stress.latest >= 75 ? 'bad' : stress.latest >= 55 ? 'mid' : 'measured'}">${Math.round(stress.latest)} · ${esc(stress.level)}</span>`;
      const band = (a, b, col) => [{ yAxis: a, itemStyle: { color: col } }, { yAxis: b }];
      chart('#stress-chart', { grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : Math.round(v) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', min: 0, max: 100, interval: 25, ...axis(T) }, series: [{ type: 'line', showSymbol: false, data: stress.series, smooth: .15, lineStyle: { width: 2, color: series(T)[0] }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.c1 + '55' }, { offset: 1, color: T.c1 + '00' }] } }, markArea: { silent: true, data: [band(75, 100, T.down + '14', 'High'), band(55, 75, T.warn + '12', 'Elevated'), band(35, 55, 'rgba(127,127,127,.04)', 'Normal'), band(0, 35, T.up + '10', 'Low')] }, markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: series(T)[0], borderColor: T.surface, borderWidth: 2 }, label: { show: false }, data: stress.series.length ? [{ coord: stress.series[stress.series.length - 1] }] : [] } }] });
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
        const cols = [['id', 'Instrument', '', 'stick'], ['vol30', 'Vol 30D', 'num', ''], ['volPct', 'Vol pctile', '', ''], ['volRatio', '30D/1Y', 'num', 'hide-sm'], ['var95', 'VaR 95%', 'num', ''], ['cvar95', 'ES 95%', 'num', 'hide-sm'], ['ddFromHigh', 'From high', 'num', ''], ['maxDD1y', 'Max DD 1Y', 'num', 'hide-sm'], ['vs200', 'vs 200D', 'num', 'hide-sm'], ['rangePos', '52-week', '', 'hide-sm'], ['reading', 'Reading', '', 'hide-sm']];
        const rows = tbl.rows.filter(r => !r.unavailable).slice().sort((x, y) => { const k = R.sortKey; const p = x[k], q = y[k]; if (p == null) return 1; if (q == null) return -1; const c = typeof p === 'string' ? p.localeCompare(q) : p - q; return R.sortAsc ? c : -c; });
        $('#risk-table').innerHTML = `<thead><tr>${cols.map(([k, l, n, x]) => `<th class="${n} ${x} sortable ${R.sortKey === k ? 'sorted' + (R.sortAsc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>` + rows.map(r => { const u = r.unit === 'bp' ? ' bp' : '%'; const vp = r.volPct == null ? null : Math.round(r.volPct * 100); const vcol = vp == null ? 'var(--fg-3)' : vp >= 80 ? 'var(--down)' : vp >= 60 ? 'var(--warn)' : 'var(--up)'; return `<tr data-id="${r.id}"><td class="stick"><div class="inst"><b>${r.id}</b><span>${esc(r.name)}</span></div></td><td class="num">${r.vol30 == null ? '—' : r.vol30.toFixed(1) + u}</td><td><div style="display:flex;align-items:center;gap:8px;min-width:110px"><span class="meter" style="flex:1"><i style="width:${vp ?? 0}%;background:${vcol}"></i></span><span class="mono xs" style="width:24px;text-align:right">${vp ?? '—'}</span></div></td><td class="num hide-sm ${r.volRatio > 1.3 ? 'down' : r.volRatio < .8 ? 'up' : ''}">${r.volRatio == null ? '—' : r.volRatio.toFixed(2) + '×'}</td><td class="num"><span class="hcell" style="background:${heat(r.unit === 'bp' ? null : r.var95, 6)}">${r.var95 == null ? '—' : r.var95.toFixed(2) + u}</span></td><td class="num hide-sm">${r.cvar95 == null ? '—' : r.cvar95.toFixed(2) + u}</td><td class="num"><span class="hcell" style="background:${heat(r.ddFromHigh, 25)}">${r.ddFromHigh == null ? '—' : r.ddFromHigh.toFixed(1) + '%'}</span></td><td class="num hide-sm down">${r.maxDD1y == null ? '—' : r.maxDD1y.toFixed(1) + '%'}</td><td class="num hide-sm ${tone(r.vs200)}">${r.vs200 == null ? '—' : (r.vs200 > 0 ? '+' : '') + (r.unit === 'bp' ? Math.round(r.vs200) + ' bp' : r.vs200.toFixed(1) + '%')}</td><td class="hide-sm">${r.rangePos == null ? '—' : `<span class="rangebar"><i style="left:${Math.round(r.rangePos * 100)}%"></i></span>`}</td><td class="hide-sm reading-cell ${/extreme|Bear|fast/.test(r.reading || '') ? 'down' : r.reading === 'No risk flags' ? 'muted' : ''}">${esc(r.reading || '')}</td></tr>`; }).join('') + '</tbody>';
      };
      drawTable();
      $('#risk-table').onclick = e => { const th = e.target.closest('th.sortable'); if (th) { if (R.sortKey === th.dataset.k) R.sortAsc = !R.sortAsc; else { R.sortKey = th.dataset.k; R.sortAsc = ['id', 'var95', 'cvar95', 'ddFromHigh', 'maxDD1y'].includes(th.dataset.k); } drawTable(); return; } const tr = e.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id); };
      $('#risk-method').textContent = tbl.method;
      $('#risk-csv').onclick = () => csvDownload(`risk-${new Date().toISOString().slice(0, 10)}.csv`, tbl.rows.filter(r => !r.unavailable).map(({ id, name, cls, unit, vol30, vol1y, volPct, volRatio, var95, cvar95, ddFromHigh, maxDD1y, vs200, rangePos, asOf, source }) => ({ id, name, class: cls, unit, vol30, vol1y, volPct, volRatio, var95, cvar95, ddFromHigh, maxDD1y, vs200, rangePos, asOf, source })));
    }

    // Signals
    const drawSigs = () => { if (sig.error) { $('#sig-list').innerHTML = errorBox(sig.error); return; } const list = sig.signals.filter(s => R.dir === 'all' || (R.dir === 'rsi' ? /Overbought|Oversold/.test(s.type) : s.dir === R.dir && !/Overbought|Oversold/.test(s.type))); renderSignalList('#sig-list', list, (id, sg) => { R.trendId = id; R.sigPick = sg || null; $('#trend-id').value = id; drawTrend(); highlightSig(); $('#trend-chart').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, R.trendId); };
    mount('#sig-dir', seg([['all', 'All'], ['up', 'Bullish'], ['down', 'Bearish'], ['rsi', 'Stretched']], R.dir, d => { R.dir = d; drawSigs(); }, ''));
    drawSigs(); if (!sig.error) $('#sig-method').textContent = sig.method;
    drawTrend();
  }
  function highlightSig() { $$('#sig-list .li').forEach(x => x.classList.toggle('sel', x.dataset.id === state.risk.trendId)); }
  function drawTrendReading() {
    const R = state.risk; const box = $('#trend-reading'); if (!box) return;
    const sigs = (R.sig || []).filter(x => x.id === R.trendId);
    const pick = R.sigPick && R.sigPick.id === R.trendId ? R.sigPick : sigs[0];
    const row = (R.rows || []).find(x => x.id === R.trendId);
    box.innerHTML = `${pick ? signalReading(pick) : `<div class="reading"><p class="hl">${esc((state.universe.assets.find(a => a.id === R.trendId) || {}).name || R.trendId)}</p><p>No trend events in the current window. Select a signal from the list above to see its reading.</p></div>`}${sigs.length > 1 ? `<div class="reading" style="margin-top:12px"><div class="lab">${ic('compass')}Other recent events</div><ul>${sigs.filter(x => x !== pick).map(x => `<li>${esc(x.type)} (${x.date})</li>`).join('')}</ul></div>` : ''}${row ? `<div class="reading" style="margin-top:12px"><div class="lab">${ic('risk')}Risk profile</div><p>${esc(row.reading)}. 30-day volatility ${row.vol30 == null ? '—' : row.vol30.toFixed(1) + (row.unit === 'bp' ? ' bp' : '%')}${row.volPct != null ? ` (${ord(row.volPct * 100)} percentile of five years)` : ''}${row.var95 != null && row.unit !== 'bp' ? `; a 1-in-20 bad day has meant about ${Math.abs(row.var95).toFixed(1)}%` : ''}.</p></div>` : ''}`;
  }
  function drawTrend() {
    drawTrendReading();
    return guard('#trend-chart', async () => {
      const R = state.risk; const t = await api(`/risk/trend?id=${R.trendId}&window=${R.trendWindow}`); const T = tok();
      chart('#trend-chart', { grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true }, legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 4, textStyle: { color: T.fg2, fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt.px(v) }, xAxis: { type: 'time', ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', scale: true, ...axis(T) }, dataZoom: [{ type: 'inside' }], series: [
        { name: `${t.name}`, type: 'line', showSymbol: false, data: t.price, lineStyle: { width: 1.7, color: T.fg }, itemStyle: { color: T.fg }, markPoint: { symbol: 'pin', symbolSize: 34, label: { fontSize: 10, fontWeight: 600, formatter: p => p.data.dir === 'up' ? 'G' : 'D', color: '#fff' }, data: t.events.map(e => ({ coord: [e.date, e.value], dir: e.dir, name: e.type, itemStyle: { color: e.dir === 'up' ? T.up : T.down } })) } },
        { name: '50-day', type: 'line', showSymbol: false, data: t.ma50, lineStyle: { width: 1.4, color: series(T)[0] }, itemStyle: { color: series(T)[0] } },
        { name: '200-day', type: 'line', showSymbol: false, data: t.ma200, lineStyle: { width: 1.4, color: series(T)[2], type: 'dashed' }, itemStyle: { color: series(T)[2] } },
      ] });
    });
  }

  /* ═════════════════════ INTELLIGENCE ═════════════════════ */
  async function renderIntel() {
    const v = $('#view-intel'); v.innerHTML = loading('Scanning for anomalies and pattern resemblance…');
    const [an, pat, pre, rec] = await Promise.all([api('/intel/anomalies'), api('/intel/patterns'), api('/intel/precrash').catch(e => ({ error: e.message })), api('/intel/recent').catch(e => ({ error: e.message }))]);
    v.innerHTML = `
      <div id="ol-box"></div>
      ${card({ icon: 'target', title: 'Detected anomalies', sub: `${an.items.length} instrument${an.items.length === 1 ? '' : 's'} flagged, each with a plain-language reading`, actions: `<span class="xs muted an-meta">${anomMeta(an)}</span><span class="badge measured">measured</span><span class="badge estimate">rules-based reading</span>`, body: '<div id="anom-list" style="display:flex;flex-direction:column;gap:12px"></div>', foot: esc(an.method) })}
      ${card({ icon: 'history', title: 'Before the peak: pre-crash conditions', sub: 'What was in place before the 1987, 2000 and 2008 peaks, and which of those conditions are present now', actions: '<span class="badge estimate">heuristic</span>', body: '<div id="pre-body" style="display:flex;flex-direction:column;gap:16px"></div>', foot: '<span id="pre-method"></span>' })}
      ${card({ icon: 'clock', title: '2020–2023: COVID crash and the inflation bear market', sub: 'Before the peak, during the fall and the impact, with today\'s data tested against each phase', actions: '<span class="badge measured">measured now</span><span class="badge estimate">documented history</span>', body: '<div id="rc-body"></div>', foot: '<span id="rc-method"></span>', id: 'rc-card' })}
      ${card({ icon: 'target', title: 'During the crash: signatures', sub: 'What each crash looked like once it had begun. Lagging by nature; shown for completeness', actions: '<span class="badge estimate">heuristic</span>', body: '<div class="grid g-auto" id="pattern-body"></div>', foot: esc(pat.method) })}
      ${card({ icon: 'intel', title: 'AI market intelligence', sub: 'Signal → evidence → possible cause → cross-asset impact → confidence → what to watch', actions: '<span id="ai-meta"></span><span class="badge ai">AI interpretation</span>', body: `<div id="ai-ctl" class="ai-row" hidden><select id="ai-model" aria-label="Model" style="flex:0 1 260px"></select><input type="text" id="ai-q" placeholder="Optional question for this refresh, e.g. why are long yields falling?"><button class="btn" id="ai-run">${ic('refresh')}Refresh reading</button></div><div id="ai-body" style="display:flex;flex-direction:column;gap:12px">${loading('Loading the stored reading…')}</div>`, foot: '<span id="ai-foot">The model sees only the measured inputs on this page plus recent news snippets when a search key is set. It must separate verified facts, historical relationships, hypotheses and scenarios, and cite its sources. The reading is generated by an administrator or on a schedule; visitors never trigger model calls.</span>' })}`;
    $('#anom-list').innerHTML = an.items.length ? an.items.map(x => { const five = Math.abs(x.z5) > Math.abs(x.z1); const lead = five ? x.move5d : x.move1d; const u = (v) => x.unit === 'bp' ? `${v > 0 ? '+' : ''}${Math.round(v)} bp` : fmt.pct(v); const A = x.analysis || {};
      return `<article class="anom"><div class="anom-h"><span class="ico ${lead > 0 ? 'up' : 'down'}">${ic(lead > 0 ? 'up' : 'down')}</span><span class="ti">${esc(x.name)}<span>${x.id}</span></span><div class="m"><span>1-day <b class="${tone(x.move1d)}">${u(x.move1d)}</b> (${x.z1}σ)</span><span>5-day <b class="${tone(x.move5d)}">${u(x.move5d)}</b> (${x.z5}σ)</span><span>vol ${x.volRatio ?? '—'}× norm</span><span>${x.date}</span></div><span class="rt"><span class="badge ${x.severity === 'extreme' ? 'bad' : x.severity === 'high' ? 'mid' : ''}">${x.severity}</span></span></div>
        <div class="anom-b"><div class="reading"><p class="hl">${esc(A.headline || '')}</p>${anomalyPoints(A)}</div><div class="side reading">${anomalyPeers(A)}${watchList(A.watch)}<div class="row-actions"><button class="btn ghost" data-open="${x.id}">${ic('line')}Chart</button><button class="btn ghost" data-trendgo="${x.id}">${ic('compass')}Trend view</button></div></div></div></article>`; }).join('') + `<p class="xs muted">${esc((an.items[0] && an.items[0].analysis && an.items[0].analysis.note) || '')}</p>` : emptyState('No moves beyond 2σ in the latest observations.', 'target');
    $('#anom-list').onclick = e => { const t = e.target.closest('[data-trendgo]'); if (t) { state.risk.trendId = t.dataset.trendgo; show('risk'); } };
    if (pre.error) $('#pre-body').innerHTML = errorBox(pre.error); else {
      const cm = pre.common;
      const condRow = (c) => `<div class="cond ${c.hit === null ? 'na' : c.hit ? 'hit' : 'miss'}"><i></i><div class="cl"><b>${esc(c.label)}${c.basis ? ` <span class="badge estimate" title="${c.basis === 'model' ? 'Model estimate from public prices' : 'Latest official quarter carried forward with the S&P 500'}">${c.basis}</span>` : ''}</b><span class="then">Then: ${esc(c.then)}</span>${c.note ? `<span class="then">${esc(c.note)}</span>` : ''}</div><div class="cn">${esc(c.now)}</div></div>`;
      $('#pre-body').innerHTML = `
        <div class="pre-common"><div class="pre-common-h"><b>Late-cycle checklist</b><span class="mono dim">${cm.hits} of ${cm.measured} present</span></div><div class="chips-wrap">${cm.conditions.map(c => `<span class="cchip ${c.hit ? 'on' : c.measured ? '' : 'na'}" title="${esc(c.now)}"><i></i>${esc(c.label)}</span>`).join('')}</div><p class="xs muted">Shared by the three episodes. Each chip is a fixed numeric test on current data; hover for the reading. These conditions were present before past crashes and also at many times that were not followed by one.</p></div>
        <div class="grid g-3 pre-grid">${pre.episodes.map(e => `<div class="episode"><div class="ep-h"><div><b>${esc(e.name)}</b><div class="xs muted mono">peak ${e.peak} → crash ${e.crash}</div></div><div class="ep-score"><b>${e.hits}<span>/${e.measured}</span></b><span class="xs muted">conditions present</span></div></div><span class="meter"><i style="width:${e.resemblance == null ? 0 : (e.resemblance * 100).toFixed(0)}%"></i></span><div class="xs muted">${esc(e.peakToCrash)} · ${esc(e.depth)}</div><p class="sm dim">${esc(e.story)}</p><div class="cond-list">${e.conditions.map(condRow).join('')}</div><div class="xs muted">${e.unmeasured ? `${e.unmeasured} condition${e.unmeasured === 1 ? '' : 's'} not measured by this dashboard · ` : 'All conditions measured · '}${e.sources.map(x => `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(new URL(x).host.replace('www.', ''))}</a>`).join(' · ')}</div></div>`).join('')}</div>`;
      $('#pre-method').textContent = pre.method;
    }
    renderRecent(rec); renderOutlook();
    $('#pattern-body').innerHTML = pat.items.map(p => `<div class="pattern"><div class="pattern-h"><b>${esc(p.name)}</b><span class="mono ${p.hits / p.total >= .5 ? 'warn-c' : 'muted'}">${p.hits}/${p.total}</span></div><span class="meter"><i style="width:${(p.resemblance * 100).toFixed(0)}%"></i></span><p class="sm dim">${esc(p.summary)}</p><div>${p.checks.map(c => `<div class="check ${c.hit ? 'hit' : 'miss'}"><i></i><span>${esc(c.label)}</span></div>`).join('')}</div><div class="xs">${p.sources.map(s => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(new URL(s).host.replace('www.', ''))}</a>`).join(' · ')}</div></div>`).join('');
    $('#ai-run').onclick = () => runAI({ model: $('#ai-model').value || undefined, question: $('#ai-q').value || undefined });
    loadReading();
  }
  const anomMeta = (an) => {
    const sched = { daily: 'daily scan, 22:00 UTC', 'twice-daily': 'scans at 09:15 and 22:00 UTC' }[an.mode];
    if (!sched) return `Live · computed ${fmt.ago(an.scannedAt || an.asOf)}`;
    if (an.pending) return `Live until the first scheduled scan (${sched})`;
    const cl = an.changes && an.changes.cleared.length ? ` · cleared since previous: ${an.changes.cleared.join(', ')}` : '';
    return `Scanned ${fmt.time(an.scannedAt)} (${fmt.ago(an.scannedAt)}, ${an.trigger === 'admin' ? 'by admin' : 'scheduled'}) · ${sched}${an.nextScan ? ` · next ${fmt.time(an.nextScan).slice(11)}` : ''}${cl}`;
  };

  /* ───────── Dropdown menus ─────────
     Every <select> keeps its native element (value, change events and styling stay as they are), but with a mouse or
     trackpad it opens this menu instead of the browser's list: same look in every browser, a check on the current
     choice, group headings, and a filter box for long lists. Touch screens keep the native picker. */
  const dd = { el: null, sel: null, items: [], idx: -1 };
  const ddFine = () => window.matchMedia && matchMedia('(pointer: fine)').matches && innerWidth >= 760;
  function ddClose(refocus = true) { if (!dd.el) return; dd.el.remove(); dd.el = null; if (dd.sel) { dd.sel.classList.remove('dd-open'); if (refocus) dd.sel.focus({ preventScroll: true }); } dd.sel = null; window.removeEventListener('scroll', ddOnScroll, true); window.removeEventListener('resize', ddCloseNoFocus); }
  const ddCloseNoFocus = () => ddClose(false);
  const ddOnScroll = (e) => { if (dd.el && !dd.el.contains(e.target)) ddClose(false); };
  function ddPick(i) { const it = dd.items[i]; if (!it || it.disabled) return; const sel = dd.sel; ddClose(); if (sel.value !== it.value) { sel.value = it.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } }
  function ddMove(i) { const vis = dd.items.map((x, k) => k).filter(k => !dd.items[k].hidden && !dd.items[k].disabled); if (!vis.length) return; if (!vis.includes(i)) i = vis[0]; dd.idx = i; $$('.dd-item', dd.el).forEach(b => b.classList.toggle('active', Number(b.dataset.i) === i)); const b = $(`.dd-item[data-i="${i}"]`, dd.el); if (b) b.scrollIntoView({ block: 'nearest' }); }
  function ddOpen(sel) {
    ddClose(false);
    const items = []; let html = '';
    for (const node of sel.children) {
      if (node.tagName === 'OPTGROUP') { html += `<div class="dd-group">${esc(node.label)}</div>`; for (const o of node.children) { items.push({ value: o.value, label: o.textContent, disabled: o.disabled }); html += ddRow(items.length - 1, o, sel); } }
      else if (node.tagName === 'OPTION') { items.push({ value: node.value, label: node.textContent, disabled: node.disabled }); html += ddRow(items.length - 1, node, sel); }
    }
    const long = items.length > 12;
    const m = document.createElement('div'); m.className = 'dd-menu'; m.setAttribute('role', 'listbox');
    m.innerHTML = (long ? `<div class="dd-search">${ic('search')}<input type="text" placeholder="Filter…" aria-label="Filter options" autocomplete="off" spellcheck="false"></div>` : '') + `<div class="dd-list">${html}</div>`;
    document.body.appendChild(m); dd.el = m; dd.sel = sel; dd.items = items; sel.classList.add('dd-open');
    const r = sel.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, Math.min(m.offsetWidth, 340)), innerWidth - 16); m.style.width = w + 'px';
    const below = innerHeight - r.bottom - 12, above = r.top - 12; const up = below < 240 && above > below;
    m.style.maxHeight = Math.min(380, Math.max(160, up ? above : below)) + 'px';
    const left = r.left + w > innerWidth - 8 ? r.right - w : r.left; m.style.left = Math.max(8, left) + 'px';
    if (up) m.style.bottom = (innerHeight - r.top + 6) + 'px'; else m.style.top = (r.bottom + 6) + 'px';
    m.classList.toggle('up', up);
    ddMove(sel.selectedIndex >= 0 ? sel.selectedIndex : 0);
    m.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
    m.addEventListener('click', e => { const b = e.target.closest('.dd-item'); if (b) ddPick(Number(b.dataset.i)); });
    m.addEventListener('mousemove', e => { const b = e.target.closest('.dd-item'); if (b && Number(b.dataset.i) !== dd.idx) ddMove(Number(b.dataset.i)); });
    const q = $('.dd-search input', m);
    if (q) { q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); $$('.dd-item', m).forEach(b => { const it = dd.items[Number(b.dataset.i)]; it.hidden = !!t && !it.label.toLowerCase().includes(t); b.hidden = it.hidden; }); $$('.dd-group', m).forEach(g => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains('dd-group')) { if (!n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; }); ddMove(dd.idx); }); q.addEventListener('keydown', ddKeys); setTimeout(() => q.focus(), 0); }
    window.addEventListener('scroll', ddOnScroll, true); window.addEventListener('resize', ddCloseNoFocus);
  }
  function ddRow(i, o, sel) { const on = o.value === sel.value; return `<button type="button" class="dd-item ${on ? 'on' : ''}" data-i="${i}" role="option" aria-selected="${on}" ${o.disabled ? 'disabled' : ''}><span class="dd-l">${esc(o.textContent)}</span>${on ? `<span class="dd-ck">${ic('check')}</span>` : ''}</button>`; }
  function ddKeys(e) {
    if (!dd.el) return;
    const vis = dd.items.map((x, k) => k).filter(k => !dd.items[k].hidden && !dd.items[k].disabled); const pos = vis.indexOf(dd.idx);
    if (e.key === 'ArrowDown') { e.preventDefault(); ddMove(vis[Math.min(vis.length - 1, pos + 1)]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ddMove(vis[Math.max(0, pos - 1)]); }
    else if (e.key === 'Home') { e.preventDefault(); ddMove(vis[0]); } else if (e.key === 'End') { e.preventDefault(); ddMove(vis[vis.length - 1]); }
    else if (e.key === 'Enter') { e.preventDefault(); ddPick(dd.idx); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); ddClose(); }
  }
  document.addEventListener('mousedown', (e) => {
    if (dd.el && !dd.el.contains(e.target) && e.target !== dd.sel) ddClose(false);
    const sel = e.target.closest && e.target.closest('select');
    if (!sel || sel.disabled || sel.multiple || sel.dataset.native != null || !ddFine() || e.button !== 0) return;
    e.preventDefault(); if (dd.sel === sel) { ddClose(); return; } sel.focus({ preventScroll: true }); ddOpen(sel);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (dd.el) { if (!e.target.closest || !e.target.closest('.dd-search')) ddKeys(e); return; }
    const sel = e.target; if (!sel || sel.tagName !== 'SELECT' || sel.disabled || sel.multiple || sel.dataset.native != null || !ddFine()) return;
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key) && !e.altKey) { e.preventDefault(); ddOpen(sel); }
  }, true);

  /* ───────── Market outlook: five scenarios ───────── */
  const OL = { bull: ['Bull', 'New highs, contained volatility'], base: ['Base', 'Range-bound, drawdown under 10%'], correction: ['Correction', '10–20% fall, recovers in months'], bear: ['Bear', '20–30% fall over quarters'], crash: ['Crash', '30%+ or 20% in weeks, forced selling'] };
  const olState = { open: null, ctx: 'history' };
  const OLCTX = [['history', 'Versus past crashes'], ['indonesia', 'Indonesia'], ['change', 'What would change this view'], ['odds', 'How the odds were set']];
  async function renderOutlook() {
    const box = $('#ol-box'); if (!box) return;
    let r; try { r = await api('/intel/outlook'); } catch (e) { box.innerHTML = ''; return; }
    const isAdmin = !!state.admin.token && !(SNAP && !apiBase);
    const o = r.outlook; const ai = o && o.ai;
    const refreshBtn = isAdmin ? `<button class="btn ghost" id="ol-refresh">${ic('refresh')}Refresh outlook</button>` : '';
    if (!ai) { box.innerHTML = card({ icon: 'compass', title: 'Market outlook: five scenarios', sub: 'Bull · Base · Correction · Bear · Crash, with likelihood and horizon', actions: refreshBtn, body: `<div class="ai-empty">${ic('compass')}<b>No outlook yet</b><p>${r.configured ? (isAdmin ? 'Press Refresh outlook to write the first one.' : 'The first outlook appears after the next scheduled run.') : 'An Anthropic key is needed (Admin → API keys → AI).'}</p></div>` }); wire(); return; }
    const S = ai.scenarios; const maxP = Math.max(...S.map(x => x.probability));
    const dl = (id) => { const d = o.changes && o.changes.deltas.find(x => x.id === id); return d && d.delta ? `<em class="ol-d ${d.delta > 0 ? 'up' : 'dn'}">${d.delta > 0 ? '▲' : '▼'} ${Math.abs(d.delta)}</em>` : ''; };
    const dirCls = { supportive: 'ok', neutral: '', risk: 'bad' };
    const cites = (arr) => (arr || []).map(x => esc(x).replace(/\[(\d+)\]/g, (m, n) => { const it = (o.news || []).find(k => k.n === Number(n)); return it ? `<a href="${esc(it.url)}" target="_blank" rel="noopener" class="ol-cite">[${n}]</a>` : m; }));
    const open = olState.open || S.reduce((a, b) => (b.probability > a.probability ? b : a), S[0]).id;
    // Scenario table: one row per scenario, best to worst. Likelihood bars share one scale; the S&P 500 and USD/IDR ranges
    // sit on one axis per column with today's spot marked, so the rows read as a fan from firm to stressed.
    const scale = Math.ceil(maxP / 10) * 10 || 100;
    const Q = o.quant || {};
    const spotOf = (k) => (Q[k] && Q[k].spot) || (k === 'SPX' ? o.snapshot && o.snapshot.spx : null);
    const horizonN = (h) => { const n = Math.max(0, ...(String(h || '').match(/\d+(?=\s*(?:-|–|to)?\s*\d*\s*month)/gi) || []).map(Number)); return n >= 5 ? 'm6' : 'm3'; };
    const pctile = (k, move, h) => { const d = Q[k] && Q[k][horizonN(h)]; if (!d || !d.cdf) return null; let i = 0; while (i < 100 && d.cdf[i] < move) i++; return i; };
    const field = { SPX: 'spx', USDIDR: 'usdidr' };
    const dom = {}; for (const k of ['SPX', 'USDIDR']) { const sp = spotOf(k); const v = S.flatMap(x => x[field[k]] ? [x[field[k]].low, x[field[k]].high] : []).concat(sp ? [sp] : []); if (v.length) { const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * .06 || hi * .02; dom[k] = [lo - pad, hi + pad]; } }
    const pos = (k, v) => ((v - dom[k][0]) / (dom[k][1] - dom[k][0]) * 100).toFixed(1);
    const nf = (k, v) => k === 'SPX' ? Math.round(v).toLocaleString('en-US') : Math.round(v / 10) * 10 >= 10000 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v));
    const rangeCell = (x, k) => {
      const r = x[field[k]]; const sp = spotOf(k);
      if (!r || !dom[k]) return `<span class="ol-rg na"><span class="ol-rg-t muted">—</span></span>`;
      const mid = (r.low + r.high) / 2; const mv = sp ? (mid / sp - 1) * 100 : null;
      const bad = k === 'SPX' ? mv < 0 : mv > 0; // a weaker rupiah is a higher USD/IDR
      return `<span class="ol-rg"><span class="ol-rg-t"><b>${nf(k, r.low)}–${nf(k, r.high)}</b>${mv != null ? `<em class="${Math.abs(mv) < .5 ? '' : bad ? 'dn' : 'up'}">${mv > 0 ? '+' : ''}${mv.toFixed(1)}%</em>` : ''}</span><span class="ol-rg-b">${sp ? `<u style="left:${pos(k, sp)}%"></u>` : ''}<i style="left:${pos(k, r.low)}%;width:${Math.max(1.5, pos(k, r.high) - pos(k, r.low))}%"></i></span></span>`;
    };
    const ev = (k) => { const v = S.filter(x => x[field[k]]); if (v.length < 5) return null; return v.reduce((t, x) => t + x.probability / 100 * (x[field[k]].low + x[field[k]].high) / 2, 0); };
    const evCell = (k) => { const e = ev(k), sp = spotOf(k); if (e == null) return '<span class="muted">—</span>'; const mv = sp ? (e / sp - 1) * 100 : null; const bad = k === 'SPX' ? mv < 0 : mv > 0; return `<span class="ol-rg-t"><b>${nf(k, e)}</b>${mv != null ? `<em class="${Math.abs(mv) < .5 ? '' : bad ? 'dn' : 'up'}">${mv > 0 ? '+' : ''}${mv.toFixed(1)}%</em>` : ''}</span>`; };
    const sc = (x) => `<button type="button" role="row" class="ol-s ol-tr ${x.id} ${open === x.id ? 'open' : ''}" data-ol="${x.id}" aria-expanded="${open === x.id}">
      <span class="ol-c1" role="cell"><i class="ol-dot"></i><span class="ol-n">${OL[x.id][0]}${dl(x.id)}</span><span class="ol-h">${esc(OL[x.id][1])}</span></span>
      <span class="ol-c2" role="cell"><span class="ol-bar"><i style="width:${(x.probability / scale * 100).toFixed(1)}%"></i></span><b class="ol-v">${x.probability}<small>%</small></b></span>
      <span class="ol-c3 mono" role="cell">${esc(x.horizon || '—')}</span>
      <span class="ol-c4" role="cell">${rangeCell(x, 'SPX')}</span>
      <span class="ol-c5" role="cell">${rangeCell(x, 'USDIDR')}</span>
      <span class="ol-chev" aria-hidden="true">${ic('chev')}</span></button>`;
    const fxLine = (x) => { const r = x.usdidr; const sp = spotOf('USDIDR'); if (!r) return ''; const mid = (r.low + r.high) / 2; const mv = sp ? (mid / sp - 1) * 100 : null; const pc = mv != null ? pctile('USDIDR', mv, x.horizon) : null; const d = Q.USDIDR && Q.USDIDR[horizonN(x.horizon)];
      return `<span class="ol-l">USD/IDR ${nf('USDIDR', r.low)}–${nf('USDIDR', r.high)}</span><p>${r.why ? esc(r.why) : ''}${pc != null ? `<span class="ol-q">Midpoint ${mv > 0 ? '+' : ''}${mv.toFixed(1)}% vs spot ${nf('USDIDR', sp)}: ${mv >= 0 ? `a weaker rupiah than in ${pc}%` : `a firmer rupiah than in ${100 - pc}%`} of ${d.n === 126 ? '6' : '3'}-month periods since ${String(d.from).slice(0, 4)}.</span>` : ''}</p>`; };
    const det = (x) => `<div class="ol-det ${x.id}"><div class="ol-det-h"><b>${OL[x.id][0]} · ${x.probability}%</b><span class="xs muted">${esc(OL[x.id][1])}${x.horizon ? ` · ${esc(x.horizon)}` : ''}</span></div>
      <div class="ol-cols">
        <div><span class="ol-l">Path</span><p>${cites([x.path])[0] || '—'}</p>${x.analog ? `<span class="ol-l">Resembles</span><p>${cites([x.analog])[0]}</p>` : ''}</div>
        <div><span class="ol-l">What makes it likelier</span><ul>${cites(x.drivers).map(t => `<li>${t}</li>`).join('') || '<li class="muted">—</li>'}</ul>${fxLine(x)}</div>
        <div><span class="ol-l">Triggers to watch</span><ul>${cites(x.triggers).map(t => `<li>${t}</li>`).join('') || '<li class="muted">—</li>'}</ul>${(x.watch || []).length ? `<span class="ol-l">Gauges</span><p class="xs">${cites(x.watch).join(' · ')}</p>` : ''}</div>
      </div></div>`;
    // Long notes are split into sentences so the context columns break between sentences, never inside one.
    const sentences = (t) => { const parts = String(t || '').split(/(?<=[.;])\s+(?=[A-Z0-9(])/).filter(Boolean); return parts.length ? parts.map(x => `<p>${cites([x])[0]}</p>`).join('') : '<p>—</p>'; };
    const stance = { 'risk-on': 'up', neutral: '', cautious: 'warn-c', defensive: 'down' }[ai.stance] || '';
    box.innerHTML = card({ icon: 'compass', cls: 'ol-card', title: 'Market outlook: five scenarios', sub: 'Likelihood over the next 3–6 months, from the measured inputs on this page, the headlines of the day and the pre-conditions of past crashes', actions: `<span class="badge ${r.stale ? 'mid' : 'measured'}" title="${esc(o.generatedAt)}">${r.stale ? 'may be outdated' : 'current'}</span><span class="xs muted">${fmt.ago(o.generatedAt)} · ${esc(o.model || '')} · ${o.trigger === 'schedule' ? 'scheduled' : 'manual'}</span><span class="badge ai">AI judgement</span>${refreshBtn}`, body: `
      <div class="ol-hero ${stance}"><div class="ol-stance ${stance}"><span>Stance</span><b>${esc(ai.stance || '—')}</b><small>${esc(o.generatedAt.slice(0, 10))}</small></div><div class="ol-hl-w"><p class="ol-hl">${cites([ai.headline])[0]}</p><div class="ol-kpis"><span>P(fall ≥10%) <b>${S.filter(x => ['correction', 'bear', 'crash'].includes(x.id)).reduce((t, x) => t + x.probability, 0)}%</b></span><span>P(bear or crash) <b>${S.filter(x => ['bear', 'crash'].includes(x.id)).reduce((t, x) => t + x.probability, 0)}%</b></span><span>Most likely <b>${OL[S.reduce((a, b) => (b.probability > a.probability ? b : a), S[0]).id][0]}</b></span></div></div></div>
      <div class="ol-tbl" role="table" aria-label="Five scenarios with likelihood, horizon and price ranges">
        <div class="ol-th" role="row"><span role="columnheader">Scenario</span><span role="columnheader">Likelihood <small class="mono">0–${scale}%</small></span><span role="columnheader">Horizon</span><span role="columnheader">S&amp;P 500${spotOf('SPX') ? ` <small class="mono">spot ${nf('SPX', spotOf('SPX'))}</small>` : ''}</span><span role="columnheader">USD/IDR${spotOf('USDIDR') ? ` <small class="mono">spot ${nf('USDIDR', spotOf('USDIDR'))}</small>` : ''}</span><span></span></div>
        ${S.map(sc).join('')}
        <div class="ol-tf" role="row"><span class="ol-c1" role="cell"><span class="ol-n">Probability-weighted</span><span class="ol-h">Σ likelihood × range midpoint</span></span><span class="ol-c2" role="cell"><span class="xs muted">P(fall ≥10%) <b class="mono">${S.filter(x => ['correction', 'bear', 'crash'].includes(x.id)).reduce((t, x) => t + x.probability, 0)}%</b></span></span><span class="ol-c3" role="cell"></span><span class="ol-c4" role="cell">${evCell('SPX')}</span><span class="ol-c5" role="cell">${evCell('USDIDR')}</span><span></span></div>
      </div>
      <div id="ol-detail" class="ol-stack">${S.map(x => `<div class="ol-pane ${open === x.id ? 'on' : ''}" data-pane="${x.id}">${det(x)}</div>`).join('')}</div>
      <div class="ol-sub"><span class="ol-l">Conditions by theme</span><span class="ol-key"><i class="bad"></i>risk<i></i>neutral<i class="ok"></i>supportive</span></div>
      <div class="ol-cond">${(ai.conditions || []).map(c => `<div class="ol-c ${dirCls[c.direction] || ''}" title="${esc(c.direction || '')}"><i></i><b>${esc(c.theme)}</b><span>${cites([c.read])[0]}</span></div>`).join('')}</div>
      <section class="ol-ctx" aria-label="Context for the outlook">
        <div class="ol-ctx-h"><span class="ol-l">Context</span><div class="seg" role="tablist">${OLCTX.map(([k, l]) => `<button type="button" role="tab" data-ctx="${k}" class="${olState.ctx === k ? 'active' : ''}" aria-selected="${olState.ctx === k}">${l}</button>`).join('')}</div></div>
        <div class="ol-ctx-b" data-pane-ctx="history" ${olState.ctx === 'history' ? '' : 'hidden'}>${sentences(ai.history)}</div>
        <div class="ol-ctx-b" data-pane-ctx="indonesia" ${olState.ctx === 'indonesia' ? '' : 'hidden'}>${sentences(ai.indonesia)}</div>
        <div class="ol-ctx-b" data-pane-ctx="change" ${olState.ctx === 'change' ? '' : 'hidden'}><ul>${cites(ai.wouldChangeMyMind).map(t => `<li>${t}</li>`).join('') || '<li class="muted">—</li>'}</ul></div>
        <div class="ol-ctx-b" data-pane-ctx="odds" ${olState.ctx === 'odds' ? '' : 'hidden'}>${sentences(ai.baseRateNote)}</div>
      </section>
      ${r.history && r.history.length > 1 ? `<div class="ol-hist"><span class="ol-l">Daily track</span><div id="ol-chart" class="ol-ch"></div></div>` : ''}
      ${o.changes ? `<p class="xs muted">Since the previous outlook (${fmt.time(o.changes.previousAt)}): ${o.changes.deltas.filter(d => d.delta).map(d => `${OL[d.id][0]} ${d.from}% → ${d.to}%`).join(', ') || 'no change in the odds'}${o.changes.previousStance !== ai.stance ? ` · stance ${esc(o.changes.previousStance)} → ${esc(ai.stance)}` : ''}.</p>` : ''}`,
      foot: 'Probabilities are the calibrated judgement of the model, anchored on base rates (a 10% correction about once a year, a 20% bear every 3–5 years, a crash once in 10–15 years), moved by the conditions measured on this page. Verified facts come from the inputs; the rest is interpretation, not a forecast. Rewritten daily when the schedule is on.' });
    const pick = (id) => { olState.open = id; $$('#ol-box [data-ol]').forEach(x => { const on = x.dataset.ol === id; x.classList.toggle('open', on); x.setAttribute('aria-expanded', String(on)); }); $$('#ol-detail .ol-pane').forEach(pn => pn.classList.toggle('on', pn.dataset.pane === id)); };
    $$('#ol-box [data-ol]').forEach(b => b.onclick = () => pick(b.dataset.ol));
    $$('#ol-box [data-ctx]').forEach(b => b.onclick = () => { olState.ctx = b.dataset.ctx; $$('#ol-box [data-ctx]').forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); }); $$('#ol-box [data-pane-ctx]').forEach(pn => { pn.hidden = pn.dataset.paneCtx !== olState.ctx; }); });
    if (r.history && r.history.length > 1) {
      const T = tok(); const C = { bull: T.up, base: T.fg3, correction: T.warn, bear: T.c3, crash: T.down };
      chart('#ol-chart', { grid: { left: 8, right: 8, top: 24, bottom: 6, containLabel: true }, legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: T.fg2, fontSize: 11 * fs() } }, tooltip: { trigger: 'axis', valueFormatter: v => v + '%' }, xAxis: { type: 'category', data: r.history.map(h => h.generatedAt.slice(5, 10)), ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', max: 100, ...axis(T), axisLabel: { color: T.fg3, fontSize: 10.5 * fs(), formatter: v => v + '%' } }, series: SCEN.map(id => ({ name: OL[id][0], type: 'line', stack: 'p', areaStyle: { opacity: .55 }, lineStyle: { width: 1, color: C[id] }, itemStyle: { color: C[id] }, showSymbol: false, data: r.history.map(h => h.probabilities[id] || 0) })) });
    }
    wire();
    function wire() { const b = $('#ol-refresh'); if (b) b.onclick = async () => { b.disabled = true; b.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>Writing…'; try { await api('/admin/outlook/refresh', { method: 'POST', headers: { authorization: 'Bearer ' + state.admin.token, 'content-type': 'application/json' }, body: '{}' }); toast('Outlook refreshed'); renderOutlook(); } catch (e) { toast(e.message); b.disabled = false; b.innerHTML = `${ic('refresh')}Refresh outlook`; } }; }
  }
  const SCEN = ['bull', 'base', 'correction', 'bear', 'crash'];

  /* ───────── 2020–2023 episodes: before / during / impact ───────── */
  const condRowHtml = (c) => `<div class="cond ${c.hit === null ? 'na' : c.hit ? 'hit' : 'miss'}"><i></i><div class="cl"><b>${esc(c.label)}${c.basis ? ` <span class="badge estimate">${c.basis}</span>` : ''}</b><span class="then">Then: ${esc(c.then)}</span>${c.note ? `<span class="then">${esc(c.note)}</span>` : ''}</div><div class="cn">${esc(c.now)}</div></div>`;
  const rcState = {};
  function renderRecent(rec) {
    const box = $('#rc-body'); if (!box) return;
    if (!rec || rec.error) { box.innerHTML = errorBox((rec && rec.error) || 'Could not load the 2020–2023 episodes.'); return; }
    $('#rc-method').textContent = rec.method;
    const draw = () => {
      box.innerHTML = `<div class="rc-grid">${rec.episodes.map(e => { const ph = rcState[e.id] || 'before'; return `<article class="rc-ep" data-ep="${e.id}">
        <div class="rc-h"><div class="rc-t"><span class="rc-yr">${esc(e.short)}</span><div><b>${esc(e.name)}</b><div class="xs muted mono rc-dates"><span>peak ${e.peak}</span><span>low ${e.trough}</span><span>new high ${e.recovered}</span></div></div></div></div>
        <div class="rc-facts"><div><span>Fall</span><b>${esc(e.depth)}</b></div><div><span>Speed</span><b>${esc(e.duration)}</b></div><div><span>Recovery</span><b>${esc(e.recovery)}</b></div></div>
        <p class="rc-story">${esc(e.story)}</p>
        <div class="seg rc-tabs" role="tablist">${[['before', 'Before the peak', `${e.before.hits}/${e.before.measured}`], ['during', 'During the fall', `${e.during.hits}/${e.during.measured}`], ['impact', 'Impact', '']].map(([k, l, n]) => `<button type="button" role="tab" data-ph="${k}" class="${ph === k ? 'active' : ''}" aria-selected="${ph === k}">${l}${n ? `<span class="rc-n ${k === 'during' && e.during.hits ? 'hot' : ''}">${n}</span>` : ''}</button>`).join('')}</div>
        ${ph === 'before' ? `<p class="rc-q">Conditions in place before the peak. <b>${e.before.hits} of ${e.before.measured}</b> measurable ones are present now.</p><div class="cond-list">${e.before.conditions.map(condRowHtml).join('')}</div>`
        : ph === 'during' ? `<p class="rc-q">What the fall looked like. Is it happening now? <b class="${e.during.hits ? 'warn-c' : 'up'}">${e.during.hits ? `${e.during.hits} of ${e.during.measured} signatures present` : `None of the ${e.during.measured} signatures is present`}</b>.</p><div class="cond-list">${e.during.signatures.map(condRowHtml).join('')}</div>`
        : `<ol class="rc-impact">${e.impact.map(x => `<li>${esc(x)}</li>`).join('')}</ol><div class="callout"><span>${ic('info')}</span><div><b>Lesson for now.</b> ${esc(e.lesson)}</div></div><div class="rc-src xs muted">Sources: ${e.sources.map(u => { let h = u; try { const x = new URL(u); h = x.hostname.replace('www.', '') + (x.pathname.match(/series\/([^/]+)/) ? ' · ' + x.pathname.match(/series\/([^/]+)/)[1] : ''); } catch (err) {} return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(h)}</a>`; }).join(' · ')}</div>`}
      </article>`; }).join('')}</div>`;
      $$('#rc-body .rc-tabs [data-ph]').forEach(b => b.onclick = () => { rcState[b.closest('[data-ep]').dataset.ep] = b.dataset.ph; draw(); });
    };
    draw();
  }

  function renderFindings(st, box) {
    let ai = st.ai || {}; const news = (st.news && st.news.items) || [];
    // readings saved before the parser fix may hold the model's JSON as text: recover it, or say it was cut off
    if (!(ai.findings || []).length && /[{`]/.test(ai.overview || '')) {
      let t = String(ai.overview); const f = t.match(/```(?:json)?\s*([\s\S]*?)(```|$)/i); if (f) t = f[1]; const a = t.indexOf('{'), b = t.lastIndexOf('}');
      let ok = null; try { ok = a >= 0 && b > a ? JSON.parse(t.slice(a, b + 1)) : null; } catch (e) { ok = null; }
      if (ok && Array.isArray(ok.findings)) ai = ok;
      else { box.innerHTML = `<div class="callout warn">${ic('alert')}<div><b>The stored reading is incomplete.</b> The model's answer was cut off before it finished, so it cannot be shown. ${state.admin.token ? 'Press Refresh to generate a new one.' : 'An administrator can refresh it from the Admin console.'}</div></div>`; return; }
    }
    box.innerHTML = `<div class="callout">${ic('intel')}<div><b>Overview.</b> ${esc(ai.overview || '')}</div></div>` + (ai.findings || []).map(f => `<div class="finding"><h4>${esc(f.signal)} <span class="badge ${f.confidence === 'High' ? 'measured' : f.confidence === 'Medium' ? 'mid' : 'bad'}">${esc(f.confidence)} confidence</span></h4>
        <div class="row"><b>Evidence</b><ul>${(f.evidence || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="row"><b>Possible cause</b><div>${esc(f.possibleCause)}</div></div>
        <div class="row"><b>Cross-asset impact</b><div>${esc(f.crossAssetImpact)}</div></div>
        <div class="row"><b>Confidence</b><div>${esc(f.confidence)}: ${esc(f.confidenceWhy)}</div></div>
        <div class="row"><b>What to watch</b><ul>${(f.whatToWatch || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${f.classification ? `<div class="row"><b>Classification</b><div class="cls-list">${['verifiedFacts', 'historicalRelationships', 'hypotheses', 'scenarios'].filter(k => (f.classification[k] || []).length).map(k => `<div class="cls-item"><span class="badge ${k === 'verifiedFacts' ? 'measured' : k === 'hypotheses' ? 'ai' : 'mid'}">${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span><span>${(f.classification[k] || []).map(esc).join(' · ')}</span></div>`).join('')}</div></div>` : ''}
        ${(f.citations || []).length ? `<div class="row"><b>Sources</b><div class="sm">${f.citations.map(n => news[n - 1] ? `[${n}] <a href="${esc(news[n - 1].url)}" target="_blank" rel="noopener">${esc(news[n - 1].title)}</a>` : `[${n}]`).join('<br>')}</div></div>` : ''}</div>`).join('') + `<p class="xs muted">${st.question ? `Question for this refresh: "${esc(st.question)}" · ` : ''}Model ${esc(st.model || '')} · ${news.length ? `${news.length} news snippets via ${esc(st.news.provider || 'search')}` : esc(st.newsNote || 'no news supplied')} · ${st.usage ? `${(st.usage.input_tokens || 0) + (st.usage.output_tokens || 0)} tokens` : ''}</p>`;
  }
  async function loadReading() {
    const box = $('#ai-body'); const ctl = $('#ai-ctl'); const meta = $('#ai-meta'); if (!box) return;
    const isAdmin = !!state.admin.token && !(SNAP && !apiBase);
    ctl.hidden = !isAdmin;
    if (isAdmin) fillModelSelect($('#ai-model'));
    try {
      const r = await api('/intel/reading');
      const rd = r.reading;
      meta.innerHTML = rd ? `<span class="badge ${r.stale ? 'mid' : 'measured'}" title="${esc(r.why.join('; ') || 'Reading matches the current data')}">${r.stale ? 'may be outdated' : 'current'}</span><span class="xs muted">${fmt.ago(rd.generatedAt)} · ${esc(rd.model)} · ${rd.trigger === 'schedule' ? 'scheduled' : 'manual'}</span>` : '';
      if (!rd) { box.innerHTML = `<div class="ai-empty">${ic('intel')}<b>No AI reading yet</b><p>${isAdmin ? 'Choose a model and press <b>Refresh reading</b> above.' : 'A reading appears here after the next scheduled run, or when an administrator generates one.'}</p></div>`; return; }
      renderFindings(rd, box);
      if (r.stale && r.why.length) box.insertAdjacentHTML('afterbegin', `<div class="callout warn">${ic('alert')}<div><b>Since this reading was generated:</b> ${esc(r.why.join('; '))}.${isAdmin ? ' Press Refresh reading to update it.' : ''}</div></div>`);
    } catch (e) { box.innerHTML = errorBox(e.message); }
  }
  async function fillModelSelect(sel) {
    if (!sel || sel.dataset.filled) return; sel.innerHTML = '<option value="">Default model</option>';
    try { const r = await api('/admin/models', { headers: { authorization: 'Bearer ' + state.admin.token } }); sel.innerHTML = `<option value="">Default (${esc(r.current || 'claude-sonnet-5-5')})</option>` + r.models.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''); sel.dataset.filled = '1'; } catch (e) { sel.innerHTML = `<option value="">Default model</option>`; }
  }
  async function runAI({ model, question } = {}) {
    const box = $('#ai-body'); const btn = $('#ai-run'); if (!btn) return; btn.disabled = true; box.innerHTML = loading(`Gathering evidence and asking ${model || 'the default model'}…`);
    try { await api('/admin/ai-refresh', { method: 'POST', headers: { authorization: 'Bearer ' + state.admin.token, 'content-type': 'application/json' }, body: JSON.stringify({ model, question }) }); toast('AI reading refreshed'); await loadReading(); }
    catch (e) { box.innerHTML = errorBox(e.message); } finally { btn.disabled = false; }
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
    const SECS = [['home','home','Overview'],['keys','key','API keys'],['members','users','Members'],['realtime','pulse','Real-time'],['ai','intel','Intelligence'],['usage','db','Usage & logs'],['tv','tv','Live TV'],['appearance','book','Appearance'],['data','layers','Data & storage']];
    let sec = (() => { try { return sessionStorage.getItem('cft:admsec') || 'home'; } catch (e) { return 'home'; } })(); if (!SECS.some(x => x[0] === sec)) sec = 'home';
    v.innerHTML = `<div class="adm-lock" id="adm-lockscreen"><form class="adm-lock-card" id="adm-lock-form" autocomplete="off">
        <div class="pin-ic">${ic('lock')}</div><h2>Admin console</h2><p class="dim sm">Enter the admin token to manage keys, members, real-time data and usage.</p>
        <input type="password" id="adm-token" value="${esc(a.token)}" placeholder="ADMIN_TOKEN" autocomplete="off" aria-label="Admin token">
        <button class="btn" id="adm-unlock" type="submit">Unlock</button><div class="pin-err" id="adm-lock-err" role="alert"></div>
        <p class="xs muted">The token is kept in this browser tab only. <a href="#overview">Back to the terminal</a></p></form></div>
      <div class="adm" id="adm-console">
        <nav class="adm-nav" id="adm-nav" aria-label="Admin sections">${SECS.map(([k, i, l]) => `<button type="button" data-sec="${k}" class="${sec === k ? 'active' : ''}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>
        <div class="adm-body">
          <section class="adm-sec" data-sec="home"><div id="adm-home"></div></section>
          <section class="adm-sec" data-sec="keys">${card({ icon: 'key', title: 'API credentials', sub: 'Stored server-side, encrypted; values are never shown in full', body: '<div id="adm-fields"><div class="loading"><span class="spin"></span>Loading…</div></div>' })}</section>
          <section class="adm-sec" data-sec="members">${card({ icon: 'users', title: 'Members', sub: 'People who sign in with a PIN for live prices and every TV channel', body: '<div id="adm-members"></div>' })}</section>
          <section class="adm-sec" data-sec="realtime">${card({ icon: 'pulse', title: 'Real-time data routing', sub: 'Which provider prices each instrument. Switch real-time on and add keys in the Real-time group of the credentials panel', body: '<div id="adm-rt"><p class="dim">Unlock to view.</p></div>' })}</section>
          <section class="adm-sec" data-sec="ai">${card({ icon: 'compass', title: 'Market outlook', sub: 'The five-scenario outlook at the top of the Intelligence page', body: '<div id="adm-outlook"></div>' })}${card({ icon: 'target', title: 'Anomaly scan', sub: 'How often Detected anomalies is refreshed, and what changed between scans', body: '<div id="adm-anom"></div>' })}<div class="adm-2">${card({ icon: 'intel', title: 'AI reading', sub: 'Generate or schedule the market reading shown on the Intelligence page', body: '<div id="adm-ai"><p class="dim">Unlock to manage.</p></div>' })}${card({ icon: 'news', title: 'News curation', sub: 'Optional: let a model rank and annotate the sidebar headlines', body: '<div id="adm-news"><p class="dim">Unlock to manage.</p></div>' })}</div></section>
          <section class="adm-sec" data-sec="usage">${card({ icon: 'db', title: 'Usage & API logs', sub: 'Every upstream API call, model token and storage operation, with an estimated cost', body: '<div id="adm-usage"><p class="dim">Unlock to view.</p></div>', cls: 'us-card' })}</section>
          <section class="adm-sec" data-sec="tv">${card({ icon: 'tv', title: 'Live TV channels', sub: 'Broadcaster HLS streams offered in the sidebar player', body: '<div id="adm-tv"><p class="dim">Unlock to edit.</p></div>' })}</section>
          <section class="adm-sec" data-sec="appearance">${card({ icon: 'book', title: 'Appearance', sub: 'Font and text size for everyone who opens the terminal', body: '<div id="adm-ui"><p class="dim">Unlock to change.</p></div>' })}</section>
          <section class="adm-sec" data-sec="data"><div class="adm-2">${card({ icon: 'db', title: 'Storage & cache', sub: 'Health of each delayed price source right now', body: '<div id="adm-status"><p class="dim">Unlock to view.</p></div>' })}${card({ icon: 'info', title: 'How data is handled', sub: 'Sources, keys, cache lifetimes and demo mode', body: '<div class="sm dim" style="display:flex;flex-direction:column;gap:8px"><p><b>No key needed:</b> Yahoo Finance (delayed), FRED, CoinGecko public, gold-api.com.</p><p><b>Optional:</b> FRED, EIA, CoinGecko (longer history), Anthropic (AI explanations), Exa or Parallel (news citations).</p><p><b>Cache:</b> quotes 60 s, histories 15 min, macro 1 h. If a source fails, the last value is served and flagged stale.</p><p><b>Demo mode</b> shows a permanent banner and every badge reads demo.</p></div>' })}</div>${card({ icon: 'layers', title: 'Market-size reference data', sub: 'Published aggregates behind the Overview treemap', body: '<div id="adm-sizes"><p class="dim">Unlock to edit.</p></div>', foot: 'Update when a newer SIFMA Fact Book or World Gold Council figure is published, and keep the source and as-of date.' })}</section>
        </div></div>`;
    const lazy = { ai: () => { renderAdminAnomalies(hdr); renderAdminOutlook(hdr); }, realtime: () => renderAdminRealtime(hdr), usage: () => renderAdminUsage(hdr), members: () => renderAdminMembers(hdr), home: () => renderAdminHome(hdr) };
    const opened = new Set();
    const openSec = (k) => { sec = k; try { sessionStorage.setItem('cft:admsec', k); } catch (e) {} $$('#adm-nav [data-sec]').forEach(b => b.classList.toggle('active', b.dataset.sec === k)); $$('.adm-sec').forEach(x => x.classList.toggle('active', x.dataset.sec === k)); const nb = $(`#adm-nav [data-sec="${k}"]`); if (nb && nb.scrollIntoView) nb.scrollIntoView({ block: 'nearest', inline: 'nearest' }); window.scrollTo({ top: 0 }); if (v.classList.contains('unlocked') && lazy[k] && (!opened.has(k) || k === 'home')) { opened.add(k); lazy[k](); } };
    state.admin.openSec = openSec;
    $('#adm-nav').onclick = (e) => { const b = e.target.closest('[data-sec]'); if (b) openSec(b.dataset.sec); };
    openSec(sec);
    const unlock = async () => {
      a.token = $('#adm-token').value.trim(); const ub = $('#adm-unlock'); const le = $('#adm-lock-err'); le.textContent = '';
      if (!a.token) { le.textContent = 'Enter the admin token.'; return; }
      ub.disabled = true; ub.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>Checking…';
      try {
        const [k, st, sz] = await Promise.all([api('/admin/keys', { headers: hdr() }), api('/admin/status', { headers: hdr() }), api('/admin/sizes', { headers: hdr() })]);
        try { sessionStorage.setItem('cft:admin', a.token); } catch (e) {}
        v.classList.add('unlocked'); a.status = st; a.keys = k; syncRole(); startRt();
        const groups = {}; k.fields.filter(f => f.group !== 'Appearance' && f.key !== 'ANOMALY_SCHEDULE').forEach(f => (groups[f.group] ||= []).push(f));
        const gIcon = { Appearance: 'book', AI: 'intel', Search: 'search', Data: 'db', 'Real-time': 'pulse' };
        $('#adm-fields').innerHTML = Object.entries(groups).map(([g, fs]) => `<div class="nav-label" style="padding:18px 0 4px;display:flex;align-items:center;gap:6px">${ic(gIcon[g] || 'key')}${esc(g)}</div>` + fs.map(f => {
          const status = f.configured ? `<span class="badge measured">${f.secret === false ? esc(f.value) : 'set'}${f.fromEnv ? ' · env' : ''}</span>` : `<span class="badge">${f.models ? 'default' : 'not set'}</span>`;
          const input = f.models ? `<select id="k-${f.key}" data-key="${f.key}" data-models="1" data-orig="${esc(f.value || '')}" data-def="${esc(f.placeholder || '')}"><option value="">${esc(f.value || ('Default · ' + (f.placeholder || '')))}</option></select>` : f.options ? `<select id="k-${f.key}" data-key="${f.key}"><option value="">${esc(f.value ? 'Keep: ' + f.value : 'Default: ' + (f.placeholder || ''))}</option>${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>` : `<input id="k-${f.key}" type="${f.secret === false ? 'text' : 'password'}" data-key="${f.key}" placeholder="${esc(f.secret === false ? (f.value || f.placeholder || '') : (f.value || 'Paste key'))}" autocomplete="off">`;
          return `<div class="form-row"><label for="k-${f.key}">${esc(f.label)} ${status}</label><div class="inline">${input}${f.models ? `<button type="button" class="btn" data-savekey="${f.key}">${ic('check')}Save</button>` : ''}${f.test ? `<button type="button" class="btn ghost" data-test="${f.key}">${ic('pulse')}Test</button>` : ''}</div><div class="help">${esc(f.help)}</div>${f.test ? `<div class="test-out" id="t-${f.key}"></div>` : ''}</div>`;
        }).join('')).join('') + `<div class="row-actions" style="margin-top:12px;align-items:center"><button class="btn" id="adm-save">Save credentials</button><span class="xs muted">Blank keeps the current value. Type <code>clear</code> to remove one.</span></div>`;
        // Model pickers: filled from the models the saved Anthropic key can use; the saved model is preselected.
        (async () => { const sels = $$('#adm-fields select[data-models]'); if (!sels.length) return; let list = []; try { list = (await api('/admin/models', { headers: hdr() })).models || []; } catch (e) {}
          for (const s of sels) { const orig = s.dataset.orig, def = s.dataset.def; const ids = list.map(m => m.id); const extra = orig && !ids.includes(orig) ? [{ id: orig, name: orig }] : [];
            s.innerHTML = `<option value="${orig ? 'clear' : ''}">Default · ${esc(list.find(m => m.id === def)?.name || def)}</option>` + [...extra, ...list].map(m => `<option value="${esc(m.id)}">${esc(m.name)}${m.name !== m.id ? ` · ${esc(m.id)}` : ''}</option>`).join('');
            s.value = orig || (orig ? 'clear' : ''); } })();
        $('#adm-fields').onclick = async (e) => {
          const sv = e.target.closest('[data-savekey]');
          if (sv) { const key = sv.dataset.savekey; const s = $('#k-' + key); const v = s.value; if (v === s.dataset.orig || (!v && !s.dataset.orig)) return toast('No change to save'); sv.disabled = true; try { await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify({ [key]: v === 'clear' ? '' : v }) }); toast(`${key === 'INTEL_MODEL' ? 'Market Intelligence model' : 'Anthropic model'} saved: ${v === 'clear' ? 'default' : v}`); unlock(); } catch (err) { toast(err.message); sv.disabled = false; } return; }
          const b = e.target.closest('[data-test]'); if (!b) return;
          const key = b.dataset.test; const out = $('#t-' + key); const sel = $('#k-' + key); const val = (sel.dataset.models ? (sel.value === 'clear' ? sel.dataset.def : sel.value) : (sel.value || '')).trim();
          b.disabled = true; out.className = 'test-out run'; out.innerHTML = `<span class="spin" style="width:12px;height:12px"></span>Testing ${val ? 'the entered key' : 'the saved key'}…`;
          try { if (SNAP && !apiBase) throw new Error('Connect a live API to test keys.'); const res = await fetch((apiBase ? apiBase.replace(/\/$/, '') : '') + '/api/admin/test', { method: 'POST', headers: hdr(), body: JSON.stringify({ key, value: val || undefined }) }); const r = await res.json(); if (res.status === 401) throw new Error(r.error || 'Admin token rejected'); out.className = 'test-out ' + (r.ok ? 'ok' : /No key/.test(r.message || '') ? 'run' : 'bad'); out.innerHTML = `${ic(r.ok ? 'pulse' : /No key/.test(r.message || '') ? 'info' : 'alert')}<span>${esc(r.message)}${r.ms != null ? ` <span class="muted">(${r.ms} ms)</span>` : ''}</span>`; }
          catch (err) { out.className = 'test-out bad'; out.innerHTML = `${ic('alert')}<span>${esc(err.message)}</span>`; }
          finally { b.disabled = false; }
        };
        $('#adm-save').onclick = async () => { const upd = {}; $$('#adm-fields [data-key]').forEach(i => { if (i.dataset.models && (i.value === i.dataset.orig || (!i.value && !i.dataset.orig))) return; if (i.value) upd[i.dataset.key] = i.value === 'clear' ? '' : i.value; }); if (!Object.keys(upd).length) return toast('Nothing to save'); try { await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify(upd) }); toast('Credentials saved'); unlock(); startRt(); loadUI(); } catch (e) { toast(e.message); } };
        try {
          const rd = await api('/intel/reading'); const cur = rd.reading;
          $('#adm-ai').innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
            <div class="kv"><dt>Last reading</dt><dd>${cur ? `${fmt.time(cur.generatedAt)} (${fmt.ago(cur.generatedAt)})` : 'none yet'}</dd><dt>Model</dt><dd>${cur ? esc(cur.model) : '—'}</dd><dt>Trigger</dt><dd>${cur ? (cur.trigger === 'schedule' ? 'scheduled' : 'manual') : '—'}</dd><dt>Status</dt><dd class="${rd.stale ? 'warn-c' : 'up'}">${rd.stale ? 'may be outdated' : 'current'}</dd><dt>Auto-refresh</dt><dd>${esc(rd.autoRefresh)}</dd></div>
            ${rd.stale && rd.why.length ? `<p class="xs muted">${esc(rd.why.join('; '))}</p>` : ''}
            <div class="field"><label for="adm-ai-model">Model for this refresh</label><select id="adm-ai-model"></select></div>
            <div class="field"><label for="adm-ai-q">Optional question</label><input type="text" id="adm-ai-q" placeholder="e.g. what is driving the credit widening?"></div>
            <div class="row-actions"><button class="btn" id="adm-ai-run">${ic('refresh')}Refresh reading now</button><button class="btn ghost" data-go="intel">View on Intelligence</button></div>
            <p class="xs muted">The schedule runs once a day at 22:00 UTC, after the US close. Set <b>Automatic AI refresh</b> in the credentials panel to daily or on-change to enable it. Each refresh is one model call (a few thousand tokens).</p></div>`;
          fillModelSelect($('#adm-ai-model'));
          $('#adm-ai-run').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; const old = b.innerHTML; b.innerHTML = `<span class="spin" style="width:12px;height:12px"></span>Refreshing…`; try { const r = await api('/admin/ai-refresh', { method: 'POST', headers: hdr(), body: JSON.stringify({ model: $('#adm-ai-model').value || undefined, question: $('#adm-ai-q').value || undefined }) }); toast(`Reading refreshed with ${r.reading.model}`); unlock(); } catch (err) { toast(err.message); b.disabled = false; b.innerHTML = old; } };
          $$('#adm-ai [data-go]').forEach(x => x.onclick = () => show(x.dataset.go));
        } catch (e) { $('#adm-ai').innerHTML = errorBox(e.message); }
        renderAdminUI(hdr); renderAdminNews(hdr); renderAdminTv(hdr); renderAdminStore(hdr); opened.clear(); openSec(sec);
        $('#adm-status').innerHTML = `<div class="tbl"><table class="t"><thead><tr><th>Source</th><th class="num">OK</th><th class="num">Failed</th><th class="num">Stale</th></tr></thead><tbody>${Object.entries(st.bySource).map(([s, x]) => `<tr><td><span style="display:inline-flex;gap:8px;align-items:center"><i class="dot ${x.failed ? 'bad' : 'ok'}"></i>${esc(s)}</span>${x.errors.length ? `<div class="xs muted">${x.errors.map(esc).join('<br>')}</div>` : ''}</td><td class="num up">${x.ok}</td><td class="num ${x.failed ? 'down' : 'muted'}">${x.failed}</td><td class="num ${x.stale ? 'down' : 'muted'}">${x.stale}</td></tr>`).join('')}</tbody></table></div><div id="adm-store" style="margin:10px 0"></div><button class="btn ghost" id="adm-clear">${ic('refresh')}Clear cache</button>`;
        $('#adm-clear').onclick = async () => { try { const r = await api('/admin/cache/clear', { method: 'POST', headers: hdr() }); toast(`Cleared ${r.cleared} cache entries`); } catch (e) { toast(e.message); } };
        $('#adm-sizes').innerHTML = sz.references.filter(r => r.id !== 'CRYPTO_TOTAL').map(r => `<div class="form-row"><label>${esc(r.label)} <span class="xs muted">${esc(r.measure.replace(/_/g, ' '))}</span></label><div class="inline"><input type="number" data-sz="${r.id}" data-f="${r.tonnes ? 'tonnes' : 'usd'}" placeholder="${r.tonnes ? r.tonnes + ' tonnes' : (r.usd / 1e12).toFixed(1) + ' $T'}" value="${r.override ? (r.override.tonnes || r.override.usd / 1e12) : ''}" aria-label="${esc(r.label)} value"><input type="text" data-szs="${r.id}" placeholder="${esc(r.source)}" value="${esc(r.override?.source || '')}" aria-label="Source"><input type="text" data-sza="${r.id}" placeholder="${esc(r.asOf)}" value="${esc(r.override?.asOf || '')}" aria-label="As of" style="flex:0 1 90px"></div></div>`).join('') + `<div class="row-actions" style="margin-top:12px"><button class="btn" id="adm-size-save">Save reference data</button></div>`;
        $('#adm-size-save').onclick = async () => { const o = {}; $$('#adm-sizes input[data-sz]').forEach(i => { if (!i.value) return; const id = i.dataset.sz; o[id] = i.dataset.f === 'tonnes' ? { tonnes: Number(i.value) } : { usd: Number(i.value) * 1e12 }; o[id].source = $(`[data-szs="${id}"]`).value || undefined; o[id].asOf = $(`[data-sza="${id}"]`).value || undefined; }); try { await api('/admin/sizes', { method: 'POST', headers: hdr(), body: JSON.stringify(o) }); toast('Reference data saved'); } catch (e) { toast(e.message); } };
      } catch (e) { v.classList.remove('unlocked'); le.textContent = /token|unauth|401/i.test(e.message) ? 'That token was not accepted.' : e.message; if (/token|unauth|401/i.test(e.message)) { a.token = ''; try { sessionStorage.removeItem('cft:admin'); } catch (x) {} syncRole(); } }
      finally { ub.disabled = false; ub.textContent = 'Unlock'; }
    };
    $('#adm-lock-form').onsubmit = (e) => { e.preventDefault(); unlock(); };
    if (!a.token) setTimeout(() => { const t = $('#adm-token'); if (t) t.focus(); }, 50);
    if (a.token) unlock();
  }

  async function renderAdminUI(hdr) {
    const box = $('#adm-ui'); if (!box) return;
    let cur; try { cur = await api('/ui'); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const sel = { font: cur.font, size: cur.size };
    const SCALE = { small: 0.92, default: 1, large: 1.08, 'x-large': 1.16 };
    const FONTS = [
      ['terminal', 'Terminal', 'JetBrains Mono throughout', "'JetBrains Mono', monospace", "'JetBrains Mono', monospace"],
      ['classic', 'Classic', 'IBM Plex Sans + Plex Mono (original)', "'IBM Plex Sans', sans-serif", "'IBM Plex Mono', monospace"],
      ['modern', 'Modern', 'Inter + JetBrains Mono figures', "'Inter', sans-serif", "'JetBrains Mono', monospace"],
    ];
    // make sure every sample font is loaded for the preview
    if (!document.getElementById('ui-font-preview')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'ui-font-preview'; l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&family=Inter:wght@400;600;700&display=swap'; document.head.appendChild(l); }
    const draw = () => {
      box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
        <div class="ui-fonts">${FONTS.map(([k, name, desc, text, num]) => `<button type="button" class="ui-font ${sel.font === k ? 'on' : ''}" data-font="${k}" aria-pressed="${sel.font === k}"><span class="ui-radio"></span><span class="ui-meta"><b>${name}</b><span class="xs muted">${desc}</span></span><span class="ui-prev"><span class="ui-sample" style="font-family:${text}">Market Overview</span><span class="ui-num" style="font-family:${num}">7,716.96 <i class="up">+0.06%</i></span></span></button>`).join('')}</div>
        <div class="field"><label>Text size</label><span id="ui-size"></span></div>
        <div class="row-actions"><button class="btn" id="ui-save">Apply to everyone</button><button class="btn ghost" id="ui-revert">Revert preview</button><span class="xs muted" style="align-self:center">Choosing a font or size previews it here first.</span></div></div>`;
      mount('#ui-size', seg([['small', 'Small'], ['default', 'Default'], ['large', 'Large'], ['x-large', 'X-Large']], sel.size, v => { sel.size = v; applyUI({ font: sel.font, scale: SCALE[v] }, false); }, ''));
      box.querySelectorAll('[data-font]').forEach(b => b.onclick = () => { sel.font = b.dataset.font; applyUI({ font: sel.font, scale: SCALE[sel.size] }, false); draw(); });
      $('#ui-save').onclick = async () => { try { await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify({ UI_FONT: sel.font, UI_FONT_SIZE: sel.size }) }); toast(`Appearance saved: ${sel.font}, ${sel.size}`); applyUI({ font: sel.font, scale: SCALE[sel.size] }, true); } catch (e) { toast(e.message); } };
      $('#ui-revert').onclick = () => { sel.font = cur.font; sel.size = cur.size; applyUI({ font: cur.font, scale: cur.scale }, false); draw(); };
    };
    draw();
  }
  async function renderAdminNews(hdr) {
    const box = $('#adm-news');
    try {
      const [nw, src] = await Promise.all([api('/news'), api('/admin/news-sources', { headers: hdr() })]);
      const cur = nw.curated;
      box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
        <div class="kv"><dt>Mode</dt><dd>${nw.aiCuration ? 'on' : 'off'}</dd><dt>Last curation</dt><dd>${cur ? `${fmt.time(cur.curatedAt)} (${fmt.ago(cur.curatedAt)})` : 'none yet'}</dd><dt>Model</dt><dd>${cur ? esc(cur.model) : '—'}</dd><dt>Picks</dt><dd>${cur ? cur.picks.length : '—'}</dd><dt>Headlines now</dt><dd>${nw.items.length}</dd></div>
        ${cur && cur.themes && cur.themes.length ? `<div class="chips-wrap">${cur.themes.map(t => `<span class="cchip on"><i></i>${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="field"><label for="adm-news-model">Model for this run</label><select id="adm-news-model"></select></div>
        <div class="row-actions"><button class="btn" id="adm-news-run">${ic('intel')}Curate news now</button></div>
        <p class="xs muted">Set <b>AI news curation</b> in the credentials panel to <code>manual</code> (button only) or <code>daily</code> (also runs with the 22:00 UTC job). The model sees headlines only and returns 20–30 picks with a one-line reason and the assets touched. Readers see them under the <b>AI picks</b> filter and marked in the feed.</p>
        <details><summary class="sm dim" style="cursor:pointer">Feeds (${src.sources.length})</summary><div class="tbl" style="margin-top:8px"><table class="t"><thead><tr><th>Feed</th><th>Region</th><th class="num">Items</th><th>Status</th></tr></thead><tbody>${nw.sources.map(s => `<tr><td>${esc(s.name)}</td><td class="muted">${s.region}</td><td class="num">${s.count}</td><td>${s.error ? `<span class="badge error" title="${esc(s.error)}">failed</span>` : s.stale ? '<span class="badge stale">stale</span>' : '<span class="badge measured">ok</span>'}</td></tr>`).join('')}</tbody></table></div></details></div>`;
      fillModelSelect($('#adm-news-model'));
      $('#adm-news-run').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; const old = b.innerHTML; b.innerHTML = `<span class="spin" style="width:12px;height:12px"></span>Curating…`; try { const r = await api('/admin/news-curate', { method: 'POST', headers: hdr(), body: JSON.stringify({ model: $('#adm-news-model').value || undefined }) }); toast(`${r.curated.picks.length} headlines curated`); loadNews(true); renderAdminNews(hdr); } catch (err) { toast(err.message); b.disabled = false; b.innerHTML = old; } };
    } catch (e) { box.innerHTML = errorBox(e.message); }
  }
  async function renderAdminTv(hdr) {
    const box = $('#adm-tv');
    try {
      const r = await api('/admin/tv', { headers: hdr() });
      const orig = new Map(r.channels.map(c => [c.id, c]));
      const row = (c = {}) => { const first = (c.sources || [])[0] || {}; const relayOnly = (c.sources || []).length > 0 && (c.sources || []).every(x => x.relay); return `<div class="tv-row" data-id="${esc(c.id || '')}"><input type="text" data-f="name" placeholder="Channel name" value="${esc(c.name || '')}" aria-label="Name"><input type="text" data-f="group" placeholder="Group" value="${esc(c.group || '')}" aria-label="Group" style="flex:0 1 120px"><input type="text" data-f="url" placeholder="https://…/playlist.m3u8" value="${esc(first.url || '')}" aria-label="Stream address (.m3u8)" class="mono"><label class="xs dim tv-relay"><input type="checkbox" data-f="relay" ${relayOnly ? 'checked' : ''}> relay only</label><button type="button" class="icon-btn sm" data-del aria-label="Remove">${ic('x')}</button></div>`; };
      box.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px"><p class="xs muted">${r.custom ? `Custom list saved ${fmt.ago(r.updatedAt)}.` : 'Showing the built-in list.'} Each channel is a broadcaster's own HLS address (.m3u8). The player tries it directly first and falls back to this site's relay; tick <b>relay only</b> for broadcasters that block other websites. Find current addresses at <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener">github.com/iptv-org/iptv</a>.</p><div id="tv-rows">${r.channels.map(row).join('')}</div><div class="row-actions"><button class="btn ghost" id="tv-add">Add channel</button><button class="btn" id="tv-save">Save channels</button><button class="btn ghost" id="tv-reset">Reset to defaults</button></div></div>`;
      $('#tv-rows').onclick = e => { const b = e.target.closest('[data-del]'); if (b) b.closest('.tv-row').remove(); };
      $('#tv-add').onclick = () => $('#tv-rows').insertAdjacentHTML('beforeend', row());
      $('#tv-save').onclick = async () => {
        const channels = $$('#tv-rows .tv-row').map(rw => {
          const g = (f) => $(`[data-f="${f}"]`, rw); const o = orig.get(rw.dataset.id); const url = g('url').value.trim(); const relay = g('relay').checked;
          const same = o && o.sources && o.sources[0] && o.sources[0].url === url && (o.sources.every(x => x.relay) === relay);
          return { id: rw.dataset.id || undefined, name: g('name').value.trim(), group: g('group').value.trim() || 'Other', where: o ? o.where : '', referer: o ? o.referer : undefined, sources: same ? o.sources : [{ url, relay }] };
        });
        try { await api('/admin/tv', { method: 'POST', headers: hdr(), body: JSON.stringify({ channels }) }); toast('Channels saved'); loadTv(); renderAdminTv(hdr); } catch (e) { toast(e.message); }
      };
      $('#tv-reset').onclick = async () => { try { await api('/admin/tv', { method: 'POST', headers: hdr(), body: JSON.stringify({ reset: true }) }); toast('Channel list reset'); loadTv(); renderAdminTv(hdr); } catch (e) { toast(e.message); } };
    } catch (e) { box.innerHTML = errorBox(e.message); }
  }
  async function renderAdminStore(hdr) {
    const box = $('#adm-store'); if (!box) return;
    try {
      const st = await api('/admin/store', { headers: hdr() });
      box.innerHTML = `<div class="kv"><dt>Persistent store</dt><dd class="${st.persistent ? 'up' : 'warn-c'}">${esc(st.backend)}${st.persistent ? '' : ' (not persistent)'}</dd><dt>Round trip</dt><dd>${st.roundTrip && st.roundTrip.ok ? `ok · ${st.roundTrip.ms} ms` : `<span class="down">${esc((st.roundTrip && st.roundTrip.error) || st.error || 'failed')}</span>`}</dd><dt>Stored histories</dt><dd>${st.histories}</dd><dt>Daily snapshots</dt><dd>${st.snapshots.length ? `${st.snapshots.length} (latest ${esc(st.snapshots[st.snapshots.length - 1])})` : '0'}</dd><dt>Archived readings</dt><dd>${st.readings}</dd></div>
        <div class="row-actions" style="margin-top:10px"><button class="btn ghost" id="adm-persist">${ic('download')}Store collected data now</button></div>
        <p class="xs muted" style="margin-top:8px">Histories, the daily snapshot, AI readings, curated news, channel lists and encrypted credentials live in the store (${esc(st.backend)}). The nightly job refreshes them; this button runs the same step immediately.</p>`;
      $('#adm-persist').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { const r = await api('/admin/persist', { method: 'POST', headers: hdr() }); toast(`Stored ${r.histories.persisted} histories · snapshot ${r.snapshot.snapshot}`); renderAdminStore(hdr); } catch (err) { toast(err.message); } finally { b.disabled = false; } };
    } catch (e) { box.innerHTML = errorBox(e.message); }
  }

  /* ═════════════════════ REAL-TIME (optional; admin switches it on) ═════════════════════
     Keyed providers are polled through /api/rt/quotes (keys stay on the server, one upstream call per interval for all
     visitors). Crypto streams tick-by-tick from Coinbase's public WebSocket. Every updated value is relabelled with its
     provider and timestamp; instruments without a real-time source keep their normal badge. */
  const rt = { cfg: null, timer: null, ws: null, prev: {}, vals: {}, dirs: {}, painted: 0, queued: false, monAt: 0, wsRetry: 0, count: 0, sockets: {}, sock: {}, gen: 0 };
  function applyRt(id, price, o = {}) {
    const r = state.perf.find(x => x.id === id); if (!r || price == null || !isFinite(price)) return;
    if (rt.prev[id] == null) rt.prev[id] = o.prevClose ?? (r.price != null && r.pct1d != null ? r.price / (1 + r.pct1d / 100) : null);
    const pc = o.prevClose ?? rt.prev[id]; const old = r.price;
    r.price = price; if (pc) { r.pct1d = (price / pc - 1) * 100; r.change = price - pc; }
    r.freshness = o.delayed ? 'delayed' : 'realtime'; r.source = o.source; r.asOf = o.ts || new Date().toISOString(); r.stale = false; r.error = null; r.available = true;
    if (old != null && price !== old) rt.dirs[id] = price > old ? 'up' : 'down';
    rt.vals[id] = { price, o };
    paintRt();
  }
  const reapplyRt = () => { for (const [id, v] of Object.entries(rt.vals)) applyRt(id, v.price, v.o); };
  function paintRt() {
    if (rt.queued) return; rt.queued = true;
    const wait = Math.max(0, 900 - (Date.now() - rt.painted));
    setTimeout(() => requestAnimationFrame(() => {
      rt.queued = false; rt.painted = Date.now();
      renderTicker();
      for (const [id, dir] of Object.entries(rt.dirs)) {
        const r = state.perf.find(x => x.id === id); if (!r) continue;
        const px = $(`[data-rt-px="${id}"]`); if (px) { px.textContent = fmt.px(r.price); px.classList.remove('tick-up', 'tick-down'); void px.offsetWidth; px.classList.add('tick-' + dir); }
        const pc = $(`[data-rt-pct="${id}"]`); if (pc) { const c = isDiff(r) ? r.change : r.pct1d; pc.textContent = isDiff(r) ? fmt.bp(c) : fmt.pct(c); pc.className = tone(c); }
        const ft = $(`[data-rt-foot="${id}"]`); if (ft) ft.textContent = `${r.source} · ${fmt.ago(r.asOf)}`;
        const card = $(`.kpi[data-id="${id}"] .badge`); if (card) card.outerHTML = badge(r);
      }
      rt.dirs = {};
      if (state.view === 'monitor' && Date.now() - rt.monAt > 3000) { rt.monAt = Date.now(); drawMonTable(); }
      const n = Object.keys(rt.vals).length; $('#updated').textContent = n ? `Real-time · ${n} live` : $('#updated').textContent;
    }), wait);
  }
  async function pollRt() {
    if (document.hidden) return;
    try { const r = await api('/rt/quotes', { headers: liveHeaders() }); if (!r.enabled) return stopRt(); r.quotes.forEach(q => applyRt(q.id, q.price, { prevClose: q.prevClose, ts: q.ts, source: q.computed ? 'ICE formula · ' + (q.legs || 'live FX') : q.source, delayed: q.delayed })); } catch (e) { if (/members|sign in/i.test(e.message)) { stopRt(); checkMember(); return; } /* keep last values; next tick retries */ }
  }
  function openStream(cfg) {
    const ids = Object.entries(cfg.products || {}); if (!ids.length || typeof WebSocket === 'undefined') return;
    const byProduct = Object.fromEntries(ids.map(([id, p]) => [p, id]));
    let ws; try { ws = new WebSocket(cfg.url); } catch (e) { return; }
    rt.ws = ws;
    ws.onopen = () => { rt.wsRetry = 0; ws.send(JSON.stringify({ type: 'subscribe', product_ids: ids.map(([, p]) => p), channels: ['ticker'] })); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.type !== 'ticker' || !byProduct[m.product_id]) return; applyRt(byProduct[m.product_id], Number(m.price), { prevClose: Number(m.open_24h) || null, ts: m.time, source: 'coinbase' }); };
    ws.onclose = () => { if (rt.ws !== ws) return; rt.ws = null; const d = Math.min(60000, 2000 * 2 ** rt.wsRetry++); setTimeout(() => { if (rt.cfg && rt.cfg.enabled && !rt.ws) openStream(cfg); }, d); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function stopRt() { clearInterval(rt.timer); rt.timer = null; if (rt.ws) { const w = rt.ws; rt.ws = null; try { w.close(); } catch (e) {} } rt.gen++; for (const w of Object.values(rt.sockets)) { try { w.close(); } catch (e) {} } rt.sockets = {}; rt.sock = {}; rt.vals = {}; document.body.classList.remove('rt-on'); syncTickerTag(); }
  /* Provider WebSockets (admin-enabled). Each speaks its own protocol; ticks go through applyRt like polled quotes. */
  function openProviderSocket(d, gen, retry = 0) {
    if (gen !== rt.gen || typeof WebSocket === 'undefined') return;
    const bySym = {}; for (const [id, sym] of Object.entries(d.symbols)) bySym[sym] = id;
    const syms = Object.values(d.symbols); const st = rt.sock[d.provider] = { status: 'connecting', ticks: 0, mode: d.mode, n: syms.length, at: null, note: d.delayed ? 'real-time feed not on plan: per-second bars from the 15-minute delayed feed' : '' };
    let ws; try { ws = new WebSocket(d.url); } catch (e) { st.status = 'error'; st.note = e.message; return; }
    rt.sockets[d.provider] = ws;
    const tick = (sym, price, ts) => { const id = bySym[sym]; const v = Number(price); if (!id || !isFinite(v) || v <= 0) return; st.ticks++; st.at = Date.now(); st.status = 'live'; applyRt(id, v, { ts: ts ? new Date(ts).toISOString() : new Date().toISOString(), source: d.provider + (d.delayed ? ' ws · 15-min delayed' : ' ws') }); };
    const send = (o) => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
    ws.onopen = () => {
      st.status = 'open';
      if (d.provider === 'finnhub') syms.forEach(x => send({ type: 'subscribe', symbol: x }));
      if (d.provider === 'twelvedata') send({ action: 'subscribe', params: { symbols: syms.join(',') } });
      if (d.provider === 'massive') send(d.auth);
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (d.provider === 'finnhub') { if (m.type === 'trade') for (const t of m.data || []) tick(t.s, t.p, t.t); else if (m.type === 'error') { st.status = 'error'; st.note = m.msg || 'error'; } }
      else if (d.provider === 'twelvedata') { if (m.event === 'price') tick(m.symbol, m.price, m.timestamp ? m.timestamp * 1000 : null); else if (m.status === 'error' || m.event === 'subscribe-status' && m.status !== 'ok') { const f = (m.fails || []).map(x => x && x.symbol || x).filter(Boolean); st.note = f.length ? `not on plan: ${f.join(', ')}` : String(m.message || (m.messages || []).join(' ') || ''); } }
      else for (const x of [].concat(m)) {
        if (d.provider === 'massive') {
          if (x.ev === 'status') { if (x.status === 'auth_success') { st.status = 'subscribed'; send({ action: 'subscribe', params: syms.map(y => (d.delayed ? 'A.' : 'T.') + y).join(',') }); } else if (/fail|max|error|not/i.test(x.status || '')) {
              if (!d.delayed && /not authorized|real-time/i.test(x.message || '') && /\/\/socket\./.test(d.url)) { delete rt.sockets[d.provider]; try { ws.close(); } catch (e) {} openProviderSocket({ ...d, url: d.url.replace('//socket.', '//delayed.'), delayed: true }, gen); return; }
              st.status = 'error'; st.note = x.message || x.status; } }
          else if (x.ev === 'T') tick(x.sym, x.p, x.t);
          else if (x.ev === 'A') tick(x.sym, x.c, x.e);
        } else if (d.provider === 'alpaca') {
          if (x.T === 'success' && x.msg === 'connected') send(d.auth);
          else if (x.T === 'success' && x.msg === 'authenticated') { st.status = 'subscribed'; send({ action: 'subscribe', trades: syms }); }
          else if (x.T === 't') tick(x.S, x.p, x.t);
          else if (x.T === 'error') { st.status = 'error'; st.note = `${x.code || ''} ${x.msg || ''}`.trim(); }
        }
      }
    };
    ws.onclose = () => {
      if (rt.sockets[d.provider] !== ws) return; delete rt.sockets[d.provider];
      if (gen !== rt.gen || st.status === 'error' && /auth|key|limit|max|406|connection limit/i.test(st.note)) { if (st.status !== 'error') st.status = 'closed'; return; }
      st.status = 'reconnecting'; setTimeout(() => openProviderSocket(d, gen, retry + 1), Math.min(60000, 2000 * 2 ** retry));
    };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  async function openProviderSockets() {
    const gen = rt.gen; const list = [...((rt.cfg && rt.cfg.sockets) || [])];
    if (state.admin.token) { try { const r = await api('/admin/rt-sockets', { headers: { authorization: 'Bearer ' + state.admin.token } }); for (const d of r.sockets || []) if (!list.some(x => x.provider === d.provider)) list.push(d); } catch (e) {} }
    for (const d of list) openProviderSocket(d, gen);
  }
  async function startRt() {
    if (SNAP && !apiBase) return; // the embedded snapshot never streams
    try { rt.cfg = await api('/rt/config', { headers: liveHeaders() }); } catch (e) { return; }
    stopRt(); if (!rt.cfg.enabled) { syncTickerTag(); return; }
    document.body.classList.add('rt-on'); syncTickerTag();
    if (rt.cfg.polled.length) { pollRt(); rt.timer = setInterval(pollRt, rt.cfg.intervalSec * 1000); }
    if (rt.cfg.stream) openStream(rt.cfg.stream);
    openProviderSockets();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && rt.timer) pollRt(); });

  /* ───────── Admin: market outlook ───────── */
  async function renderAdminOutlook(hdr) {
    const box = $('#adm-outlook'); if (!box) return;
    box.innerHTML = `<div class="loading"><span class="spin"></span>Loading…</div>`;
    let r; try { r = await api('/intel/outlook'); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const o = r.outlook;
    box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
      <div class="kv"><dt>Last outlook</dt><dd>${o ? `${fmt.time(o.generatedAt)} (${fmt.ago(o.generatedAt)}) · ${o.trigger === 'schedule' ? 'scheduled' : 'manual'}` : 'none yet'}</dd><dt>Model</dt><dd>${o ? esc(o.model) : '—'}</dd><dt>Stance · odds</dt><dd>${o ? `${esc(o.ai.stance)} · ${o.ai.scenarios.map(x => `${x.id} ${x.probability}%`).join(' · ')}` : '—'}</dd><dt>Schedule</dt><dd>${esc(r.schedule)} ${r.schedule === 'daily' ? '(22:00 UTC with the nightly job)' : ''}</dd><dt>Tokens</dt><dd>${o && o.usage ? `${o.usage.input_tokens} in · ${o.usage.output_tokens} out` : '—'}</dd></div>
      <div class="field"><label for="adm-ol-model">Model for this refresh</label><select id="adm-ol-model"></select></div>
      <div class="row-actions"><button class="btn" id="adm-ol-run">${ic('refresh')}Refresh outlook now</button><button class="btn ghost" data-go="intel">View on Intelligence</button></div>
      <p class="xs muted">One model call (about 15–25k input tokens) plus up to five news searches per refresh. Set <b>Market outlook</b> in the credentials panel to off to stop the nightly rewrite. Every run is archived; the card shows how the odds moved.</p></div>`;
    fillModelSelect($('#adm-ol-model'));
    $('#adm-ol-run').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>Writing…'; try { const x = await api('/admin/outlook/refresh', { method: 'POST', headers: hdr(), body: JSON.stringify({ model: $('#adm-ol-model').value || undefined }) }); toast(`Outlook: ${x.outlook.ai.stance} · crash ${x.outlook.ai.scenarios.find(s => s.id === 'crash').probability}%`); renderAdminOutlook(hdr); } catch (err) { toast(err.message); b.disabled = false; b.innerHTML = `${ic('refresh')}Refresh outlook now`; } };
    $$('#adm-outlook [data-go]').forEach(x => x.onclick = () => show(x.dataset.go));
  }

  /* ───────── Admin: anomaly scan schedule ───────── */
  async function renderAdminAnomalies(hdr) {
    const box = $('#adm-anom'); if (!box) return;
    box.innerHTML = `<div class="loading"><span class="spin"></span>Loading…</div>`;
    let r; try { r = await api('/admin/anomalies', { headers: hdr() }); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const MODES = [['live', 'Live', 'Computed when someone opens the page (cached 5 min). Always current; no history of what changed.'], ['daily', 'Daily', 'One stored scan after the US close (22:00 UTC). Everyone sees the same list until the next scan, with new and cleared anomalies marked.'], ['twice-daily', 'Twice daily', 'Adds a 09:15 UTC scan after the Tokyo, Hong Kong and Jakarta closes.']];
    const last = r.log[0];
    const chips = (ids, cls) => ids.length ? ids.map(i => `<span class="an-chip ${cls}">${esc(i)}</span>`).join('') : '<span class="muted">none</span>';
    box.innerHTML = `<div class="anx">
      <div class="anx-modes" role="radiogroup">${MODES.map(([k, l, d]) => `<label class="anx-mode ${r.mode === k ? 'on' : ''}"><input type="radio" name="anx-mode" value="${k}" ${r.mode === k ? 'checked' : ''}><b>${l}</b><span>${d}</span></label>`).join('')}</div>
      <div class="row-actions"><button class="btn" id="anx-save">Save schedule</button><button class="btn ghost" id="anx-run">${ic('refresh')}Scan now</button><span class="xs muted" style="align-self:center">${r.nextScan ? `Next scheduled scan ${esc(fmt.time(r.nextScan))}` : 'No schedule: the list is computed live.'}</span></div>
      <div class="kv"><dt>Last stored scan</dt><dd>${last ? `${esc(fmt.time(last.at))} · ${last.trigger === 'admin' ? 'by admin' : 'scheduled'} · ${last.count} flagged` : 'none yet'}</dd><dt>New in that scan</dt><dd>${last ? chips(last.added, 'add') : '—'}</dd><dt>Cleared</dt><dd>${last ? chips(last.cleared, 'clr') : '—'}</dd><dt>Stronger</dt><dd>${last ? chips(last.escalated, 'esc') : '—'}</dd></div>
      ${r.log.length ? `<div class="tbl"><table class="t"><thead><tr><th>Scan (UTC)</th><th>Trigger</th><th class="num">Flagged</th><th>New</th><th>Cleared</th><th>Top</th></tr></thead><tbody>${r.log.map(x => `<tr><td class="mono nowrap">${esc(fmt.time(x.at))}</td><td class="xs">${x.trigger === 'admin' ? 'admin' : 'schedule'}</td><td class="num mono">${x.count}</td><td class="xs">${x.added.join(', ') || '—'}</td><td class="xs muted">${x.cleared.join(', ') || '—'}</td><td class="xs muted">${x.items.slice(0, 4).map(i => `${esc(i.id)} ${Math.max(Math.abs(i.z1), Math.abs(i.z5)).toFixed(1)}σ`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="xs muted">Detection: for each instrument, the latest 1-day and 5-day change is compared with its own daily changes over about the last year (log returns for prices, basis-point changes for yields and spreads). A move of 2σ or more, or 10-day volatility at twice its 1-year level, is flagged; 3σ is high and 4σ extreme. Scans use daily closes, so a scan reads the latest close (and today's price while markets are open). Each stored scan is two storage writes.</p>
    </div>`;
    $$('#adm-anom input[name="anx-mode"]').forEach(i => i.onchange = () => $$('#adm-anom .anx-mode').forEach(l => l.classList.toggle('on', $('input', l).checked)));
    $('#anx-save').onclick = async () => { const v = $('#adm-anom input[name="anx-mode"]:checked').value; try { await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify({ ANOMALY_SCHEDULE: v }) }); toast(v === 'live' ? 'Anomalies are live' : 'Schedule saved'); if (v !== 'live' && !r.log.length) await api('/admin/anomalies/scan', { method: 'POST', headers: hdr() }); renderAdminAnomalies(hdr); } catch (e) { toast(e.message); } };
    $('#anx-run').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>Scanning…'; try { const x = await api('/admin/anomalies/scan', { method: 'POST', headers: hdr() }); toast(`${x.count} flagged · ${x.changes.added.length} new · ${x.changes.cleared.length} cleared`); renderAdminAnomalies(hdr); } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Scan now'; } };
  }

  /* ───────── Admin: overview ───────── */
  async function renderAdminHome(hdr) {
    const box = $('#adm-home'); if (!box) return; const a = state.admin;
    const k = a.keys || { fields: [] }; const st = a.status || {};
    const grp = (g) => k.fields.filter(f => f.group === g && f.secret !== false); const set = (g) => grp(g).filter(f => f.configured).length;
    const val = (key) => { const f = k.fields.find(x => x.key === key); return f ? (f.value || f.placeholder || '') : ''; };
    let mem = null; try { mem = await api('/admin/members', { headers: hdr() }); } catch (e) { mem = null; }
    const act = mem ? mem.members.filter(m => m.active).length : null;
    const rtOn = val('REALTIME_MODE') === 'on';
    const tile = (secKey, icon, label, value, note, tone = '') => `<button type="button" class="adm-tile" data-go-sec="${secKey}"><span class="adm-tile-ic">${ic(icon)}</span><span class="adm-tile-l">${esc(label)}</span><b class="${tone}">${value}</b><small>${note}</small></button>`;
    const store = st.store || {};
    box.innerHTML = `<div class="adm-hero"><div><h2>Admin console</h2><p class="dim sm">Everything that costs money or changes what visitors see lives here. Choose a section ${matchMedia('(max-width: 900px)').matches ? 'from the tabs above' : 'on the left'}.</p></div></div>
      <div class="adm-tiles">
        ${tile('members', 'users', 'Members', act == null ? '—' : `${act} active`, mem ? `${mem.members.length} total · sign in with a PIN` : 'Could not read members')}
        ${tile('realtime', 'pulse', 'Real-time for members', rtOn ? 'On' : 'Off', rtOn ? `every ${esc(val('REALTIME_INTERVAL') || '10')} s · visitors stay delayed` : 'everyone sees delayed prices', rtOn ? 'up' : 'muted')}
        ${tile('keys', 'key', 'Market data keys', `${set('Real-time') + set('Data')} set`, `${set('AI')} AI · ${set('Search')} search keys`)}
        ${tile('usage', 'db', 'Usage & cost', 'Open', 'API calls, model tokens, estimated $')}
        ${tile('ai', 'intel', 'AI reading', esc(val('AI_AUTO_REFRESH') || 'off'), `news curation: ${esc(val('NEWS_AI_CURATION') || 'off')}`)}
        ${tile('data', 'layers', 'Storage', esc(store.backend || st.backend || '—'), store.persistent === false ? '<span class="down">not persistent</span>' : 'persistent')}
      </div>
      <div class="adm-roles"><div class="field"><label>Who sees what</label></div><div class="tbl"><table class="t"><thead><tr><th></th><th>Visitor</th><th>Member</th><th>Admin</th></tr></thead><tbody>
        <tr><td>How they get in</td><td>Open the site</td><td>PIN (Sign in, top right)</td><td>Admin token at #admin</td></tr>
        <tr><td>Prices and ticker</td><td>Delayed (free public sources)</td><td>Live when real-time is on</td><td>Live when real-time is on</td></tr>
        <tr><td>Paid provider calls</td><td>Never</td><td>Shared, at the real-time interval</td><td>Same, plus admin-only streams</td></tr>
        <tr><td>Live TV</td><td>Direct streams</td><td>All channels, including relayed ones</td><td>All channels</td></tr>
        <tr><td>AI reading</td><td>Reads the stored reading</td><td>Reads the stored reading</td><td>Refreshes it</td></tr>
      </tbody></table></div></div>`;
    $$('#adm-home [data-go-sec]').forEach(b => b.onclick = () => state.admin.openSec(b.dataset.goSec));
  }

  /* ───────── Admin: members (PIN sign-in) ───────── */
  async function renderAdminMembers(hdr) {
    const box = $('#adm-members'); if (!box) return;
    box.innerHTML = `<div class="loading"><span class="spin"></span>Loading members…</div>`;
    let r; try { r = await api('/admin/members', { headers: hdr() }); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const call = async (body, okMsg) => { try { const x = await api('/admin/members', { method: 'POST', headers: hdr(), body: JSON.stringify(body) }); toast(okMsg); r.members = x.members; draw(); return true; } catch (e) { toast(e.message); return false; } };
    const gen = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1e6).padStart(6, '0'); };
    let editing = null, confirmDel = null;
    const draw = () => {
      const M = r.members;
      box.innerHTML = `<div class="mem">
        ${r.liveOn ? '' : `<div class="callout warn">${ic('info')}<div>Real-time is off, so members also see delayed prices for now. Members still get every TV channel. <button type="button" class="linkish" data-go-sec="realtime">Real-time settings</button></div></div>`}
        <form class="mem-add" id="mem-add" autocomplete="off"><div class="field"><label for="mem-name">Name</label><input id="mem-name" type="text" maxlength="40" placeholder="e.g. Rina"></div>
          <div class="field"><label for="mem-pin">PIN (6–10 digits)</label><div class="inline"><input id="mem-pin" type="text" inputmode="numeric" maxlength="10" placeholder="123456" autocomplete="off"><button type="button" class="btn ghost" id="mem-gen">Generate</button></div></div>
          <button class="btn" type="submit">${ic('users')}Add member</button></form>
        <p class="xs muted">Share the PIN with the member privately. It is stored only as a salted, keyed hash and cannot be shown again; set a new one if it is lost. Each PIN must be unique. Five wrong PINs from one address pause sign-in for 15 minutes.</p>
        <div class="tbl"><table class="t mem-t"><thead><tr><th>Member</th><th>Status</th><th>Last sign-in</th><th class="num">Sign-ins</th><th class="num">Actions</th></tr></thead><tbody>
          ${M.length ? M.map(m => `<tr data-id="${esc(m.id)}"><td><span class="mb-av sm">${esc(m.name.charAt(0).toUpperCase())}</span><b>${esc(m.name)}</b><div class="xs muted">added ${esc(fmt.date(m.createdAt))}</div></td>
            <td><span class="badge ${m.active ? 'measured' : ''}">${m.active ? 'active' : 'disabled'}</span></td><td class="xs">${m.lastLogin ? `${esc(fmt.time(m.lastLogin))}<div class="muted">${esc(fmt.ago(m.lastLogin))}</div>` : '<span class="muted">never</span>'}</td><td class="num mono">${m.logins}</td>
            <td class="num"><div class="mem-acts">${editing === m.id ? `<input type="text" inputmode="numeric" maxlength="10" class="mem-newpin" placeholder="New PIN" value="${gen()}"><button type="button" class="btn sm" data-act="pin">Save PIN</button><button type="button" class="btn ghost sm" data-act="cancel">Cancel</button>` : confirmDel === m.id ? `<span class="xs down">Remove ${esc(m.name)}?</span><button type="button" class="btn sm danger" data-act="delete">Remove</button><button type="button" class="btn ghost sm" data-act="cancel">Keep</button>` : `<button type="button" class="btn ghost sm" data-act="edit">New PIN</button><button type="button" class="btn ghost sm" data-act="toggle">${m.active ? 'Disable' : 'Enable'}</button><button type="button" class="btn ghost sm" data-act="revoke" title="End all of this member's sessions">Sign out everywhere</button><button type="button" class="icon-btn sm" data-act="ask" aria-label="Remove ${esc(m.name)}">${ic('x')}</button>`}</div></td></tr>`).join('') : `<tr><td colspan="5" class="dim">No members yet. Add the first one above.</td></tr>`}
        </tbody></table></div></div>`;
      $('#mem-gen').onclick = () => { $('#mem-pin').value = gen(); };
      $('#mem-add').onsubmit = async (e) => { e.preventDefault(); const name = $('#mem-name').value.trim(), pin = $('#mem-pin').value.trim(); if (!name) return toast('Enter a name'); if (!/^\d{6,10}$/.test(pin)) return toast('PIN must be 6 to 10 digits'); if (await call({ action: 'add', name, pin }, `${name} added. Share the PIN ${pin} privately.`)) { /* drawn */ } };
      $$('#adm-members [data-go-sec]').forEach(b => b.onclick = () => state.admin.openSec(b.dataset.goSec));
      $$('#adm-members .mem-t tr[data-id]').forEach(tr => tr.onclick = async (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return; const id = tr.dataset.id; const m = r.members.find(x => x.id === id); const act = b.dataset.act;
        if (act === 'edit') { editing = id; confirmDel = null; draw(); const i = $(`#adm-members tr[data-id="${id}"] .mem-newpin`); if (i) { i.focus(); i.select(); } return; }
        if (act === 'ask') { confirmDel = id; editing = null; draw(); return; }
        if (act === 'cancel') { editing = confirmDel = null; draw(); return; }
        if (act === 'pin') { const pin = $('.mem-newpin', tr).value.trim(); if (!/^\d{6,10}$/.test(pin)) return toast('PIN must be 6 to 10 digits'); editing = null; await call({ action: 'update', id, pin }, `New PIN for ${m.name}: ${pin}. Their old sessions have ended.`); return; }
        if (act === 'toggle') { await call({ action: 'update', id, active: !m.active }, m.active ? `${m.name} disabled and signed out` : `${m.name} enabled`); return; }
        if (act === 'revoke') { await call({ action: 'revoke', id }, `${m.name} signed out on every device`); return; }
        if (act === 'delete') { confirmDel = null; await call({ action: 'delete', id }, `${m.name} removed`); }
      });
    };
    draw();
  }

  /* ───────── Admin: usage meter, token use and API logs ───────── */
  const us = { days: 7, svc: 'all', errs: false, q: '', limit: 60, metric: 'cost' };
  async function renderAdminUsage(hdr) {
    const box = $('#adm-usage'); if (!box) return;
    if (SNAP && !apiBase) { box.innerHTML = `<p class="dim">Usage is measured on the live server. Open the deployed terminal to see it.</p>`; return; }
    box.innerHTML = `<div class="loading"><span class="spin"></span>Reading usage…</div>`;
    let r; try { r = await api(`/admin/usage?days=${us.days}`, { headers: hdr() }); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const usd = (v) => v == null ? '—' : v === 0 ? '$0' : v < 0.01 ? '<$0.01' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: v < 10 ? 3 : 2 });
    const n = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-US');
    const tk = (v) => !v ? '0' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(v);
    const kb = (v) => !v ? '—' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' MB' : v >= 1e3 ? Math.round(v / 1e3) + ' KB' : v + ' B';
    const S = r.services; const tot = S.reduce((t, x) => ({ n: t.n + x.n, err: t.err + x.err, cost: t.cost + x.cost, tin: t.tin + x.tin + x.tcw + x.tcr, tout: t.tout + x.tout }), { n: 0, err: 0, cost: 0, tin: 0, tout: 0 });
    const ext = S.filter(x => x.svc !== 'vercel-fn' && x.svc !== 'vercel-blob'); const extN = ext.reduce((t, x) => t + x.n, 0), extE = ext.reduce((t, x) => t + x.err, 0);
    const m = r.month; const proj = m.projected != null ? m.projected + m.planFees : null;
    const range = us.days === 1 ? 'today' : `last ${us.days} days`;
    const svcName = Object.fromEntries(S.map(x => [x.svc, x.name]));
    const tags = (o) => Object.entries(o || {}).map(([k, v]) => `${esc(k)} ×${v}`).join(', ');
    const logs = () => r.logs.filter(l => (us.svc === 'all' || l.svc === us.svc) && (!us.errs || !l.st || l.st >= 400) && (!us.q || (l.op + ' ' + (l.tag || '') + ' ' + (l.err || '') + ' ' + (l.model || '')).toLowerCase().includes(us.q.toLowerCase())));
    const logRows = () => { const L = logs(); return { L, html: L.slice(0, us.limit).map(l => `<tr class="${!l.st || l.st >= 400 ? 'us-bad' : ''}"><td class="mono nowrap">${esc(l.t.slice(5, 19).replace('T', ' '))}</td><td>${esc(svcName[l.svc] || l.svc)}</td><td class="mono us-op">${esc(l.op)}${l.model ? `<span class="xs muted"> · ${esc(l.model)}</span>` : ''}</td><td class="num mono ${!l.st || l.st >= 400 ? 'down' : ''}">${l.st || 'ERR'}</td><td class="num mono">${n(l.ms)}</td><td class="num mono">${kb(l.b)}</td><td class="num mono">${l.tin != null ? `${tk(l.tin + (l.tcr || 0) + (l.tcw || 0))} / ${tk(l.tout)}` : l.units > 1 ? l.units + ' cr' : ''}</td><td class="num mono">${l.cost ? usd(l.cost) : ''}</td><td class="xs muted us-note">${esc(l.tag || '')}${l.err ? ` <span class="down">${esc(l.err)}</span>` : ''}</td></tr>`).join('') }; };
    const P = r.prices; const planKeys = Object.keys(r.defaults.plans);
    box.innerHTML = `<div class="us">
      <div class="us-bar"><div class="seg" id="us-days">${[[1, 'Today'], [7, '7D'], [30, '30D']].map(([d, l]) => `<button type="button" data-d="${d}" class="${us.days === d ? 'active' : ''}">${l}</button>`).join('')}</div>
        <span class="xs muted">${esc(r.from)} → ${esc(r.to)} UTC</span><span style="flex:1"></span>
        <button class="btn ghost" id="us-refresh">${ic('refresh')}Refresh</button><button class="btn ghost" id="us-save">${ic('download')}Save counts now</button></div>
      <div class="us-kpis">
        <div><span>Estimated usage cost</span><b>${usd(tot.cost)}</b><small>${range}, metered calls and tokens</small></div>
        <div><span>Month to date</span><b>${usd(m.usage)}</b><small>since ${esc(m.start)}${m.planFees ? ` · plus ${usd(m.planFees)} plan fees` : ''}</small></div>
        <div><span>Projected this month</span><b>${proj != null ? usd(proj) : '—'}</b><small>${proj != null ? `usage pace × ${m.daysInMonth} days${m.planFees ? ' + plan fees' : ''}` : 'needs a few hours of data'}</small></div>
        <div><span>External API calls</span><b>${n(extN)}</b><small>${extE ? `<span class="down">${n(extE)} failed (${(extE / Math.max(1, extN) * 100).toFixed(1)}%)</span>` : 'no failures'}</small></div>
        <div><span>Model tokens</span><b>${tk(tot.tin + tot.tout)}</b><small>${tk(tot.tin)} in · ${tk(tot.tout)} out</small></div>
        <div><span>Function invocations</span><b>${n((S.find(x => x.svc === 'vercel-fn') || {}).n)}</b><small>CDN cache hits are not counted (they never reach the function)</small></div>
      </div>
      <div class="us-chart-h"><span class="sm">Daily ${us.metric === 'cost' ? 'estimated cost' : 'calls'} by service</span><div class="seg" id="us-metric"><button type="button" data-m="cost" class="${us.metric === 'cost' ? 'active' : ''}">Cost</button><button type="button" data-m="calls" class="${us.metric === 'calls' ? 'active' : ''}">Calls</button></div></div>
      <div id="us-chart" class="us-chart"></div>
      <div class="tbl"><table class="t us-svc"><thead><tr><th>Service</th><th class="us-hide">Kind</th><th class="num">Calls</th><th class="num">Failed</th><th class="num us-hide">Avg ms</th><th class="num us-hide">Data</th><th class="num">Tokens in / out</th><th class="num">Est. cost</th></tr></thead><tbody>
        ${S.length ? S.map((x, i) => `<tr class="us-row" data-i="${i}"><td><button type="button" class="us-tog" aria-expanded="false">${ic('chev')}</button><b>${esc(x.name)}</b></td><td class="xs muted us-hide">${esc(x.kind)}</td><td class="num mono">${n(x.n)}${x.unit === 'credits' && x.units !== x.n ? `<span class="xs muted"> · ${n(x.units)} cr</span>` : ''}</td><td class="num mono ${x.err ? 'down' : 'muted'}">${n(x.err)}</td><td class="num mono us-hide">${n(x.n ? x.ms / x.n : 0)}</td><td class="num mono us-hide">${kb(x.bytes)}</td><td class="num mono">${x.tin || x.tout ? `${tk(x.tin + x.tcw + x.tcr)} / ${tk(x.tout)}` : '—'}</td><td class="num mono"><b>${usd(x.cost)}</b></td></tr>
${x.ops.sort((a, b) => b.cost - a.cost || b.n - a.n).map(o => `<tr class="us-op-row" data-for="${i}" hidden><td class="mono us-op">${esc(o.op)}${o.model ? ` <span class="xs muted">${esc(o.model)}</span>` : ''}${Object.keys(o.tags || {}).length ? `<div class="xs muted">${tags(o.tags)}</div>` : ''}</td><td class="us-hide"></td><td class="num mono">${n(o.n)}</td><td class="num mono ${o.err ? 'down' : 'muted'}">${n(o.err)}</td><td class="num mono us-hide">${n(o.avgMs)}</td><td class="num mono us-hide"></td><td class="num mono">${o.tin || o.tout ? `${tk(o.tin + o.tcw + o.tcr)} / ${tk(o.tout)}` : ''}</td><td class="num mono">${usd(o.cost)}</td></tr>`).join('')}`).join('') : `<tr><td colspan="8" class="dim">Nothing counted yet in this range.</td></tr>`}
      </tbody></table></div>
      ${r.tokens.length ? `<div><div class="field"><label>Model token use</label></div><div class="tbl"><table class="t"><thead><tr><th>Model</th><th class="num">Calls</th><th class="num">Input</th><th class="num">Cache write</th><th class="num">Cache read</th><th class="num">Output</th><th class="num">Est. cost</th><th>Used by</th></tr></thead><tbody>${r.tokens.map(t => `<tr><td class="mono">${esc(t.model)}</td><td class="num mono">${n(t.calls)}</td><td class="num mono">${tk(t.tin)}</td><td class="num mono">${tk(t.tcw)}</td><td class="num mono">${tk(t.tcr)}</td><td class="num mono">${tk(t.tout)}</td><td class="num mono"><b>${usd(t.cost)}</b></td><td class="xs muted">${tags(t.tags)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
      <div>
        <div class="us-bar"><span class="sm">API log</span><select id="us-svc" aria-label="Service"><option value="all">All services</option>${[...new Set(r.logs.map(l => l.svc))].map(s => `<option value="${esc(s)}" ${us.svc === s ? 'selected' : ''}>${esc(svcName[s] || s)}</option>`).join('')}</select>
          <label class="us-chk"><input type="checkbox" id="us-errs" ${us.errs ? 'checked' : ''}>Failures only</label><input type="search" id="us-q" placeholder="Filter: operation, feature, model, error" value="${esc(us.q)}"><span style="flex:1"></span><button class="btn ghost" id="us-csv">${ic('download')}CSV</button></div>
        <div class="tbl scroll-y us-log"><table class="t"><thead><tr><th>Time (UTC)</th><th>Service</th><th>Operation</th><th class="num">Status</th><th class="num">ms</th><th class="num">Size</th><th class="num">Tokens / credits</th><th class="num">Cost</th><th>Feature / error</th></tr></thead><tbody id="us-log"></tbody></table></div>
        <div class="row-actions" id="us-more-w"></div>
        <p class="xs muted">The log keeps the latest 250 external calls per server instance per day (storage reads and function invocations are counted above but only failures are logged). Keys, tickers and query strings are never written to the log.</p>
      </div>
      <details class="us-rates"><summary class="sm dim">Rates used for the estimate</summary>
        <div class="us-rates-b">
          <div><div class="field"><label>Monthly plan fees (USD, added to the projection)</label></div><div class="us-grid">${planKeys.map(k => `<label><span>${esc((r.services.find(x => x.svc === k) || {}).name || ({ vercel: 'Vercel plan', anthropic: 'Anthropic (AI)', exa: 'Exa search', parallel: 'Parallel search', massive: 'Massive', alpaca: 'Alpaca', finnhub: 'Finnhub', twelvedata: 'Twelve Data' })[k] || k)}</span><input type="number" min="0" step="0.01" data-plan="${k}" value="${P.plans[k] || ''}" placeholder="0"></label>`).join('')}</div></div>
          <div><div class="field"><label>Metered rates (USD)</label></div><div class="us-grid">
            <label><span>Exa, per search</span><input type="number" min="0" step="0.0001" data-unit="exa" value="${P.perUnit.exa}"></label>
            <label><span>Parallel, per search</span><input type="number" min="0" step="0.0001" data-unit="parallel" value="${P.perUnit.parallel}"></label>
            <label><span>Function invocations, per million</span><input type="number" min="0" step="0.01" data-unit="vercel-fn" data-scale="1e6" value="${+(P.perUnit['vercel-fn'] * 1e6).toFixed(4)}"></label>
            <label><span>Blob writes and lists, per million</span><input type="number" min="0" step="0.01" data-unit="blob-advanced" data-scale="1e6" value="${+(P.perUnit['blob-advanced'] * 1e6).toFixed(4)}"></label>
            <label><span>Blob reads, per million</span><input type="number" min="0" step="0.01" data-unit="blob-simple" data-scale="1e6" value="${+(P.perUnit['blob-simple'] * 1e6).toFixed(4)}"></label>
          </div></div>
          <div><div class="field"><label>Anthropic, per million tokens (input · 5-min cache write · cache read · output)</label></div><div class="tbl"><table class="t"><tbody>${Object.entries(P.anthropic).map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td class="num mono">$${v.in} · $${v.cw} · $${v.cr} · $${v.out}${v.long ? `<div class="xs muted">over ${tk(v.long.over)} prompt tokens: $${v.long.in} · $${v.long.cw} · $${v.long.cr} · $${v.long.out}</div>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="row-actions"><button class="btn" id="us-rates-save">Save rates</button><span class="xs muted" style="align-self:center">List prices as of 28 Oct 2026 from Anthropic, Exa, Parallel and Vercel. Free plans include an allowance, so a metered estimate can be above what you are billed.</span></div>
        </div></details>
      <p class="xs muted us-meter">${r.meter.enabled ? `Counting on. Each server instance saves its counts every ${r.meter.flushMin} min when something changed (and right after a model call); ${n(r.meter.writesThisMonth)} saves so far this month. This instance started ${fmt.ago(r.meter.instanceStarted)}${r.meter.lastFlush ? `, last saved ${fmt.ago(r.meter.lastFlush)}` : ''}. Counts from an instance that shut down before its next save are lost, so totals are a floor.` : 'Counting is off (Usage meter in the credentials panel).'} ${r.meter.persistent ? '' : '<span class="down">No persistent store: counts reset with the server.</span>'} Estimates only: provider dashboards and Vercel's usage page are the billing record.</p>
    </div>`;
    const drawLog = () => { const { L, html } = logRows(); $('#us-log').innerHTML = html || `<tr><td colspan="9" class="dim">No calls match.</td></tr>`; $('#us-more-w').innerHTML = L.length > us.limit ? `<button class="btn ghost" id="us-more">Show more (${L.length - us.limit} left)</button>` : ''; const mb = $('#us-more'); if (mb) mb.onclick = () => { us.limit += 100; drawLog(); }; };
    drawLog();
    const T = tok(); const C = series(T); const svcs = S.filter(x => us.metric === 'cost' ? x.cost > 0 : x.n > 0).map(x => x.svc);
    if (r.daily.length && svcs.length) {
      const byDay = r.daily.map(d => d.day);
      chart('#us-chart', { grid: { left: 8, right: 8, top: 26, bottom: 22, containLabel: true }, legend: { top: 0, left: 0, textStyle: { color: T.fg2, fontSize: 11 * fs() }, itemWidth: 10, itemHeight: 10, type: 'scroll' }, tooltip: { trigger: 'axis', valueFormatter: v => us.metric === 'cost' ? (v && v < 0.01 ? '$' + v.toPrecision(2) : usd(v)) : n(v) },
        xAxis: { type: 'category', data: byDay.map(d => d.slice(5)), ...axis(T), splitLine: { show: false } }, yAxis: { type: 'value', ...axis(T), axisLabel: { color: T.fg3, fontSize: 10.5 * fs(), formatter: v => us.metric === 'cost' ? (v === 0 ? '$0' : v < 0.01 ? '$' + v.toPrecision(2) : '$' + (v < 1 ? v.toFixed(2) : v.toFixed(0))) : n(v) } },
        series: svcs.map((s, i) => ({ name: svcName[s] || s, type: 'bar', stack: 'u', barMaxWidth: 26, itemStyle: { color: C[i % C.length], borderRadius: i === svcs.length - 1 ? [3, 3, 0, 0] : 0 }, data: r.daily.map(d => us.metric === 'cost' ? +(d.bySvc[s] || 0).toFixed(5) : (d.calls && d.calls[s]) || 0) })) });
    } else $('#us-chart').innerHTML = `<div class="empty">${ic('info')}Nothing to chart yet: ${us.metric === 'cost' ? 'no metered cost in this range' : 'no calls in this range'}.</div>`;
    $$('#us-days button').forEach(b => b.onclick = () => { us.days = Number(b.dataset.d); us.limit = 60; renderAdminUsage(hdr); });
    $$('#us-metric button').forEach(b => b.onclick = () => { us.metric = b.dataset.m; renderAdminUsage(hdr); });
    $('#us-refresh').onclick = () => renderAdminUsage(hdr);
    $('#us-save').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { await api('/admin/usage/flush', { method: 'POST', headers: hdr() }); toast('Counts saved'); renderAdminUsage(hdr); } catch (err) { toast(err.message); b.disabled = false; } };
    $$('.us-svc .us-row').forEach(tr => tr.onclick = () => { const subs = $$(`.us-op-row[data-for="${tr.dataset.i}"]`); const open = !!(subs[0] && subs[0].hidden); subs.forEach(x => x.hidden = !open); tr.querySelector('.us-tog').setAttribute('aria-expanded', String(open)); tr.classList.toggle('open', open); });
    $('#us-svc').onchange = (e) => { us.svc = e.target.value; us.limit = 60; drawLog(); };
    $('#us-errs').onchange = (e) => { us.errs = e.target.checked; drawLog(); };
    $('#us-q').oninput = (e) => { us.q = e.target.value; drawLog(); };
    $('#us-csv').onclick = () => csvDownload(`api-log-${r.to}.csv`, logs().map(l => ({ time: l.t, service: l.svc, operation: l.op, status: l.st, ms: l.ms, bytes: l.b, model: l.model || '', tokens_in: l.tin ?? '', cache_write: l.tcw ?? '', cache_read: l.tcr ?? '', tokens_out: l.tout ?? '', credits: l.units, cost_usd: l.cost, feature: l.tag || '', error: l.err || '' })));
    $('#us-rates-save').onclick = async () => { const plans = {}, perUnit = {}; $$('#adm-usage [data-plan]').forEach(i => { plans[i.dataset.plan] = i.value === '' ? '' : Number(i.value); }); $$('#adm-usage [data-unit]').forEach(i => { if (i.value !== '') perUnit[i.dataset.unit] = Number(i.value) / (i.dataset.scale ? Number(i.dataset.scale) : 1); }); try { await api('/admin/usage/prices', { method: 'POST', headers: hdr(), body: JSON.stringify({ plans, perUnit }) }); toast('Rates saved; new calls use them'); renderAdminUsage(hdr); } catch (e) { toast(e.message); } };
  }

  async function renderAdminRealtime(hdr) {
    const box = $('#adm-rt'); if (!box) return;
    const SHORT = { massive: 'Massive', alpaca: 'Alpaca', finnhub: 'Finnhub', twelvedata: 'Twelve Data', coinbase: 'Coinbase', formula: 'ICE formula' };
    const pname = (p) => SHORT[p] || p || '';
    let r; try { r = await api('/admin/realtime', { headers: hdr() }); } catch (e) { box.innerHTML = errorBox(e.message); return; }
    const st = r.settings; const routing = r.routing;
    const prio = routing.priority.slice(); const ov = { ...routing.overrides };
    const scan = routing.scan; const live = new Map(((r.probe && r.probe.quotes) || []).map(q => [q.id, q]));
    const PROVS = ['massive', 'alpaca', 'finnhub', 'twelvedata'];
    const cell = (id, p) => {
      const res = scan && scan.results[id] && scan.results[id][p];
      if (!st.configured[p]) return '<span class="rt-c na" title="No key saved">·</span>';
      if (!res) return '<span class="rt-c" title="Not scanned yet">?</span>';
      if (res.ok === true) return `<span class="rt-c ok ${res.delayed ? 'dl' : ''}" title="${res.delayed ? 'Delayed in your plan' : 'Priced'}: ${esc(String(res.price))}">${res.delayed ? 'D' : '✓'}</span>`;
      if (res.ok === null) return `<span class="rt-c err" title="${esc(res.error || 'error')}">!</span>`;
      return `<span class="rt-c no" title="${esc(res.error || 'not in plan')}">✕</span>`;
    };
    const draw = () => {
      box.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
        <div class="kv"><dt>Status</dt><dd class="${st.enabled ? 'up' : 'muted'}">${st.enabled ? 'on' : 'off'} · every ${st.intervalSec} s</dd><dt>Crypto stream</dt><dd>${esc(st.crypto)}</dd>${r.probe ? Object.entries(r.probe.providers || {}).map(([p, x]) => `<dt>${esc(pname(p))}</dt><dd class="${x.ok ? 'up' : 'down'}">${x.ok ? `${x.priced} priced` : esc(String(x.error || 'error').slice(0, 60))}</dd>`).join('') : ''}${r.probe && r.probe.unpriced && r.probe.unpriced.length ? `<dt>Not live</dt><dd class="muted">${r.probe.unpriced.join(', ')}</dd>` : ''}</div>
        <div id="rt-ws-status"></div>
        <div><div class="field"><label>Provider priority</label></div><div class="rt-prio">${prio.map((p, i) => `<span class="rt-p ${st.configured[p] ? '' : 'off'}"><b>${i + 1}</b>${esc(pname(p))}${st.configured[p] ? '' : ' <i>no key</i>'}<button type="button" class="icon-btn sm" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button type="button" class="icon-btn sm" data-dn="${i}" ${i === prio.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></span>`).join('')}</div>
        <p class="xs muted" style="margin-top:6px">Each instrument uses the first provider in this order that your plan covers; anything a provider can't price falls through to the next one automatically.</p></div>
        <div class="row-actions"><button class="btn ghost" id="rt-scan">${ic('pulse')}Scan my plans</button><span class="xs muted" style="align-self:center">${scan ? `Last scan ${fmt.ago(scan.at)}: ${Object.values(scan.summary).map(x => `${esc(x.name.split(' (')[0])} ${x.priced}/${x.of}${x.pending ? ` (${x.pending} left to test: your plan allows a few per minute, scan again in a minute)` : ''}`).join(' · ')}` : 'Not scanned yet. Tests every instrument against every saved key.'}</span></div>
        <div class="tbl rt-tbl"><table class="t"><thead><tr><th>Instrument</th><th>Live now</th>${PROVS.map(p => `<th class="rt-h">${esc(pname(p))}</th>`).join('')}<th>Source</th></tr></thead><tbody>${r.coverage.map(c => { const q = live.get(c.id); const opts = ['auto', ...c.options.filter(o => o === 'coinbase' || o === 'formula' || st.configured[o]), 'off']; return `<tr><td class="mono"><b>${c.id}</b>${c.leg ? ' <span class="xs muted">DXY leg</span>' : c.id === 'DXY' ? ' <span class="xs muted">computed</span>' : ''}</td><td>${c.provider ? `<span class="${q || c.provider === 'coinbase' ? 'up' : 'muted'}">${esc(pname(c.provider))}</span>${q ? ` <span class="xs muted">${fmt.px(q.price)}</span>` : ''}` : '<span class="muted">—</span>'}</td>${PROVS.map(p => `<td class="rt-h">${RT_OPTS(c, p) ? cell(c.id, p) : '<span class="rt-c na">·</span>'}</td>`).join('')}<td><select data-ov="${c.id}" aria-label="Source for ${c.id}">${opts.map(o => `<option value="${o}" ${(ov[c.id] || 'auto') === o ? 'selected' : ''}>${o === 'auto' ? 'Auto' : o === 'off' ? 'Off' : esc(pname(o))}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>
        <p class="xs muted">✓ priced in your plan · D delayed in your plan · ✕ not in your plan · · not offered or no key. Index levels come only from providers that publish the index itself; ETFs are never shown in place of an index. The US Dollar Index is not licensed to these providers, so it is computed with ICE's published weights from six live FX rates (EUR, JPY, GBP, CAD, SEK, CHF) and is live only when all six are. WTI, Brent, natural gas and copper need a paid Finnhub plan (OANDA prices) or a paid Twelve Data plan; until a scan shows ✓ they keep their delayed futures source.</p>
        <div class="row-actions"><button class="btn" id="rt-save">Save routing</button></div>
        <details><summary class="sm dim" style="cursor:pointer">Provider guide and prices</summary><div class="tbl" style="margin-top:8px"><table class="t"><thead><tr><th>Provider</th><th>Covers here</th><th>Cost</th></tr></thead><tbody>
          <tr><td>Coinbase public WebSocket</td><td>BTC, ETH, SOL (tick-by-tick)</td><td>Free, no key</td></tr>
          <tr><td>Alpaca Basic</td><td>US ETFs (IEX venue), crypto</td><td>Free · Algo Trader Plus $99/mo for all US exchanges</td></tr>
          <tr><td>Finnhub</td><td>US ETFs free; FX, gold, silver, indices on paid plans</td><td>Free tier ~60 calls/min</td></tr>
          <tr><td>Twelve Data</td><td>FX incl. IDR and CNY, gold, silver, crypto, ETFs</td><td>Free 8 credits/min (non-display) · Grow from $29/mo</td></tr>
          <tr><td>Massive (Polygon.io)</td><td>S&amp;P 500, Nasdaq 100, Russell 2000, VIX, ETFs, FX, metals, crypto</td><td>Billed per asset class: Stocks, Indices, Currencies; real-time from the Developer tier</td></tr>
        </tbody></table></div></details></div>`;
      box.querySelectorAll('[data-up],[data-dn]').forEach(b => b.onclick = () => { const i = Number(b.dataset.up ?? b.dataset.dn); const j = b.dataset.up != null ? i - 1 : i + 1; [prio[i], prio[j]] = [prio[j], prio[i]]; draw(); });
      box.querySelectorAll('[data-ov]').forEach(sl => sl.onchange = () => { ov[sl.dataset.ov] = sl.value; });
      $('#rt-scan').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spin" style="width:12px;height:12px"></span>Scanning…`; try { await api('/admin/realtime/scan', { method: 'POST', headers: hdr() }); toast('Plans scanned'); renderAdminRealtime(hdr); startRt(); } catch (err) { toast(err.message); b.disabled = false; } };
      $('#rt-save').onclick = async () => { try { await api('/admin/realtime', { method: 'POST', headers: hdr(), body: JSON.stringify({ priority: prio, overrides: ov }) }); toast('Routing saved'); renderAdminRealtime(hdr); startRt(); } catch (err) { toast(err.message); } };
    };
    const RT_OPTS = (c, p) => c.options.includes(p);
    draw();
    const wsBox = () => { const el = $('#rt-ws-status'); if (!el) return false; const e = Object.entries(rt.sock); el.innerHTML = e.length ? `<div class="field"><label>WebSocket streams in this browser</label></div><div class="rt-ws">${e.map(([p, x]) => `<span class="rt-w ${x.status}"><i></i><b>${esc(pname(p))}</b> ${esc(x.status)} · ${x.n} symbols · ${x.ticks} ticks${x.at ? ` · last ${fmt.ago(new Date(x.at).toISOString())}` : ''}${x.note ? ` · <span class="down">${esc(x.note.slice(0, 160))}</span>` : ''} <span class="xs muted">(${x.mode === 'members' || x.mode === 'everyone' ? 'all members' : 'admin only'})</span></span>`).join('')}</div>` : `<p class="xs muted">WebSocket streams: none running. Turn one on in the Real-time group of the credentials panel (Massive, Alpaca, Finnhub or Twelve Data WebSocket), then save.</p>`; return true; };
    wsBox(); clearInterval(renderAdminRealtime._t); renderAdminRealtime._t = setInterval(() => { if (!wsBox()) clearInterval(renderAdminRealtime._t); }, 2000);
  }

  /* ═════════════════════ GLOSSARY ═════════════════════ */
  const slug = (t) => 'g-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function renderGlossary() {
    const v = $('#view-glossary'); const G = window.CFT_GLOSSARY || { sections: [], terms: [] };
    const g = state.gloss || (state.gloss = { q: '', cat: 'all', open: new Set() });
    const byT = new Map(G.terms.map(x => [x.t, x]));
    v.innerHTML = `<section class="card gl-hero"><div class="card-b">
        <div class="gl-intro"><span class="gl-ic">${ic('book')}</span><div><b>Start here</b><p class="sm dim">Prices change for many reasons; this page explains the words used to describe them. Tap a term for the plain explanation, an example from this dashboard, and related terms. <b>Live</b>, <b>Delayed</b> and <b>EOD</b> badges tell you how fresh a number is; <b>bp</b> means 0.01 percentage points.</p></div></div>
        <label class="search gl-search">${ic('search')}<input type="search" id="gl-q" placeholder="Search a term, e.g. yield curve, VIX, rupiah" value="${esc(g.q)}" autocomplete="off" aria-label="Search the glossary"></label>
        <div class="chip-row gl-cats" id="gl-cats"><button type="button" class="chip ${g.cat === 'all' ? 'active' : ''}" data-c="all">All <span class="muted">${G.terms.length}</span></button>${G.sections.map(([k, l]) => `<button type="button" class="chip ${g.cat === k ? 'active' : ''}" data-c="${k}">${esc(l)}</button>`).join('')}</div>
      </div></section><div id="gl-body"></div>`;
    const termCard = (x) => {
      const id = slug(x.t); const open = g.open.has(x.t);
      return `<article class="gl-term ${open ? 'open' : ''}" id="${id}" data-t="${esc(x.t)}">
        <button type="button" class="gl-h" aria-expanded="${open}"><span class="gl-t"><b>${esc(x.t)}</b>${x.aka ? `<span class="gl-aka">${esc(x.aka.join(' · '))}</span>` : ''}</span><span class="gl-s">${esc(x.s)}</span><span class="gl-chev">${ic('chev')}</span></button>
        <div class="gl-d">
          <p>${esc(x.d)}</p>
          ${x.x ? `<div class="gl-x"><span class="lab">In this dashboard</span><p>${esc(x.x)}</p></div>` : ''}
          ${(x.see && x.see.length) || x.v ? `<div class="gl-links">${(x.see || []).filter(n => byT.has(n)).map(n => `<button type="button" class="gl-see" data-see="${esc(n)}">${esc(n)}</button>`).join('')}${x.v && VIEWS[x.v] ? `<button type="button" class="btn ghost gl-go" data-go="${x.v}">${ic(VIEWS[x.v].icon)}Open ${esc(VIEWS[x.v].label)}${ic('arrow')}</button>` : ''}</div>` : ''}
        </div></article>`;
    };
    const match = (x, q) => !q || [x.t, x.s, x.d, x.x || '', (x.aka || []).join(' ')].join(' ').toLowerCase().includes(q);
    function draw() {
      const q = g.q.trim().toLowerCase();
      const secs = G.sections.filter(([k]) => g.cat === 'all' || g.cat === k);
      let html = ''; let n = 0;
      for (const [k, label, desc] of secs) {
        const items = G.terms.filter(x => x.cat === k && match(x, q)).sort((a, b) => q ? (b.t.toLowerCase().includes(q) - a.t.toLowerCase().includes(q)) || a.t.localeCompare(b.t) : 0);
        if (!items.length) continue; n += items.length;
        html += `<section class="card gl-sec"><div class="gl-sec-h"><h3>${esc(label)}</h3><span class="xs muted">${esc(desc)}</span><span class="gl-count">${items.length}</span></div><div class="gl-list">${items.map(termCard).join('')}</div></section>`;
      }
      $('#gl-body').innerHTML = html || `<section class="card"><div class="card-b">${emptyState(`No term matches "${g.q}". Try a shorter word, or ask the AI reading on Intelligence.`, 'search')}</div></section>`;
    }
    draw();
    let t; $('#gl-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { g.q = e.target.value; draw(); }, 120); };
    $('#gl-cats').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; g.cat = b.dataset.c; $$('#gl-cats .chip').forEach(x => x.classList.toggle('active', x === b)); draw(); };
    $('#gl-body').onclick = (e) => {
      const go = e.target.closest('[data-go]'); if (go) { show(go.dataset.go); return; }
      const see = e.target.closest('[data-see]');
      if (see) { const name = see.dataset.see; g.q = ''; g.cat = 'all'; g.open.add(name); $('#gl-q').value = ''; $$('#gl-cats .chip').forEach(x => x.classList.toggle('active', x.dataset.c === 'all')); draw(); const el = document.getElementById(slug(name)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); } return; }
      const h = e.target.closest('.gl-term'); if (!h || e.target.closest('a')) return;
      const name = h.dataset.t; if (g.open.has(name)) g.open.delete(name); else g.open.add(name);
      h.classList.toggle('open'); const b = $('.gl-h', h); if (b) b.setAttribute('aria-expanded', h.classList.contains('open'));
    };
  }

  /* ═════════════════════ MARKET HOURS (header) ═════════════════════
     Regular trading hours in each exchange's own time zone; exchange holidays are not modelled. */
  const SESSIONS = [
    { id: 'NY', name: 'New York', tz: 'America/New_York', days: { 1: [[570, 960]], 2: [[570, 960]], 3: [[570, 960]], 4: [[570, 960]], 5: [[570, 960]] } },
    { id: 'LDN', name: 'London', tz: 'Europe/London', days: { 1: [[480, 990]], 2: [[480, 990]], 3: [[480, 990]], 4: [[480, 990]], 5: [[480, 990]] } },
    { id: 'JKT', name: 'Jakarta', tz: 'Asia/Jakarta', days: { 1: [[540, 720], [810, 960]], 2: [[540, 720], [810, 960]], 3: [[540, 720], [810, 960]], 4: [[540, 720], [810, 960]], 5: [[540, 690], [840, 960]] } },
  ];
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function sessionState(x, now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: x.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
    const d = WD[parts.weekday]; const m = Number(parts.hour) * 60 + Number(parts.minute);
    const today = x.days[d] || [];
    for (const [a, b] of today) if (m >= a && m < b) return { open: true, mins: b - m, brk: today.length > 1 && b < today[today.length - 1][1] };
    for (let k = 0; k < 8; k++) { const ses = x.days[(d + k) % 7] || []; for (const [a] of ses) { const t = k * 1440 + a - m; if (t > 0) return { open: false, mins: t, lunch: k === 0 && today.some(([, b]) => b <= m) && today.some(([a2]) => a2 > m) }; } }
    return { open: false, mins: null };
  }
  const dur = (mm) => mm == null ? '' : mm >= 1440 ? `${Math.round(mm / 1440)}d` : mm >= 60 ? `${Math.floor(mm / 60)}h ${String(mm % 60).padStart(2, '0')}m` : `${mm}m`;
  function renderSessions() {
    const st = SESSIONS.map(x => ({ x, s: sessionState(x) }));
    const box = $('#sessions');
    if (box) box.innerHTML = st.map(({ x, s }) => `<span class="ses ${s.open ? 'open' : s.lunch ? 'lunch' : ''}" title="${esc(x.name)}: ${s.open ? `open, closes in ${dur(s.mins)}` : s.lunch ? `lunch break, reopens in ${dur(s.mins)}` : `closed, opens in ${dur(s.mins)}`} (regular hours, holidays not shown)"><i></i>${x.id}<em>${s.open ? dur(s.mins) : s.lunch ? 'break' : 'closed'}</em></span>`).join('');
    const sub = $('#app-sub');
    if (sub) sub.innerHTML = st.map(({ x, s }) => `<span class="${s.open ? 'open' : s.lunch ? 'lunch' : ''}"><i></i>${x.id} ${s.open ? dur(s.mins) : s.lunch ? 'break' : 'closed'}</span>`).join('');
  }
  renderSessions(); setInterval(renderSessions, 30000);

  /* ═════════════════════ SEARCH (instruments, pages, glossary) ═════════════════════ */
  function openSearch() {
    closeOverlays(); const pane = $('#search'); pane.hidden = false; document.body.classList.add('search-open'); openScrim(closeSearch);
    const q = $('#sp-q'); q.value = ''; drawSearch(''); setTimeout(() => q.focus(), 30);
  }
  function closeSearch() { $('#search').hidden = true; document.body.classList.remove('search-open'); $('#scrim').hidden = true; }
  function drawSearch(qs) {
    const q = qs.trim().toLowerCase(); const out = [];
    const rows = (state.perf || []).filter(r => !q || (r.id + ' ' + r.name).toLowerCase().includes(q)).slice(0, q ? 12 : 8);
    if (rows.length) out.push(`<div class="sp-sec">${q ? 'Instruments' : 'Watchlist and markets'}</div>` + rows.map(r => { const c = isDiff(r) ? r.change : r.pct1d; return `<button type="button" class="sp-item" data-inst="${r.id}"><span class="sp-ic">${ic(VIEWS.monitor.icon)}</span><span class="sp-t"><b>${r.id}</b><span>${esc(r.name)}</span></span><span class="sp-r mono"><span>${fmt.px(r.price)}</span><span class="${tone(c)}">${isDiff(r) ? fmt.bp(c) : fmt.pct(c)}</span></span></button>`; }).join(''));
    const pages = Object.entries(VIEWS).filter(([k, v]) => k !== 'admin' && (!q || (v.label + ' ' + v.title).toLowerCase().includes(q)));
    if (pages.length) out.push(`<div class="sp-sec">Pages</div>` + pages.slice(0, q ? 6 : 9).map(([k, v]) => `<button type="button" class="sp-item" data-go="${k}"><span class="sp-ic">${ic(v.icon)}</span><span class="sp-t"><b>${esc(v.label)}</b><span>${esc(v.sub)}</span></span>${ic('arrow')}</button>`).join(''));
    const G = window.CFT_GLOSSARY; if (q && G) { const t = G.terms.filter(x => (x.t + ' ' + (x.aka || []).join(' ')).toLowerCase().includes(q)).slice(0, 5); if (t.length) out.push(`<div class="sp-sec">Glossary</div>` + t.map(x => `<button type="button" class="sp-item" data-term="${esc(x.t)}"><span class="sp-ic">${ic('book')}</span><span class="sp-t"><b>${esc(x.t)}</b><span>${esc(x.s)}</span></span>${ic('arrow')}</button>`).join('')); }
    $('#sp-list').innerHTML = out.join('') || emptyState(`Nothing matches "${qs}"`, 'search');
  }
  $('#sp-q').addEventListener('input', e => drawSearch(e.target.value));
  $('#sp-q').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#sp-list .sp-item'); if (f) f.click(); } if (e.key === 'Escape') closeSearch(); });
  $('#sp-close').onclick = closeSearch;
  $('#sp-list').onclick = (e) => {
    const b = e.target.closest('.sp-item'); if (!b) return;
    closeSearch();
    if (b.dataset.inst) openDrawer(b.dataset.inst);
    else if (b.dataset.go) show(b.dataset.go);
    else if (b.dataset.term) { state.gloss = state.gloss || { q: '', cat: 'all', open: new Set() }; state.gloss.q = b.dataset.term; state.gloss.open.add(b.dataset.term); show('glossary'); }
  };
  $('#search-btn').onclick = () => { haptic(); openSearch(); };
  document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '') && $('#search').hidden) { e.preventDefault(); openSearch(); } });

  /* ═════════════════════ APPEARANCE (admin-set font and text size) ═════════════════════ */
  const FONT_CSS = { classic: 'IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700', modern: 'Inter:wght@400;500;600;700;800' };
  function applyUI(ui, rerender = true) {
    if (!ui) return; const h = document.documentElement;
    const changed = h.dataset.font !== ui.font || (Number(h.style.getPropertyValue('--fs')) || 1) !== ui.scale;
    h.dataset.font = ui.font; h.style.setProperty('--fs', String(ui.scale));
    const css = FONT_CSS[ui.font]; let link = document.getElementById('ui-font');
    if (css) { const href = `https://fonts.googleapis.com/css2?family=${css}&display=swap`; if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = 'ui-font'; document.head.appendChild(link); } if (link.getAttribute('href') !== href) link.href = href; }
    try { localStorage.setItem('cft:ui', JSON.stringify({ font: ui.font, scale: ui.scale })); } catch (e) {}
    if (changed && rerender && state.universe) { const go = () => show(state.view); if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); }
  }
  async function loadUI(rerender = true) { try { const r = await api('/ui'); applyUI({ font: r.font, scale: r.scale }, rerender); } catch (e) {} }

  /* ═════════════════════ navigation & boot ═════════════════════ */
  const renderers = { glossary: renderGlossary, overview: renderOverview, monitor: renderMonitor, flows: renderFlows, analytics: renderAnalytics, risk: renderRisk, intel: renderIntel, shock: renderShock, admin: renderAdmin };
  async function show(view) {
    if (!(view in renderers)) view = 'overview';
    state.view = view; const meta = VIEWS[view];
    document.body.classList.toggle('admin-mode', view === 'admin'); if (view === 'admin') { const sd = $('#side'); if (sd) sd.classList.remove('open'); }
    $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const hb = $('#help-btn'); if (hb) hb.classList.toggle('on', view === 'glossary'); const br = $('.brand'); if (br) br.classList.toggle('active', view === 'overview');
    $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + view));
    $('#page-title').textContent = meta.title; $('#page-sub').textContent = meta.sub; document.title = `${meta.label} · Capital Flow Terminal`;
    $('#app-title-page').textContent = titleCase(meta.title); $('.topbar').classList.remove('titled'); syncTabs();
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    window.scrollTo({ top: 0 });
    $$('.view:not(.active) .ch, .view:not(.active) [id$="-chart"], .view:not(.active) .ch-mini').forEach(n => { const c = window.echarts && echarts.getInstanceByDom(n); if (c) { if (ro) ro.unobserve(n); c.dispose(); } });
    try { await renderers[view](); } catch (e) { $('#view-' + view).innerHTML = errorBox('Could not load this view: ' + e.message); }
  }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h in renderers && h !== state.view) show(h); });
  const syncThemeIcon = () => { const b = $('#theme-btn'); b.innerHTML = ic(document.documentElement.dataset.theme === 'light' ? 'moon' : 'sun'); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--head-bg').trim() || '#000000'; };
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
  $('#help-btn').onclick = () => { closeOverlays(); show('glossary'); };
  $('#member-btn').onclick = () => { if (state.admin.token && !memberTok()) { show('admin'); return; } openAccount(); };
  $('#ticker-tag').onclick = () => { if (!isLive()) openAccount(); else if (memberTok()) openAccount(); };
  $('#admin-lock').onclick = () => { state.admin.token = ''; try { sessionStorage.removeItem('cft:admin'); } catch (e) {} syncRole(); startRt(); toast('Admin locked'); if (state.view === 'admin') renderAdmin(); };
  syncRole(); checkMember();
  loadUI(false);
  (async () => {
    try { await loadCore(); } catch (e) { $('#ticker-inner').innerHTML = `<span class="down">Quotes unavailable: ${esc(e.message)}</span>`; $('#view-overview').innerHTML = errorBox(`The API could not be reached (${e.message}). Check that the server is running and can reach the data sources.`); return; }
    show(location.hash.slice(1) || 'overview');
    loadNews(); loadTv(); startRt();
    setInterval(() => { if (!(SNAP && !apiBase)) loadNews(); }, 10 * 60000);
    setInterval(async () => { if (SNAP && !apiBase) return; try { await loadCore(); if (state.view === 'monitor') drawMonTable(); } catch (e) {} }, 60000);
  })();
})();
