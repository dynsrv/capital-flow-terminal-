/* Capital Flow Terminal — front-end. Vanilla JS + ECharts. All numbers come from /api/*; nothing is computed from guesses. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const state = {
    view: 'overview', universe: null, quotes: [], perf: [], overview: null, charts: {},
    watchlist: JSON.parse(localStorage.getItem('cft:watchlist') || '["SPX","UST10Y","DXY","BTC","GOLD","WTI","VIX","HYOAS"]'),
    monitor: { cls: 'all', region: 'all', q: '', horizon: '1D', sortKey: 'cls', sortAsc: true, watchOnly: false },
    analytics: { window: '30D', ids: ['SPX', 'NDX', 'SX5E', 'NKY', 'EEM', 'UST10Y', 'TLT', 'HYG', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'DXY', 'VIX'], relWindow: '1Y', relIds: ['SPX', 'EEM', 'BTC', 'GOLD', 'TLT', 'DXY'], rollA: 'SPX', rollB: 'UST10Y', rollWindow: '1Y' },
    shock: { driver: 'SPX', value: -10, window: '1Y', betas: null },
    admin: { token: sessionStorage.getItem('cft:admin') || '' },
    demo: false,
  };

  /* ───────── helpers ───────── */
  // API resolution: a configured Worker URL (artifact builds) > same-origin /api > embedded snapshot (artifact builds).
  const SNAP = window.CFT_SNAPSHOT || null;
  let apiBase = ''; try { apiBase = localStorage.getItem('cft:apiBase') || ''; } catch (e) {}
  const snapKey = (path) => path.split('?')[0] + '?' + (path.split('?')[1] || '').split('&').filter(Boolean).sort().join('&');
  const api = async (path, opts = {}) => {
    if (SNAP && !apiBase) {
      const hit = SNAP.data[snapKey(path)];
      if (hit) return hit;
      throw new Error('Not in the embedded snapshot. Connect your deployed Worker (link icon, top right) for live queries.');
    }
    const r = await fetch((apiBase ? apiBase.replace(/\/$/, '') : '') + '/api' + path, opts);
    const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
    if (!j.ok) throw new Error(j.error || `API error ${r.status}`);
    state.demo = !!j.demoMode; $('#demo-banner').hidden = !state.demo;
    return j;
  };
  const fmt = {
    px(v, a) { if (v == null) return '—'; const ab = Math.abs(v); const d = ab >= 10000 ? 0 : ab >= 100 ? 2 : ab >= 1 ? 3 : 4; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); },
    pct(v, d = 2) { if (v == null || !isFinite(v)) return '—'; return (v > 0 ? '+' : '') + v.toFixed(d) + '%'; },
    bp(v) { if (v == null || !isFinite(v)) return '—'; return (v > 0 ? '+' : '') + Math.round(v * 100) + ' bp'; },
    chg(row, v) { return isDiff(row) ? fmt.bp(v) : fmt.pct(v); },
    big(v) { if (v == null) return '—'; const a = Math.abs(v); if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'; if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K'; return String(Math.round(v)); },
    usd(v) { return v == null ? '—' : '$' + fmt.big(v); },
    ago(iso) { if (!iso) return '—'; const m = (Date.now() - new Date(iso)) / 60000; if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + 'm ago'; if (m < 48 * 60) return Math.round(m / 60) + 'h ago'; return Math.round(m / 1440) + 'd ago'; },
    date(iso) { return iso ? iso.slice(0, 10) : '—'; },
    time(iso) { return iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + 'Z' : '—'; },
  };
  const isDiff = (row) => row && (row.kind === 'yield' || row.kind === 'spread' || (row.kind === 'level' && String(row.unit || '').startsWith('%')));
  const cls = (v) => v == null ? 'muted' : v > 0 ? 'up' : v < 0 ? 'down' : '';
  const badge = (q) => { const f = q.stale ? 'stale' : (q.error && !q.available) ? 'error' : (q.freshness || 'eod'); const t = q.stale ? 'Stale: serving last cached value; source failed: ' + (q.error || '') : f; return `<span class="badge ${f}" title="${esc(t)}">${f}</span>`; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const chartTheme = () => ({ textStyle: { fontFamily: css('--mono'), color: css('--fg2'), fontSize: 11 }, backgroundColor: 'transparent' });
  const palette = ['#f5a623', '#3b9eff', '#22c55e', '#ef4444', '#a855f7', '#14b8a6', '#f97316', '#e879f9', '#84cc16', '#60a5fa', '#facc15', '#fb7185'];
  function chart(id, option, { tall } = {}) {
    const node = typeof id === 'string' ? $(id) : id; if (!node) return null;
    if (typeof echarts === 'undefined') { node.innerHTML = '<div class="callout warn">Chart library failed to load; data is in the tables.</div>'; return null; }
    let c = echarts.getInstanceByDom(node); if (!c) c = echarts.init(node, null, { renderer: 'canvas' });
    c.setOption({ ...chartTheme(), animationDuration: 300, ...option }, true);
    return c;
  }
  window.addEventListener('resize', () => { if (typeof echarts === 'undefined') return; $$('.chart').forEach(n => { const c = echarts.getInstanceByDom(n); if (c) c.resize(); }); });
  const axis = (extra = {}) => ({ axisLine: { lineStyle: { color: css('--line2') } }, axisLabel: { color: css('--fg3'), fontSize: 10 }, splitLine: { lineStyle: { color: css('--line') } }, ...extra });
  const sparkSvg = (vals, w = 70, h = 18) => { if (!vals || vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals); const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 1 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (h - 2)).toFixed(1)}`).join(' '); const col = vals[vals.length - 1] >= vals[0] ? css('--up') : css('--down'); return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${col}" stroke-width="1.2" points="${pts}"/></svg>`; };
  const csvDownload = async (name, rows) => { const esc2 = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; const head = Object.keys(rows[0] || {}); const body = [head.map(esc2).join(','), ...rows.map(r => head.map(k => esc2(r[k])).join(','))].join('\n');
    // Inside the claude.ai artifact viewer the page must hand files over through the downloads capability; elsewhere a plain download link works.
    try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: name, data: body }); return; } } catch (e) { /* viewer declined */ return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = name; a.click(); };
  const seg = (opts, cur, onPick) => { const d = el(`<div class="seg">${opts.map(o => `<button data-v="${o}" class="${o === cur ? 'active' : ''}">${o}</button>`).join('')}</div>`); d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', d).forEach(x => x.classList.toggle('active', x === b)); onPick(b.dataset.v); }); return d; };
  const multiPick = (ids, cur, onChange) => { const names = Object.fromEntries(state.universe.assets.map(a => [a.id, a])); const d = el(`<div style="display:flex;flex-wrap:wrap;gap:4px">${ids.map(i => `<span class="chip ${cur.includes(i) ? 'active' : ''}" data-id="${i}" title="${esc(names[i]?.name)}">${i}</span>`).join('')}</div>`); d.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; c.classList.toggle('active'); onChange($$('.chip.active', d).map(x => x.dataset.id)); }); return d; };

  /* ───────── global data ───────── */
  async function loadCore() {
    const [u, p] = await Promise.all([state.universe ? Promise.resolve({ ...state.universe }) : api('/universe'), api('/performance')]);
    if (!state.universe) state.universe = u;
    state.perf = p.rows; state.quotes = p.rows; state.loadedAt = new Date();
    renderTicker(); renderStatus();
    api('/analytics/regime').then(setRegimeBadge).catch(() => {});
  }
  function renderTicker() {
    const ids = ['SPX', 'NDX', 'SX5E', 'NKY', 'SHCOMP', 'EEM', 'UST10Y', 'HYOAS', 'DXY', 'USDJPY', 'BTC', 'ETH', 'GOLD', 'WTI', 'COPPER', 'VIX'];
    const items = ids.map(id => state.quotes.find(q => q.id === id)).filter(Boolean).map(q => `<span class="tk" data-id="${q.id}"><b>${q.id}</b><span class="px">${fmt.px(q.price)}</span><span class="${cls(q.pct1d)}">${isDiff(q) ? fmt.bp(q.change) : fmt.pct(q.pct1d)}</span></span>`).join('');
    $('#ticker-inner').innerHTML = items + items; // duplicated for seamless loop
    $('#ticker-inner').onclick = e => { const t = e.target.closest('.tk'); if (t) openDrawer(t.dataset.id); };
    $('#status-updated').textContent = 'updated ' + state.loadedAt.toISOString().slice(11, 19) + 'Z';
  }
  function renderStatus() {
    const by = {}; for (const q of state.quotes) { const s = by[q.source] || (by[q.source] = { ok: 0, bad: 0, stale: 0 }); if (q.available) s.ok++; else s.bad++; if (q.stale) s.stale++; }
    $('#status-sources').innerHTML = Object.entries(by).map(([s, v]) => `${s}: <span class="${v.bad ? 'down' : 'up'}">${v.ok}/${v.ok + v.bad}</span>${v.stale ? ` <span class="down">(${v.stale} stale)</span>` : ''}`).join(' · ');
  }
  setInterval(() => { $('#clock').textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }, 1000);

  /* ───────── Overview ───────── */
  async function renderOverview() {
    const v = $('#view-overview'); v.innerHTML = '<div class="loading">Loading overview…</div>';
    const o = await api('/overview'); state.overview = o; setRegimeBadge(o.regime);
    const P = Object.fromEntries(state.perf.map(r => [r.id, r]));
    v.innerHTML = `
      <div class="grid g-kpi" id="kpis"></div>
      <div class="grid g-main">
        <div class="panel"><div class="panel-head">Where capital is concentrated <span class="sub">asset-class size, USD</span><span class="right"><span class="badge reference">reference</span><span class="badge measured">live</span></span></div>
          <div class="panel-body tight"><div id="size-strip" class="size-strip"></div><div id="treemap" class="chart tall"></div></div>
          <div class="note" id="treemap-note"></div></div>
        <div class="panel"><div class="panel-head">Market regime <span class="right"><span class="badge estimate">rules-based</span></span></div>
          <div class="panel-body" id="regime-panel"></div><div class="note">${esc(o.regime.method)}</div></div>
      </div>
      <div class="panel"><div class="panel-head">Performance by asset class <span class="sub">return over the selected window; yields and spreads in basis points</span><span class="right" id="perf-window"></span></div><div class="panel-body"><div id="class-perf" class="heat"></div></div></div>
      <div class="grid g-main">
        <div class="panel"><div class="panel-head">Macro conditions <span class="sub">FRED official series</span></div><div class="panel-body tight"><div style="overflow-x:auto"><table class="data" id="macro-table"></table></div></div><div class="note">End-of-day, weekly or monthly as badged. Net liquidity = Fed assets − RRP − TGA (details in Flows).</div></div>
        <div class="panel"><div class="panel-head">Liquidity &amp; flows <span class="sub">measured balance changes only</span></div><div class="panel-body" id="flows-mini"></div><div class="note">Stablecoin supply is on-chain issuance; net liquidity is weekly FRED data. Volume and price moves are never shown as flows.</div></div>
      </div>`;

    // Proportion strip + flat squarified treemap (flat so every tile shares the same grid; nesting produced slivers).
    const classColor = { EQ_GLOBAL: '#f5a623', FI_GLOBAL: '#3b9eff', GOLD_STOCK: '#22c55e', CRYPTO_TOTAL: '#a855f7' };
    const total = o.sizes.reduce((s, z) => s + (z.usd || 0), 0);
    $('#size-strip').innerHTML = o.sizes.map(z => `<div class="strip-seg ${total && z.usd / total < 0.1 ? 'narrow' : ''}" style="flex:${z.usd || 0};background:${classColor[z.id]}" title="${esc(z.label)} ${fmt.usd(z.usd)} · ${total ? (z.usd / total * 100).toFixed(1) : '—'}%"><span>${esc(z.label)}</span><b>${fmt.usd(z.usd)} · ${total ? (z.usd / total * 100).toFixed(0) : '—'}%</b></div>`).join('');
    const leaves = [];
    for (const z of o.sizes) { const kids = (z.children || []).filter(c => c.usd > 0 && c.usd / total >= 0.04); if (kids.length) kids.forEach(c => leaves.push({ name: c.label, value: c.usd, cls: z.label, ref: { ...c, measure: z.measure, source: z.source, asOf: z.asOf, live: z.live }, itemStyle: { color: classColor[z.id] } })); else leaves.push({ name: z.id === 'GOLD_STOCK' ? 'Gold' : z.id === 'CRYPTO_TOTAL' ? 'Crypto' : z.label, value: z.usd || 0, cls: z.label, ref: z, itemStyle: { color: classColor[z.id] } }); }
    // shade siblings within a class so sub-blocks read as one family
    const byCls = {}; leaves.forEach(l => { (byCls[l.cls] ||= []).push(l); }); Object.values(byCls).forEach(arr => arr.sort((a, b) => b.value - a.value).forEach((l, i) => { l.itemStyle.opacity = 1 - Math.min(0.45, i * 0.15); }));
    chart('#treemap', { tooltip: { formatter: (p) => { const r = p.data.ref || {}; return `<b>${esc(p.name)}</b> · ${esc(p.data.cls)}<br>${fmt.usd(p.value)} (${total ? (p.value / total * 100).toFixed(1) : '—'}% of total)<br><span style="opacity:.7">${esc(String(r.measure || '').replace(/_/g, ' '))}${r.live ? ' · live' : r.source ? ' · ' + esc(r.source) + (r.asOf ? ', ' + esc(r.asOf) : '') : ''}</span>`; } }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1, label: { show: true, overflow: 'break', fontFamily: css('--mono'), fontSize: 12, color: '#fff', formatter: (p) => total && p.value / total < 0.025 ? '' : `${p.name}\n${fmt.usd(p.value)}` }, itemStyle: { borderColor: css('--bg2'), borderWidth: 3, gapWidth: 3 }, emphasis: { itemStyle: { borderColor: css('--fg') } }, data: leaves }] });
    $('#treemap-note').innerHTML = o.sizes.map(s => `<b>${esc(s.label)}</b>: ${esc(s.measure.replace(/_/g, ' '))} — ${s.live ? '<span class="up">live</span>' : 'reference'} · ${esc(s.note || s.source)}${s.asOf ? ' (' + esc(String(s.asOf).slice(0, 10)) + ')' : ''}${s.error ? ' <span class="down">' + esc(s.error) + '</span>' : ''}`).join('<br>') + '<br><span class="muted">Market capitalisation ≠ debt outstanding ≠ physical stock value ≠ trading volume ≠ capital flow. Equity and bond totals are published aggregates (editable in Admin); gold and crypto are computed from live prices.</span>';

    // Regime panel
    const r = o.regime;
    $('#regime-panel').innerHTML = `<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px"><div class="mono ${r.score > .3 ? 'up' : r.score < -.3 ? 'down' : ''}" style="font-size:26px;font-weight:700;letter-spacing:-.01em">${r.label}</div><div class="mono dim">score ${r.score > 0 ? '+' : ''}${r.score} (−1…+1)</div></div><div class="bar" style="width:100%;height:8px;margin-bottom:12px;border-radius:999px;overflow:hidden"><i style="left:${((r.score + 1) / 2 * 100).toFixed(0)}%;width:3px;background:${r.score > .3 ? css('--up') : r.score < -.3 ? css('--down') : css('--warn')}"></i></div>` + r.components.map(c => `<div class="comp"><span>${esc(c.label)}<br><span class="muted xs">${esc(c.detail)}</span></span><span class="score ${c.score > 0 ? 'up' : c.score < 0 ? 'down' : 'muted'}">${c.score == null ? 'n/a' : (c.score > 0 ? '+' : '') + c.score}</span></div>`).join('');

    // KPIs
    const kp = ['SPX', 'UST10Y', 'DXY', 'BTC', 'GOLD', 'WTI', 'VIX', 'HYOAS'];
    $('#kpis').innerHTML = kp.map(id => { const q = P[id]; if (!q) return ''; return `<div class="panel kpi" data-id="${id}" style="cursor:pointer"><div class="lbl">${esc(q.name)} ${badge(q)}</div><div class="val">${fmt.px(q.price)} <span class="small muted">${esc(q.unit)}</span></div><div class="sub"><span class="${cls(isDiff(q) ? q.change : q.pct1d)}">${isDiff(q) ? fmt.bp(q.change) : fmt.pct(q.pct1d)}</span> 1D · <span class="${cls(q.perf['30D'])}">${fmt.chg(q, q.perf['30D'])}</span> 30D · <span class="${cls(q.perf.YTD)}">${fmt.chg(q, q.perf.YTD)}</span> YTD</div><div class="sub xs muted">${esc(q.source)} · ${fmt.ago(q.asOf)}</div>${sparkSvg(q.sparkline, 200, 34).replace('class="spark"', 'class="mini-spark"')}</div>`; }).join('');
    $('#kpis').onclick = e => { const k = e.target.closest('.kpi'); if (k) openDrawer(k.dataset.id); };

    // Performance heat grid grouped by class
    const pw = $('#perf-window'); let win = '30D';
    const heatColor = (v, max) => { if (v == null) return 'var(--bg3)'; const t = Math.max(-1, Math.min(1, v / max)); const a = (0.12 + 0.55 * Math.abs(t)).toFixed(2); return t >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`; };
    const drawPerf = () => {
      const rows = state.perf.filter(r => !r.id.match(/USDT|USDC/) && (r.cls !== 'macro' || ['VIX', 'BROADUSD'].includes(r.id)));
      const groups = {}; rows.forEach(r => (groups[r.cls] ||= []).push(r));
      $('#class-perf').innerHTML = Object.entries(groups).map(([c, arr]) => { const pv = (r) => win === '1D' ? (isDiff(r) ? r.change : r.pct1d) : r.perf[win]; const vals = arr.map(r => isDiff(r) ? (pv(r) ?? 0) * 100 : pv(r) ?? 0); const max = Math.max(5, ...vals.map(Math.abs)); return `<div class="heat-row"><div class="cls">${state.universe.classes[c]}</div><div class="heat-tiles">${arr.sort((x, y) => (pv(y) ?? -1e9) - (pv(x) ?? -1e9)).map(r => { const v = win === '1D' ? (isDiff(r) ? r.change : r.pct1d) : r.perf[win]; const scaled = v == null ? null : isDiff(r) ? v * 100 : v; return `<div class="tile" data-id="${r.id}" style="background:${heatColor(scaled, isDiff(r) ? Math.max(25, max) : max)}" title="${esc(r.name)}"><div><div class="t-id">${r.id}</div><div class="t-name">${esc(r.name)}</div></div><div class="t-val ${cls(v)}">${fmt.chg(r, v)}</div></div>`; }).join('')}</div></div>`; }).join('');
      $('#class-perf').onclick = e => { const t = e.target.closest('.tile'); if (t) openDrawer(t.dataset.id); };
    };
    pw.appendChild(seg(['1D', '7D', '30D', '90D', 'YTD', '1Y'], win, v2 => { win = v2; drawPerf(); })); drawPerf();

    // Macro table
    const macro = ['FEDFUNDS', 'ECBRATE', 'CPI', 'BREAKEVEN10', 'UST2Y', 'UST10Y', 'T10Y2Y', 'IGOAS', 'HYOAS', 'VIX', 'BROADUSD', 'WALCL', 'RRP', 'TGA', 'M2'];
    $('#macro-table').innerHTML = `<thead><tr><th>Indicator</th><th class="num">Latest</th><th class="num">1 obs</th><th class="num">30D</th><th class="num">1Y</th><th>As of</th><th>Fresh</th></tr></thead><tbody>` + macro.map(id => { const q = P[id]; if (!q) return ''; const d = isDiff(q) || q.kind === 'level'; const c1 = q.change, c30 = q.perf['30D'], c1y = q.perf['1Y']; const f = (v) => q.unit === '%' || q.unit === '% y/y' ? fmt.bp(v) : fmt.pct(v); return `<tr data-id="${id}"><td>${esc(q.name)}</td><td class="num">${fmt.px(q.price)} <span class="muted xs">${esc(q.unit)}</span></td><td class="num ${cls(c1)}">${q.unit.startsWith('%') ? fmt.bp(c1) : fmt.pct(q.pct1d)}</td><td class="num ${cls(c30)}">${q.unit.startsWith('%') ? fmt.bp(c30) : fmt.pct(c30)}</td><td class="num ${cls(c1y)}">${q.unit.startsWith('%') ? fmt.bp(c1y) : fmt.pct(c1y)}</td><td class="muted">${fmt.date(q.asOf)}</td><td>${badge(q)}</td></tr>`; }).join('') + '</tbody>';
    $('#macro-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };

    // Liquidity & flows mini
    try {
      const f = await api('/flows');
      const st = f.sections.find(x => x.id === 'stablecoins'), nl = f.sections.find(x => x.id === 'fed_liquidity');
      const items = [...(st ? st.items.map(i => ({ ...i, fmtv: (v) => fmt.usd(v), fmtd: (v) => (v > 0 ? '+' : '') + fmt.big(v) })) : []), ...(nl ? nl.items.slice(0, 2).map(i => ({ ...i, fmtv: (v) => '$' + fmt.big(v * 1e9), fmtd: (v) => (v > 0 ? '+' : '') + fmt.big(v * 1e9) })) : [])].filter(i => i.latest != null);
      $('#flows-mini').innerHTML = `<div class="grid" style="gap:10px;grid-template-columns:1fr">${items.map((i, k) => `<div class="kpi" style="padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm)"><div class="lbl">${esc(i.name)}</div><div class="val" style="font-size:18px;margin:4px 0">${i.fmtv(i.latest)}</div><div class="sub">${['d7', 'd30', 'd90'].filter(w => i[w]).map(w => `<span class="${cls(i[w].abs)}">${i.fmtd(i[w].abs)}</span> ${w.slice(1)}D`).join(' · ')}</div><div id="fm-${k}" class="chart" style="height:40px;margin-top:6px"></div></div>`).join('')}</div>`;
      items.forEach((i, k) => chart('#fm-' + k, { grid: { left: 2, right: 2, top: 4, bottom: 2 }, xAxis: { type: 'time', show: false }, yAxis: { type: 'value', scale: true, show: false }, series: [{ type: 'line', showSymbol: false, data: (i.series || []).slice(-120), lineStyle: { width: 1.4, color: css('--accent2') }, areaStyle: { color: css('--accent2'), opacity: .12 } }] }));
    } catch (e) { $('#flows-mini').innerHTML = `<div class="dim">${esc(e.message)}</div>`; }
  }
  function setRegimeBadge(r) { const b = $('#regime-badge'); b.textContent = 'REGIME · ' + r.label; b.className = 'regime-badge ' + (r.label.startsWith('RISK-ON') ? 'on' : r.label.startsWith('RISK-OFF') ? 'off' : 'neutral'); }

  /* ───────── Monitor ───────── */
  function renderMonitor() {
    const v = $('#view-monitor'); const m = state.monitor;
    const classes = state.universe.classes; const regions = [...new Set(state.universe.assets.map(a => a.region))];
    v.innerHTML = `<div class="panel"><div class="toolbar">
        <span class="chip ${m.cls === 'all' ? 'active' : ''}" data-cls="all">All</span>${Object.entries(classes).map(([k, l]) => `<span class="chip ${m.cls === k ? 'active' : ''}" data-cls="${k}">${l}</span>`).join('')}
        <select id="mon-region"><option value="all">All regions</option>${regions.map(r => `<option ${m.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
        <input type="text" id="mon-q" placeholder="Search…" value="${esc(m.q)}" style="width:130px">
        <span id="mon-horizon"></span>
        <span class="chip ${m.watchOnly ? 'active' : ''}" id="mon-watch">★ Watchlist (${state.watchlist.length})</span>
        <button class="btn secondary" id="mon-csv" style="margin-left:auto">Export CSV</button>
      </div><div class="table-wrap"><table class="data" id="mon-table"></table></div>
      <div class="note">Volume = exchange-reported traded volume (shares/contracts for Yahoo instruments; USD 24h for crypto). Market cap only where the source reports it. Realised vol = annualised stdev of daily changes (bp for yields/spreads). 52w = position of the latest print within the trailing 1-year range. Freshness badges show the actual source latency; hover a stale badge for the error.</div></div>`;
    $$('.chip[data-cls]', v).forEach(c => c.onclick = () => { m.cls = c.dataset.cls; renderMonitor(); });
    $('#mon-region').onchange = e => { m.region = e.target.value; drawMonTable(); };
    $('#mon-q').oninput = e => { m.q = e.target.value; drawMonTable(); };
    $('#mon-horizon').appendChild(seg(['1D', '7D', '30D', '90D', 'YTD', '1Y'], m.horizon, h => { m.horizon = h; drawMonTable(); }));
    $('#mon-watch').onclick = () => { m.watchOnly = !m.watchOnly; renderMonitor(); };
    $('#mon-csv').onclick = () => csvDownload(`monitor-${new Date().toISOString().slice(0, 10)}.csv`, filteredRows().map(r => ({ id: r.id, name: r.name, class: r.cls, region: r.region, price: r.price, unit: r.unit, change_1d: isDiff(r) ? r.change : r.pct1d, change_1d_unit: isDiff(r) ? 'pct-pt' : '%', perf_7d: r.perf['7D'], perf_30d: r.perf['30D'], perf_90d: r.perf['90D'], perf_ytd: r.perf.YTD, perf_1y: r.perf['1Y'], vol_30d: r.vol['30D'], vol_1y: r.vol['1Y'], volume: r.volume, market_cap: r.marketCap, drawdown_1y: r.maxDrawdown1Y, source: r.source, freshness: r.stale ? 'stale' : r.freshness, as_of: r.asOf })));
    drawMonTable();
  }
  function filteredRows() { const m = state.monitor; return state.perf.filter(r => (m.cls === 'all' || r.cls === m.cls) && (m.region === 'all' || r.region === m.region) && (!m.q || (r.name + r.id).toLowerCase().includes(m.q.toLowerCase())) && (!m.watchOnly || state.watchlist.includes(r.id))); }
  function drawMonTable() {
    const m = state.monitor; const h = m.horizon; const hv = (r) => h === '1D' ? (isDiff(r) ? r.change : r.pct1d) : r.perf[h];
    const cols = [['star', ''], ['id', 'ID'], ['name', 'Instrument'], ['cls', 'Class'], ['price', 'Last', 1], ['chg', `Δ ${h}`, 1], ['spark', '30D'], ['vol', 'Vol 30D', 1], ['range', '52w'], ['volume', 'Volume', 1], ['marketCap', 'Mkt cap', 1], ['fresh', 'Fresh'], ['asOf', 'As of'], ['source', 'Source']];
    const rows = filteredRows().slice().sort((a, b) => { const k = m.sortKey; let x, y; if (k === 'chg') { x = hv(a); y = hv(b); } else if (k === 'vol') { x = a.vol['30D']; y = b.vol['30D']; } else { x = a[k]; y = b[k]; } if (x == null) return 1; if (y == null) return -1; const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return m.sortAsc ? c : -c; });
    $('#mon-table').innerHTML = `<thead><tr>${cols.map(([k, l, n]) => `<th class="${n ? 'num' : ''} ${m.sortKey === k ? 'sorted' + (m.sortAsc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => { const c = hv(r); return `<tr data-id="${r.id}"><td><span class="star ${state.watchlist.includes(r.id) ? 'on' : ''}" data-star="${r.id}">★</span></td><td class="mono">${r.id}</td><td>${esc(r.name)}</td><td class="muted">${state.universe.classes[r.cls]}</td><td class="num">${fmt.px(r.price)} <span class="muted xs">${esc(r.unit)}</span></td><td class="num ${cls(c)}">${h === '1D' && isDiff(r) ? fmt.bp(c) : fmt.chg(r, c)}</td><td>${sparkSvg(r.sparkline)}</td><td class="num muted">${r.vol['30D'] == null ? '—' : isDiff(r) ? Math.round(r.vol['30D']) + 'bp' : r.vol['30D'].toFixed(1) + '%'}</td><td>${r.range52w && r.range52w.pos != null ? `<span class="bar" title="low ${fmt.px(r.range52w.low)} · high ${fmt.px(r.range52w.high)}"><i style="left:${(r.range52w.pos * 100).toFixed(0)}%"></i></span>` : '—'}</td><td class="num muted">${fmt.big(r.volume)}</td><td class="num muted">${r.marketCap ? fmt.usd(r.marketCap) : '—'}</td><td>${badge(r)}</td><td class="muted xs">${fmt.time(r.asOf)}</td><td class="muted xs">${r.source}</td></tr>`; }).join('') + '</tbody>';
    $('#mon-table').onclick = e => { const s = e.target.closest('[data-star]'); if (s) { toggleWatch(s.dataset.star); s.classList.toggle('on'); $('#mon-watch').textContent = `★ Watchlist (${state.watchlist.length})`; return; } const th = e.target.closest('th'); if (th) { if (m.sortKey === th.dataset.k) m.sortAsc = !m.sortAsc; else { m.sortKey = th.dataset.k; m.sortAsc = true; } drawMonTable(); return; } const tr = e.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id); };
  }
  function toggleWatch(id) { const i = state.watchlist.indexOf(id); if (i >= 0) state.watchlist.splice(i, 1); else state.watchlist.push(id); localStorage.setItem('cft:watchlist', JSON.stringify(state.watchlist)); }

  /* ───────── Drawer (drill-down) ───────── */
  async function openDrawer(id) {
    const q = state.perf.find(r => r.id === id); if (!q) return;
    const d = $('#drawer'); d.hidden = false; $('#drawer-title').innerHTML = `${esc(q.name)} <span class="mono muted">${id}</span> ${badge(q)}`;
    const b = $('#drawer-body');
    b.innerHTML = `<div class="kv" style="grid-template-columns:auto 1fr auto 1fr"><dt>Last</dt><dd>${fmt.px(q.price)} ${esc(q.unit)}</dd><dt>1D</dt><dd class="${cls(isDiff(q) ? q.change : q.pct1d)}">${isDiff(q) ? fmt.bp(q.change) : fmt.pct(q.pct1d)}</dd><dt>7D</dt><dd class="${cls(q.perf['7D'])}">${fmt.chg(q, q.perf['7D'])}</dd><dt>30D</dt><dd class="${cls(q.perf['30D'])}">${fmt.chg(q, q.perf['30D'])}</dd><dt>YTD</dt><dd class="${cls(q.perf.YTD)}">${fmt.chg(q, q.perf.YTD)}</dd><dt>1Y</dt><dd class="${cls(q.perf['1Y'])}">${fmt.chg(q, q.perf['1Y'])}</dd><dt>5Y</dt><dd class="${cls(q.perf['5Y'])}">${fmt.chg(q, q.perf['5Y'])}</dd><dt>10Y</dt><dd class="${cls(q.perf['10Y'])}">${fmt.chg(q, q.perf['10Y'])}</dd><dt>Vol 30D/1Y</dt><dd>${q.vol['30D'] ?? '—'} / ${q.vol['1Y'] ?? '—'}${isDiff(q) ? ' bp' : '%'}</dd><dt>Max DD 1Y</dt><dd class="down">${q.maxDrawdown1Y == null ? '—' : q.maxDrawdown1Y.toFixed(1) + '%'}</dd><dt>Volume</dt><dd>${fmt.big(q.volume)}</dd><dt>Mkt cap</dt><dd>${q.marketCap ? fmt.usd(q.marketCap) : '—'}</dd></div>
      <div style="margin:8px 0" id="dr-win"></div><div id="dr-chart" class="chart"></div>
      <div class="kv"><dt>Source</dt><dd>${esc(q.source)} (${esc(state.universe.sources[q.source]?.name || q.source)})</dd><dt>Symbol</dt><dd>${esc(state.universe.assets.find(a => a.id === id)?.symbol)}</dd><dt>Freshness</dt><dd>${q.stale ? '<span class="down">STALE — ' + esc(q.error) + '</span>' : esc(q.freshness)}</dd><dt>Quote as of</dt><dd>${fmt.time(q.asOf)} (${fmt.ago(q.asOf)})</dd><dt>History</dt><dd id="dr-hist">—</dd></div>
      ${q.coverageNote ? `<div class="callout warn">${esc(q.coverageNote)}</div>` : ''}${q.changeNote ? `<div class="callout">${esc(q.changeNote)}</div>` : ''}
      <div style="margin-top:8px;display:flex;gap:6px"><button class="btn secondary" id="dr-star">${state.watchlist.includes(id) ? '★ Remove from watchlist' : '☆ Add to watchlist'}</button><button class="btn secondary" id="dr-csv">Export history CSV</button></div>`;
    let win = '1Y', hist = null;
    const draw = async () => { const h = await api(`/history?id=${id}&window=${win}`); hist = h; $('#dr-hist').innerHTML = `${h.n} obs · ${h.from} → ${h.to} · ${h.source} ${h.stale ? '<span class="down">stale</span>' : ''}`; chart('#dr-chart', { grid: { left: 55, right: 15, top: 10, bottom: 25 }, tooltip: { trigger: 'axis', valueFormatter: v => fmt.px(v) }, xAxis: { type: 'category', data: h.points.map(p => p[0]), ...axis(), boundaryGap: false }, yAxis: { type: 'value', scale: true, ...axis() }, dataZoom: [{ type: 'inside' }], series: [{ type: 'line', data: h.points.map(p => p[1]), showSymbol: false, lineStyle: { width: 1.3, color: css('--accent') }, areaStyle: { color: css('--accent'), opacity: .08 } }] }); };
    $('#dr-win').appendChild(seg(['30D', '90D', '1Y', '5Y', '10Y'], win, w => { win = w; draw(); })); draw();
    $('#dr-star').onclick = () => { toggleWatch(id); $('#dr-star').textContent = state.watchlist.includes(id) ? '★ Remove from watchlist' : '☆ Add to watchlist'; if (state.view === 'monitor') drawMonTable(); };
    $('#dr-csv').onclick = () => hist && csvDownload(`${id}-${win}.csv`, hist.points.map(p => ({ date: p[0], value: p[1], source: hist.source })));
  }
  $('#drawer-close').onclick = () => { $('#drawer').hidden = true; };

  /* ───────── Flows ───────── */
  async function renderFlows() {
    const v = $('#view-flows'); v.innerHTML = '<div class="loading">Loading capital-flow series…</div>';
    const f = await api('/flows');
    v.innerHTML = `<div class="callout">Only measured balance changes are shown as <b>flows</b> (stablecoin net issuance, Fed liquidity). Traded volume and price appreciation are reported separately and are <b>not</b> interpreted as inflows. Sources without a licensed feed are listed as unavailable rather than estimated.</div><div class="grid g2" id="flow-grid"></div>`;
    const g = $('#flow-grid');
    for (const sec of f.sections) {
      if (sec.unavailable) { g.appendChild(el(`<div class="panel"><div class="panel-head">${esc(sec.title)} <span class="right"><span class="badge stale">unavailable</span></span></div><div class="panel-body dim">${esc(sec.reason)}</div></div>`)); continue; }
      if (sec.error) { g.appendChild(el(`<div class="panel"><div class="panel-head">${esc(sec.title)}</div><div class="panel-body err">${esc(sec.error)}</div></div>`)); continue; }
      const id = 'flow-' + sec.id;
      const kpis = sec.items.map(it => `<div class="kpi" style="padding:4px 0"><div class="lbl">${esc(it.name)} ${it.stale ? '<span class="badge stale">stale</span>' : ''}</div><div class="val" style="font-size:16px">${sec.type === 'volume' ? fmt.usd(it.latest) : it.latest == null ? '—' : (sec.id === 'stablecoins' ? fmt.usd(it.latest) : '$' + fmt.big(it.latest * 1e9))}</div><div class="sub">${sec.type === 'volume' ? `turnover ${it.turnover ?? '—'}% of mcap · ${fmt.ago(it.asOf)}` : ['d7', 'd30', 'd90'].filter(k => it[k]).map(k => `<span class="${cls(it[k].abs)}">${(it[k].abs > 0 ? '+' : '') + (sec.id === 'stablecoins' ? fmt.big(it[k].abs) : fmt.big(it[k].abs * 1e9))}</span> ${k.slice(1)}D`).join(' · ')}</div></div>`).join('');
      g.appendChild(el(`<div class="panel"><div class="panel-head">${esc(sec.title)} <span class="right"><span class="badge measured">${sec.type}</span></span></div><div class="panel-body"><div class="grid ${sec.items.length > 2 ? 'g2' : 'g2'}">${kpis}</div>${sec.type !== 'volume' ? `<div id="${id}" class="chart short" style="margin-top:6px"></div>` : ''}</div><div class="note">${esc(sec.measure)}</div></div>`));
      if (sec.type !== 'volume') chart('#' + id, { grid: { left: 55, right: 15, top: 34, bottom: 25 }, legend: { top: 0, type: 'scroll', textStyle: { color: css('--fg2'), fontSize: 10 } }, tooltip: { trigger: 'axis' }, xAxis: { type: 'time', ...axis() }, yAxis: { type: 'value', scale: true, ...axis(), name: 'USD bn', nameTextStyle: { fontSize: 9 } }, series: sec.items.filter(it => it.series && it.series.length).slice(0, 2).map((it, i) => ({ name: it.name, type: 'line', showSymbol: false, data: it.series, lineStyle: { width: 1.2, color: palette[i] }, itemStyle: { color: palette[i] } })) });
    }
  }

  /* ───────── Analytics ───────── */
  function renderAnalytics() {
    const v = $('#view-analytics'); const a = state.analytics; const allIds = state.universe.assets.filter(x => x.cls !== 'macro' || x.id === 'VIX').map(x => x.id);
    v.innerHTML = `<div class="grid g2">
      <div class="panel"><div class="panel-head">Cross-asset correlation (daily changes)<span class="right" id="corr-win"></span></div><div class="panel-body"><div id="corr-pick"></div><div id="corr-chart" class="chart tall"></div><div id="corr-meta" class="xs muted"></div></div><div class="note" id="corr-method"></div></div>
      <div class="panel"><div class="panel-head">Changing correlations: 30D vs 1Y</div><div class="panel-body tight"><table class="data" id="corr-shift"></table></div><div class="note">Pairs whose 30-day correlation differs most from the 1-year correlation — candidates for regime change or divergence. Both are measured; the interpretation is yours.</div></div>
    </div>
    <div class="grid g2" style="margin-top:10px">
      <div class="panel"><div class="panel-head">Relative performance (rebased to 100)<span class="right" id="rel-win"></span></div><div class="panel-body"><div id="rel-pick"></div><div id="rel-chart" class="chart"></div></div><div class="note">Yields/spreads are plotted in their own units (not rebased). Crypto history is limited to 365 days without a CoinGecko key.</div></div>
      <div class="panel"><div class="panel-head">Rolling 30-obs correlation<span class="right" id="roll-ctl"></span></div><div class="panel-body"><div id="roll-chart" class="chart"></div></div><div class="note">Sign flips and sustained moves toward ±1 often precede regime shifts (e.g. stock–bond correlation turning positive in inflationary regimes).</div></div>
    </div>`;
    $('#corr-win').appendChild(seg(['7D', '30D', '90D', '180D', '1Y', '5Y', '10Y'], a.window, w => { a.window = w; drawCorr(); }));
    $('#corr-pick').appendChild(multiPick(allIds, a.ids, ids => { a.ids = ids; drawCorr(); }));
    $('#rel-win').appendChild(seg(['30D', '90D', '180D', '1Y', '5Y', '10Y'], a.relWindow, w => { a.relWindow = w; drawRel(); }));
    $('#rel-pick').appendChild(multiPick(allIds, a.relIds, ids => { a.relIds = ids; drawRel(); }));
    const sel = (cur) => `<select>${allIds.map(i => `<option ${i === cur ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
    $('#roll-ctl').innerHTML = `${sel(a.rollA)} vs ${sel(a.rollB)}`; const [sA, sB] = $$('#roll-ctl select'); sA.onchange = () => { a.rollA = sA.value; drawRoll(); }; sB.onchange = () => { a.rollB = sB.value; drawRoll(); };
    $('#roll-ctl').appendChild(seg(['1Y', '5Y', '10Y'], a.rollWindow, w => { a.rollWindow = w; drawRoll(); }));
    drawCorr(); drawRel(); drawRoll(); drawShift();
  }
  async function drawCorr() {
    const a = state.analytics; if (a.ids.length < 2) return;
    const c = await api(`/analytics/correlation?window=${a.window}&ids=${a.ids.join(',')}`);
    const data = []; c.matrix.forEach((row, i) => row.forEach((val, j) => data.push([j, i, val])));
    chart('#corr-chart', { grid: { left: 70, right: 10, top: 10, bottom: 70 }, tooltip: { formatter: p => `${c.ids[p.value[1]]} × ${c.ids[p.value[0]]}<br>ρ = ${p.value[2] ?? 'n/a'} · n = ${c.samples[p.value[1]][p.value[0]]}` }, xAxis: { type: 'category', data: c.ids, ...axis(), axisLabel: { rotate: 60, fontSize: 10, color: css('--fg2') }, splitArea: { show: false } }, yAxis: { type: 'category', data: c.ids, ...axis(), axisLabel: { fontSize: 10, color: css('--fg2') } }, visualMap: { min: -1, max: 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, textStyle: { color: css('--fg3'), fontSize: 9 }, inRange: { color: [css('--heat-neg'), css('--bg2'), css('--heat-pos')] } }, series: [{ type: 'heatmap', data, label: { show: true, fontSize: 9, fontFamily: css('--mono'), color: css('--fg'), formatter: p => p.value[2] == null ? '' : p.value[2].toFixed(2) }, itemStyle: { borderColor: css('--bg'), borderWidth: 1 } }] });
    $('#corr-meta').innerHTML = `window ${c.window} (${c.days}d) · ${c.excluded.length ? 'excluded (insufficient data): ' + c.excluded.join(', ') : 'all series available'}` + Object.entries(c.meta).filter(([, m]) => m.coverageNote || m.error).map(([id, m]) => `<br>${id}: ${esc(m.coverageNote || m.error)}`).join('');
    $('#corr-method').textContent = c.method;
  }
  async function drawShift() {
    const a = state.analytics; const [s, l] = await Promise.all([api(`/analytics/correlation?window=30D&ids=${a.ids.join(',')}`), api(`/analytics/correlation?window=1Y&ids=${a.ids.join(',')}`)]);
    const rows = []; const idx = Object.fromEntries(l.ids.map((id, i) => [id, i]));
    s.ids.forEach((x, i) => s.ids.forEach((y, j) => { if (j <= i) return; const r30 = s.matrix[i][j], r1y = (idx[x] != null && idx[y] != null) ? l.matrix[idx[x]][idx[y]] : null; if (r30 == null || r1y == null) return; rows.push({ x, y, r30, r1y, d: r30 - r1y }); }));
    rows.sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
    $('#corr-shift').innerHTML = `<thead><tr><th>Pair</th><th class="num">ρ 30D</th><th class="num">ρ 1Y</th><th class="num">Shift</th><th>Read</th></tr></thead><tbody>` + rows.slice(0, 14).map(r => `<tr><td class="mono">${r.x} × ${r.y}</td><td class="num">${r.r30.toFixed(2)}</td><td class="num">${r.r1y.toFixed(2)}</td><td class="num ${cls(r.d)}">${(r.d > 0 ? '+' : '') + r.d.toFixed(2)}</td><td class="muted xs">${Math.sign(r.r30) !== Math.sign(r.r1y) && Math.abs(r.r30) > .2 ? 'sign flip' : Math.abs(r.d) > .5 ? 'large shift' : 'drift'}</td></tr>`).join('') + '</tbody>';
  }
  async function drawRel() {
    const a = state.analytics; if (!a.relIds.length) return;
    const r = await api(`/analytics/relative?window=${a.relWindow}&ids=${a.relIds.join(',')}`);
    const ids = Object.keys(r.series).filter(id => r.series[id].length);
    const diffIds = ids.filter(id => r.meta[id] && !r.meta[id].rebased);
    chart('#rel-chart', { grid: { left: 50, right: diffIds.length ? 50 : 15, top: 28, bottom: 25 }, legend: { top: 0, textStyle: { color: css('--fg2'), fontSize: 10 } }, tooltip: { trigger: 'axis' }, xAxis: { type: 'time', ...axis() }, yAxis: [{ type: 'value', scale: true, ...axis(), name: 'rebased=100', nameTextStyle: { fontSize: 9 } }, { type: 'value', scale: true, ...axis(), name: '% (yields)', nameTextStyle: { fontSize: 9 }, show: diffIds.length > 0 }], series: ids.map((id, i) => ({ name: id, type: 'line', showSymbol: false, yAxisIndex: diffIds.includes(id) ? 1 : 0, data: r.series[id], lineStyle: { width: 1.3, color: palette[i] }, itemStyle: { color: palette[i] } })) });
  }
  async function drawRoll() {
    const a = state.analytics; const r = await api(`/analytics/rolling?a=${a.rollA}&b=${a.rollB}&window=${a.rollWindow}`);
    chart('#roll-chart', { grid: { left: 45, right: 15, top: 10, bottom: 25 }, tooltip: { trigger: 'axis' }, xAxis: { type: 'time', ...axis() }, yAxis: { type: 'value', min: -1, max: 1, ...axis() }, series: [{ type: 'line', showSymbol: false, data: r.points, lineStyle: { width: 1.3, color: css('--accent2') }, areaStyle: { color: css('--accent2'), opacity: .08 }, markLine: { silent: true, symbol: 'none', lineStyle: { color: css('--fg3'), type: 'dashed' }, data: [{ yAxis: 0 }] } }] });
  }

  /* ───────── Intelligence ───────── */
  async function renderIntel() {
    const v = $('#view-intel'); v.innerHTML = '<div class="loading">Scanning for anomalies and historical pattern resemblance…</div>';
    const [an, pat, reg] = await Promise.all([api('/intel/anomalies'), api('/intel/patterns'), api('/analytics/regime')]);
    setRegimeBadge(reg);
    v.innerHTML = `
      <div class="panel"><div class="panel-head">Detected anomalies <span class="sub">${an.items.length} instrument${an.items.length === 1 ? '' : 's'} moved ≥2σ</span><span class="right"><span class="badge measured">measured</span></span></div><div class="panel-body tight"><div style="overflow-x:auto"><table class="data" id="anom-table"></table></div></div><div class="note">${esc(an.method)}</div></div>
      <div class="panel"><div class="panel-head">Historical pattern resemblance <span class="right"><span class="badge estimate">heuristic</span></span></div><div class="panel-body grid g3" id="pattern-body"></div><div class="note">${esc(pat.method)}</div></div>
    <div class="panel"><div class="panel-head">AI market intelligence <span class="right"><span class="badge ai">AI interpretation</span><input type="text" id="ai-q" placeholder="Optional question, e.g. why are yields falling?" style="width:280px"><button class="btn" id="ai-run">Run analysis</button></span></div><div class="panel-body" id="ai-body"><div class="dim">The model receives only the measured inputs above (anomalies, regime components, pattern checks, performance table) plus recent news snippets if a search key is configured. It must separate verified facts, historical relationships, hypotheses and scenarios, and cite sources. Press <b>Run analysis</b>.</div></div></div>`;
    $('#anom-table').innerHTML = an.items.length ? `<thead><tr><th>Instrument</th><th>Date</th><th class="num">1D</th><th class="num">z</th><th class="num">5D</th><th class="num">z</th><th class="num">Vol ratio</th><th>Severity</th></tr></thead><tbody>` + an.items.map(x => `<tr data-id="${x.id}"><td>${esc(x.name)}</td><td class="muted">${x.date}</td><td class="num ${cls(x.move1d)}">${x.move1d > 0 ? '+' : ''}${x.move1d}${x.unit}</td><td class="num">${x.z1}</td><td class="num ${cls(x.move5d)}">${x.move5d > 0 ? '+' : ''}${x.move5d}${x.unit}</td><td class="num">${x.z5}</td><td class="num">${x.volRatio ?? '—'}×</td><td><span class="badge ${x.severity === 'extreme' ? 'stale' : x.severity === 'high' ? 'estimate' : ''}">${x.severity}</span></td></tr>`).join('') + '</tbody>' : '<tbody><tr><td class="dim" style="padding:14px">No ≥2σ moves detected in the latest observations.</td></tr></tbody>';
    $('#anom-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };
    $('#pattern-body').innerHTML = pat.items.map(p => `<div class="pattern"><div style="display:flex;justify-content:space-between"><b>${esc(p.name)}</b><span class="mono">${p.hits}/${p.total} signatures</span></div><div class="meter"><i style="width:${(p.resemblance * 100).toFixed(0)}%"></i></div><div class="xs dim" style="margin-bottom:4px">${esc(p.summary)}</div>${p.checks.map(c => `<div class="check ${c.hit ? 'hit' : 'miss'}"><span>${c.hit ? '●' : '○'}</span><span>${esc(c.label)}</span></div>`).join('')}<div class="xs" style="margin-top:4px">${p.sources.map(s => `<a href="${s}" target="_blank" rel="noopener">${new URL(s).host}</a>`).join(' · ')}</div></div>`).join('');
    $('#ai-run').onclick = runAI;
  }
  async function runAI() {
    const b = $('#ai-body'); const btn = $('#ai-run'); btn.disabled = true; b.innerHTML = '<div class="loading">Gathering evidence and querying the model…</div>';
    try {
      const r = await api('/intel/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: $('#ai-q').value || undefined }) });
      if (!r.aiStatus.configured) { b.innerHTML = `<div class="callout warn">${esc(r.aiStatus.message)}</div><div class="dim">Measured inputs that would be sent: ${r.inputs.anomalies.length} anomalies, regime ${esc(r.regime.label)}, ${r.patterns.items.reduce((s, p) => s + p.hits, 0)} pattern signatures present.</div>`; return; }
      if (r.aiStatus.error) { b.innerHTML = `<div class="callout err">AI request failed: ${esc(r.aiStatus.error)}</div>`; return; }
      const ai = r.ai || {}; const news = (r.news && r.news.items) || [];
      b.innerHTML = `<div class="callout"><b>Overview</b> — ${esc(ai.overview || '')}</div>` + (ai.findings || []).map(f => `<div class="finding"><h4>${esc(f.signal)} <span class="badge ${f.confidence === 'High' ? 'measured' : f.confidence === 'Medium' ? 'estimate' : 'stale'}">${esc(f.confidence)} confidence</span></h4>
        <div class="row"><b>Evidence</b><ul>${(f.evidence || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="row"><b>Possible cause</b><div>${esc(f.possibleCause)}</div></div>
        <div class="row"><b>Cross-asset impact</b><div>${esc(f.crossAssetImpact)}</div></div>
        <div class="row"><b>Confidence</b><div>${esc(f.confidence)} — ${esc(f.confidenceWhy)}</div></div>
        <div class="row"><b>What to watch</b><ul>${(f.whatToWatch || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${f.classification ? `<div class="row"><b>Classification</b><div class="xs">${['verifiedFacts', 'historicalRelationships', 'hypotheses', 'scenarios'].filter(k => (f.classification[k] || []).length).map(k => `<div><span class="badge ${k === 'verifiedFacts' ? 'measured' : k === 'hypotheses' ? 'ai' : 'estimate'}">${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span> ${(f.classification[k] || []).map(esc).join(' · ')}</div>`).join('')}</div></div>` : ''}
        ${(f.citations || []).length ? `<div class="row"><b>Sources</b><div class="xs">${f.citations.map(n => news[n - 1] ? `[${n}] <a href="${esc(news[n - 1].url)}" target="_blank" rel="noopener">${esc(news[n - 1].title)}</a>` : `[${n}]`).join('<br>')}</div></div>` : ''}
      </div>`).join('') + `<div class="xs muted">Model: ${esc(r.aiStatus.model || '')} · ${news.length ? news.length + ' news snippets supplied' : esc((r.news && r.news.note) || 'no news supplied')} · Data sources: Yahoo Finance (delayed), FRED, CoinGecko, gold-api.</div>`;
    } catch (e) { b.innerHTML = `<div class="callout err">${esc(e.message)}</div>`; } finally { btn.disabled = false; }
  }

  /* ───────── Shock simulator ───────── */
  async function renderShock() {
    const v = $('#view-shock'); const s = state.shock; const drivers = state.universe.shockDrivers;
    v.innerHTML = `<div class="grid g-main">
      <div class="panel"><div class="panel-head">Market shock simulator <span class="right"><span class="badge estimate">scenario estimate</span></span></div><div class="panel-body">
        <div class="toolbar" style="border:0;padding:0 0 8px"><label>Shock to</label><select id="sh-driver">${drivers.map(d => `<option value="${d.id}" ${d.id === s.driver ? 'selected' : ''}>${d.label}</option>`).join('')}</select><label>Betas from</label><span id="sh-win"></span></div>
        <div class="slider-row"><label id="sh-label">Size</label><input type="range" id="sh-range"><input type="number" id="sh-num" step="1"></div>
        <div id="sh-chart" class="chart tall"></div></div>
        <div class="note">Estimated move = β × shock, where β is the OLS slope of each instrument's daily change on the driver's daily change over the selected window. R² shows how much of the instrument's variance the driver explained historically. These are statistical sensitivities, not forecasts — relationships can invert in a crisis (2008: everything fell together; 2022: stocks and bonds fell together).</div></div>
      <div class="panel"><div class="panel-head">Sensitivities</div><div class="panel-body tight"><div class="table-wrap"><table class="data" id="sh-table"></table></div></div></div>
    </div>`;
    const setDriver = () => { const d = drivers.find(x => x.id === s.driver); const r = $('#sh-range'); r.min = d.range[0]; r.max = d.range[1]; r.step = d.step; if (s.value < d.range[0] || s.value > d.range[1]) s.value = d.unit === 'bp' ? 50 : -10; r.value = s.value; $('#sh-num').value = s.value; $('#sh-label').textContent = `Shock size (${d.unit})`; };
    $('#sh-driver').onchange = e => { s.driver = e.target.value; setDriver(); loadBetas(); };
    $('#sh-win').appendChild(seg(['180D', '1Y', '5Y', '10Y'], s.window, w => { s.window = w; loadBetas(); }));
    $('#sh-range').oninput = e => { s.value = Number(e.target.value); $('#sh-num').value = s.value; drawShock(); };
    $('#sh-num').onchange = e => { s.value = Number(e.target.value); $('#sh-range').value = s.value; drawShock(); };
    setDriver(); loadBetas();
    async function loadBetas() { $('#sh-table').innerHTML = '<tbody><tr><td class="loading">computing betas…</td></tr></tbody>'; s.betas = await api(`/shock/betas?driver=${s.driver}&window=${s.window}`); drawShock(); }
    function drawShock() {
      const b = s.betas; if (!b) return; const d = drivers.find(x => x.id === s.driver);
      const rows = b.targets.filter(t => t.beta != null).map(t => ({ ...t, est: t.beta * s.value }));
      rows.sort((x, y) => y.est - x.est);
      chart('#sh-chart', { grid: { left: 150, right: 60, top: 10, bottom: 25 }, tooltip: { formatter: p => { const r = rows[p.dataIndex]; return `${esc(r.name)}<br>est. ${r.est > 0 ? '+' : ''}${r.est.toFixed(2)} ${r.unit}<br>β ${r.beta} · R² ${r.r2} · n ${r.n}`; } }, xAxis: { type: 'value', ...axis(), axisLabel: { formatter: v => v } }, yAxis: { type: 'category', inverse: true, data: rows.map(r => r.name.length > 24 ? r.name.slice(0, 22) + '…' : r.name), ...axis(), axisLabel: { fontSize: 10, color: css('--fg2') } }, series: [{ type: 'bar', barMaxWidth: 12, data: rows.map(r => ({ value: Number(r.est.toFixed(2)), itemStyle: { color: r.est >= 0 ? css('--up') : css('--down'), opacity: 0.35 + 0.65 * Math.min(1, r.r2 * 2.5) } })), label: { show: true, position: 'right', fontSize: 9, color: css('--fg3'), formatter: p => `${p.value > 0 ? '+' : ''}${p.value}${rows[p.dataIndex].unit}` } }] });
      $('#sh-table').innerHTML = `<caption class="xs muted" style="text-align:left;padding:6px 8px">If <b>${esc(d.label)}</b> moves <b class="${cls(s.value)}">${s.value > 0 ? '+' : ''}${s.value} ${d.unit}</b> (betas: ${b.window}, opacity ∝ R²)</caption><thead><tr><th>Instrument</th><th class="num">Est. move</th><th class="num">β</th><th class="num">R²</th><th class="num">n</th></tr></thead><tbody>` + rows.map(r => `<tr data-id="${r.id}"><td>${esc(r.name)}</td><td class="num ${cls(r.est)}">${r.est > 0 ? '+' : ''}${r.est.toFixed(2)} ${r.unit}</td><td class="num">${r.beta}</td><td class="num ${r.r2 < 0.05 ? 'muted' : ''}">${r.r2}</td><td class="num muted">${r.n}</td></tr>`).join('') + '</tbody>';
      $('#sh-table').onclick = e => { const t = e.target.closest('tr[data-id]'); if (t) openDrawer(t.dataset.id); };
    }
  }

  /* ───────── Admin ───────── */
  async function renderAdmin() {
    const v = $('#view-admin'); const a = state.admin;
    const hdr = () => ({ authorization: 'Bearer ' + a.token, 'content-type': 'application/json' });
    v.innerHTML = `<div class="grid g2"><div class="panel"><div class="panel-head">Admin — API credentials</div><div class="panel-body">
      <div class="form-row"><label>Admin token</label><div style="display:flex;gap:6px"><input type="password" id="adm-token" value="${esc(a.token)}" placeholder="ADMIN_TOKEN secret"><button class="btn secondary" id="adm-unlock">Unlock</button></div><div class="help">Set with <code>wrangler secret put ADMIN_TOKEN</code> (or ADMIN_TOKEN in .dev.vars for local). Stored in this browser session only.</div></div>
      <div id="adm-fields"></div></div></div>
      <div class="panel"><div class="panel-head">Source status & cache</div><div class="panel-body" id="adm-status"><div class="dim">Unlock to view.</div></div></div>
      <div class="panel"><div class="panel-head">Market-size reference overrides</div><div class="panel-body" id="adm-sizes"><div class="dim">Unlock to edit.</div></div><div class="note">Published aggregates used by the Overview treemap. Edit when a newer Fact Book / WGC figure is available; always keep the source and as-of.</div></div>
      <div class="panel"><div class="panel-head">Deployment notes</div><div class="panel-body dim small"><p><b>Live sources (no key):</b> Yahoo Finance chart API (delayed), FRED fredgraph CSV, CoinGecko public, gold-api.com.</p><p><b>Optional keys:</b> FRED, EIA, CoinGecko (longer history), Anthropic (AI module), Exa/Parallel (news citations).</p><p><b>Demo mode:</b> set <code>DEMO_MODE="true"</code> in wrangler.toml — the app shows a permanent banner and every badge reads <i>demo</i>.</p><p><b>Cache:</b> quotes 60s, histories 15min, macro 1h (TTL_* vars). Stale cache is served, flagged red, when a source fails.</p></div></div></div>`;
    const unlock = async () => {
      a.token = $('#adm-token').value; sessionStorage.setItem('cft:admin', a.token);
      try {
        const [k, st, sz] = await Promise.all([api('/admin/keys', { headers: hdr() }), api('/admin/status', { headers: hdr() }), api('/admin/sizes', { headers: hdr() })]);
        $('#adm-fields').innerHTML = k.fields.map(f => `<div class="form-row"><label>${esc(f.label)} ${f.configured ? '<span class="badge measured">set' + (f.fromEnv ? ' (env)' : '') + '</span>' : '<span class="badge">not set</span>'}</label><input type="${f.secret === false ? 'text' : 'password'}" data-key="${f.key}" placeholder="${esc(f.value || 'paste key…')}"><div class="help">${esc(f.help)}</div></div>`).join('') + `<div style="margin-top:8px;display:flex;gap:6px"><button class="btn" id="adm-save">Save credentials</button><span class="dim xs">Leave a field blank to keep its current value; type <code>clear</code> to remove.</span></div>`;
        $('#adm-save').onclick = async () => { const upd = {}; $$('#adm-fields input[data-key]').forEach(i => { if (i.value) upd[i.dataset.key] = i.value === 'clear' ? '' : i.value; }); await api('/admin/keys', { method: 'POST', headers: hdr(), body: JSON.stringify(upd) }); unlock(); };
        $('#adm-status').innerHTML = `<table class="data"><thead><tr><th>Source</th><th class="num">OK</th><th class="num">Failed</th><th class="num">Stale</th><th>Errors</th></tr></thead><tbody>${Object.entries(st.bySource).map(([s, x]) => `<tr><td>${s}</td><td class="num up">${x.ok}</td><td class="num ${x.failed ? 'down' : ''}">${x.failed}</td><td class="num ${x.stale ? 'down' : ''}">${x.stale}</td><td class="xs muted">${x.errors.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table><div class="xs dim" style="margin:6px 0">KV: ${st.kv ? 'bound' : 'missing (memory cache only)'} · D1: ${st.d1 ? 'bound' : 'not configured'} · demo: ${st.demoMode}</div><button class="btn secondary" id="adm-clear">Clear cache</button>`;
        $('#adm-clear').onclick = async () => { const r = await api('/admin/cache/clear', { method: 'POST', headers: hdr() }); alert(`Cleared ${r.cleared} cache entries`); };
        $('#adm-sizes').innerHTML = sz.references.filter(r => !['CRYPTO_TOTAL'].includes(r.id)).map(r => `<div class="form-row"><label>${esc(r.label)} <span class="xs muted">${r.measure}</span></label><div style="display:flex;gap:4px;flex-wrap:wrap"><input type="number" data-sz="${r.id}" data-f="${r.tonnes ? 'tonnes' : 'usd'}" placeholder="${r.tonnes ? r.tonnes + ' t' : (r.usd / 1e12).toFixed(1) + ' $T'}" value="${r.override ? (r.override.tonnes || r.override.usd / 1e12) : ''}" style="width:110px"><input type="text" data-szs="${r.id}" placeholder="${esc(r.source)}" value="${esc(r.override?.source || '')}" style="flex:1"><input type="text" data-sza="${r.id}" placeholder="${esc(r.asOf)}" value="${esc(r.override?.asOf || '')}" style="width:70px"></div></div>`).join('') + `<div style="margin-top:8px"><button class="btn" id="adm-size-save">Save overrides</button></div>`;
        $('#adm-size-save').onclick = async () => { const o = {}; $$('#adm-sizes input[data-sz]').forEach(i => { if (!i.value) return; const id = i.dataset.sz; o[id] = i.dataset.f === 'tonnes' ? { tonnes: Number(i.value) } : { usd: Number(i.value) * 1e12 }; o[id].source = $(`[data-szs="${id}"]`).value || undefined; o[id].asOf = $(`[data-sza="${id}"]`).value || undefined; }); await api('/admin/sizes', { method: 'POST', headers: hdr(), body: JSON.stringify(o) }); alert('Saved'); };
      } catch (e) { $('#adm-fields').innerHTML = `<div class="callout err">${esc(e.message)}</div>`; }
    };
    $('#adm-unlock').onclick = unlock; if (a.token) unlock();
  }

  /* ───────── navigation / boot ───────── */
  const renderers = { overview: renderOverview, monitor: renderMonitor, flows: renderFlows, analytics: renderAnalytics, intel: renderIntel, shock: renderShock, admin: renderAdmin };
  async function show(view) {
    state.view = view; $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view)); $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    location.hash = view;
    try { await renderers[view](); } catch (e) { $('#view-' + view).innerHTML = `<div class="callout err">Failed to load: ${esc(e.message)}</div>`; }
  }
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.view); };
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h in renderers && h !== state.view) show(h); });
  $('#theme-btn').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('cft:theme', t); show(state.view); };
  if (localStorage.getItem('cft:theme')) document.documentElement.dataset.theme = localStorage.getItem('cft:theme');
  $('#refresh-btn').onclick = async () => { await loadCore(); show(state.view); };
  const cb = $('#connect-btn');
  if (cb) {
    const box = $('#connect-box'); $('#connect-url').value = apiBase;
    cb.onclick = () => { box.hidden = !box.hidden; };
    $('#connect-save').onclick = () => { apiBase = $('#connect-url').value.trim(); try { localStorage.setItem('cft:apiBase', apiBase); } catch (e) {} location.reload(); };
    if (SNAP && !apiBase) { const b = $('#snapshot-banner'); b.hidden = false; b.innerHTML = `LIVE DATA SNAPSHOT captured ${SNAP.capturedAt.replace('T', ' ').slice(0, 16)} UTC from the real sources (Yahoo delayed, FRED, CoinGecko, gold-api). Not updating. Connect your deployed Worker (⛓ top right) for live streaming.`; }
    if (apiBase) cb.classList.add('on');
  }
  (async () => {
    try { await loadCore(); } catch (e) { $('#ticker-inner').innerHTML = `<span class="down">Failed to load quotes: ${esc(e.message)}</span>`; $('#view-overview').innerHTML = `<div class="callout err">The API is unreachable (${esc(e.message)}). Check that the Worker is running and that outbound fetches to the data sources are allowed.</div>`; return; }
    show((location.hash || '#overview').slice(1) in renderers ? location.hash.slice(1) : 'overview');
    setInterval(async () => { try { await loadCore(); if (state.view === 'monitor') drawMonTable(); } catch (e) {} }, 60000); // poll quotes every minute
  })();
})();
