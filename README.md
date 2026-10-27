# Capital Flow Terminal

**Global Capital Flow & Market Intelligence Dashboard** — a Cloudflare Worker + static terminal UI that answers:
*where is global capital concentrated, how are markets changing, and what are the cross-asset implications?*

Phase 1 (working MVP) is complete; the Phase 2/3 modules are wired and run on measured data, with the AI layer
activating once an Anthropic key is added in Admin. No prices, flows or AI evidence are ever fabricated — every
number carries its source, freshness and as-of time, and failed sources are shown as stale/unavailable.

## What is in the box

| Module | Status | What it does |
|---|---|---|
| A. Global Market Overview | ✅ live | Treemap of asset-class size (equities & bonds = published aggregates with source; gold = WGC stock × live spot; crypto = live CoinGecko), KPI cards with sparklines, performance-by-class, macro conditions table, rules-based risk-on/off regime |
| B. Live Market Monitor | ✅ live | 56 instruments across equities (US/EU/CN/JP/EM), rates, credit, crypto, commodities, FX, macro. Horizons 1D–1Y, realised vol, 52-week position, volume, market cap, freshness badge, as-of, source. Sort / filter / search / watchlist (localStorage) / CSV export / drill-down drawer with 30D–10Y chart |
| C. Capital Flow Monitor | ✅ measured only | Stablecoin net issuance (USDT/USDC supply), Fed net liquidity (assets − RRP − TGA), crypto turnover (explicitly labelled *volume, not flow*). ETF flows / exchange net flows / CFTC positioning are listed **unavailable** until a licensed adapter is added — never estimated |
| D. Cross-Asset Analytics | ✅ live | Correlation heatmap (7D–10Y), 30D-vs-1Y correlation shifts (sign flips), relative performance rebased to 100, rolling correlation for any pair |
| E. AI Market Intelligence | ✅ measured + 🔑 AI (stored reading, admin/scheduled refresh) | z-score anomaly detection, 1987 / 2000 / 2008 pattern-signature resemblance; with an Anthropic key the model returns *Signal → Evidence → Possible Cause → Cross-Asset Impact → Confidence → What to Watch* with facts / historical relationships / hypotheses / scenarios separated and news citations (Exa or Parallel key optional) |
| F. Market Shock Simulator | ✅ live | Shock SPX / 10Y yield / BTC / gold / WTI / DXY; OLS betas and R² over 180D–10Y; outcomes labelled scenario estimates |
| News sidebar | ✅ | Global + Indonesian headlines on markets, finance and geopolitics from public RSS feeds (Google News EN/ID queries, MarketWatch, BBC Business, Al Jazeera, CNBC Indonesia, Antara), keyword-classified, filterable by region and category; optional AI curation (20–30 picks with a one-line reason and assets touched) run from Admin or by the nightly job |
| Live TV | ✅ | Broadcasters' own HLS (.m3u8) streams played with hls.js 1.5.20 (no YouTube): Bloomberg TV US / TV+ / Asia / Europe / Australia, CNBC Arabiya, BeritaSatu, TVRI World, TVRI Nasional, Al Jazeera English, BBC News, France 24, DW, Euronews, NHK World, CGTN, ABC Australia, Al Arabiya, Sky News Arabia. Direct playback first; `/api/hls` relay as fallback (adds CORS/Referer, only for listed hosts or links it signed, only for this site; segments CDN-cached). Maximize, pop out (`/tv.html`), mute toggle, pauses when the tab is hidden. Admin can edit the list |
| Persistent store | ✅ | Everything collected is kept: daily price histories (`hist/*`), a daily snapshot of performance/regime/stress/anomalies (`snap/YYYY-MM-DD`), AI readings (+ archive), curated news, channel list and AES-GCM-encrypted admin credentials. Backends: Vercel Blob → Cloudflare KV → local file → memory |
| Admin | ✅ | Token-protected page: API keys with Test buttons, AI reading refresh with model choice, news curation, TV channel editor, store status + "store collected data now", market-size overrides, per-source status, clear cache |

## Real-time option (off by default)

Admin → credentials → **Real-time** group. Switch *Real-time updates* to `on`, choose an interval, and add any of:

| Provider | Covers in this app | Cost (2026) | Path |
|---|---|---|---|
| Coinbase Exchange public WebSocket | BTC, ETH, SOL tick-by-tick | Free, no key | Browser connects directly |
| Alpaca Basic | US ETFs (EEM, TLT, LQD, HYG, EMB, DBA), IEX venue only | Free (Algo Trader Plus $99/mo = all US exchanges) | Server-proxied |
| Finnhub Free | Same US ETFs | Free, ~60 calls/min, personal use | Server-proxied |
| Twelve Data | EUR, JPY, GBP, CNY, IDR, gold, silver, crypto, ETFs | Free 8 credits/min (non-display); Grow from $29/mo | Server-proxied, interval stretched to the credit budget |
| Massive (Polygon.io) | S&P 500, Nasdaq 100, Russell 2000, VIX, ETFs, FX, metals, crypto | ~$79/mo per asset class for real-time (Developer); lower tiers are 15-min delayed and labelled so | Server-proxied, one call |

Keys never reach the browser: `/api/rt/quotes` polls the configured providers at the interval and caches the result at the
edge for that long, so all visitors share one upstream call per interval. Each updated price is relabelled `live` with its
provider and timestamp. Index levels only come from a provider that publishes the index (no ETF proxies). Non-US indices,
yields, spreads, oil, copper, grains and macro series keep their standard (delayed / end-of-day) sources.

## Valuation and systematic-selling measures

Two pre-crash conditions are measured from free official data and public prices (`src/valuation.js`):

* **Stretched valuation**: market value of US corporate equities ÷ GDP (FRED `NCBEILQ027S` ÷ `GDP`) and ÷ after-tax
  corporate profits (`CP`), ranked against history since 1947. The quarterly value is carried forward with the S&P 500
  move since quarter end and labelled *nowcast*. Reference points: 1987 ≈ 60% of GDP, 2000 ≈ 163%, 2007 ≈ 121%.
* **Mechanical selling in place**: a 10%-volatility-target model (exposure = 10 ÷ 21-day realised vol, capped 1.5×),
  VIX ÷ VIX3M term structure, and distance from the 50-day average. *Primed* when model exposure is in the top quarter
  of five years; *under way* when VIX > VIX3M or exposure has been cut 30%+ in ten sessions. Labelled *model*.

## Glossary

`#glossary` explains every term used in the app in plain language (86 terms in 8 sections, searchable, with an
example from the dashboard and related terms). Content lives in `public/glossary.js`.

## Data sources

| Source | Key | Used for | Freshness |
|---|---|---|---|
| Yahoo Finance chart API | none | indices, ETFs, futures, FX, VIX; 10Y daily history | delayed (≈15 min) |
| FRED (St. Louis Fed) | optional `FRED_API_KEY` | Treasury yields, OAS spreads, fed funds, CPI, breakevens, Fed balance sheet, RRP, TGA, M2, ECB rate, broad USD | end-of-day / weekly / monthly |
| CoinGecko public API | optional `COINGECKO_API_KEY` | BTC, ETH, SOL, USDT, USDC prices, market caps, volumes, total crypto cap; 365d history (longer with key) | near real-time |
| gold-api.com | none | spot gold and silver | near real-time |
| U.S. EIA | optional `EIA_API_KEY` | official WTI / Brent / Henry Hub spot overlay | end-of-day |
| Anthropic API | optional `ANTHROPIC_API_KEY` | AI explanations | — |
| Exa / Parallel | optional `EXA_API_KEY` / `PARALLEL_API_KEY` + `SEARCH_PROVIDER` | news citations for the AI module | — |
| Public RSS (Google News, MarketWatch, BBC, Al Jazeera, CNBC Indonesia, Antara) | none | news sidebar | 10-minute cache |
| YouTube live embeds | none | TV sidebar | live |

Reference aggregates (SIFMA Capital Markets Fact Book 2026 ed., World Gold Council above-ground stock) are stored
in `src/universe.js` with source and as-of, and can be overridden in Admin.

## Run locally (no Cloudflare account needed)

```bash
git clone … && cd capital-flow-terminal
cp .dev.vars.example .dev.vars      # set ADMIN_TOKEN at least
node local/server.mjs               # → http://localhost:8787   (Node ≥ 18, zero dependencies)
```

`local/server.mjs` runs the Worker in Node with an in-memory KV shim persisted to `local/.kv.json` and a file-backed
persistent store in `local/.store/` (same interface as Vercel Blob / Cloudflare KV in production).
Or, with wrangler: `npm install && npm run dev`.

Smoke test: `node local/check.mjs` hits every API route and reports source status.

## Deploy to Vercel (current production)

Production: **https://capital-flow-terminal-dyn-srv.vercel.app** (Vercel project `capital-flow-terminal`, team DynSrv).

The API runs as a single Edge Function (`api/index.js` wraps the same Worker code); the UI is served statically.
Two ways to deploy:

1. **Git-linked (recommended once the Vercel GitHub integration is installed):** import `dynsrv/capital-flow-terminal-` in the Vercel dashboard; zero config — Vercel detects `api/` and `public/` and reads `vercel.json`.
2. **Bootstrap build (what is deployed now, no GitHub integration needed):** `deploy/vercel/build.sh` clones this repo at build time and emits a Build Output API bundle. Redeploy from the Vercel dashboard ("Redeploy" on the latest deployment) or push the two files in `deploy/vercel/` with `vercel deploy --prod`. The build always pulls the latest `main`.

Environment variables (Vercel → Settings → Environment Variables): `ADMIN_TOKEN` (set), `CRON_SECRET` (set; Vercel sends it on the daily `/api/cron/refresh` call), `DEMO_MODE=false`, plus any optional keys from the table above. `BLOB_READ_WRITE_TOKEN` is injected by the linked private Blob store and is the persistent store (histories, snapshots, AI readings, curated news, channels, encrypted admin keys). `STORE_SECRET` (optional) keys the credential encryption; it falls back to `ADMIN_TOKEN`. The daily cron (`0 22 * * *`, in `vercel.json` and the bootstrap `config.json`) calls `/api/cron/refresh`, which re-persists histories, writes the day's snapshot, refreshes the AI reading if `AI_AUTO_REFRESH` is `daily`/`on-change`, and curates news if `NEWS_AI_CURATION` is `daily`. Public GET routes send `s-maxage` headers so Vercel's CDN absorbs repeat traffic; admin and cron routes are `no-store`.

## Deploy to Cloudflare Workers

```bash
npm install
npx wrangler login
npx wrangler kv namespace create CACHE            # paste the id into wrangler.toml
npx wrangler secret put ADMIN_TOKEN               # required for /admin
# optional: wrangler secret put FRED_API_KEY / EIA_API_KEY / COINGECKO_API_KEY / ANTHROPIC_API_KEY / SEARCH_API_KEY
npm run deploy
```

The cron trigger (`*/5 * * * *`) warms the quote and history caches. Keys can also be entered in the Admin page
after deployment; admin-entered values take precedence over environment secrets.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | yes (for Admin) | Bearer token for `/api/admin/*` and the Admin page |
| `DEMO_MODE` | no (`false`) | `true` serves a deterministic synthetic dataset with a permanent **DEMO MODE** banner |
| `TTL_QUOTES` / `TTL_HISTORY` / `TTL_MACRO` | no (60 / 900 / 3600 s) | cache TTLs per data tier |
| `FRED_API_KEY`, `EIA_API_KEY`, `COINGECKO_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SEARCH_API_KEY`, `SEARCH_PROVIDER`, `MARKET_DATA_API_KEY` | no | see data sources |

## API

All routes return `{ ok, demoMode, generatedAt, ms, … }` and never throw HTML.

```
GET  /api/health
GET  /api/universe
GET  /api/quotes?ids=SPX,BTC
GET  /api/history?id=SPX&window=1Y
GET  /api/performance?ids=…
GET  /api/overview
GET  /api/analytics/correlation?window=30D&ids=…
GET  /api/analytics/rolling?a=SPX&b=UST10Y&window=1Y&lookback=30
GET  /api/analytics/relative?window=1Y&ids=…
GET  /api/analytics/regime
GET  /api/flows
GET  /api/intel/anomalies
GET  /api/intel/patterns
POST /api/intel/explain          { ids?, question? }
GET  /api/shock/betas?driver=UST10Y&window=1Y&ids=…
GET  /api/news                   headlines + curated picks (if any)
GET  /api/tv/streams
GET  /api/intel/reading, /api/intel/precrash, /api/risk/*
GET  /api/cron/refresh           (Bearer CRON_SECRET or admin) persist + snapshot + AI/news refresh
POST /api/admin/ai-refresh, /api/admin/news-curate, /api/admin/persist; GET/POST /api/admin/tv; GET /api/admin/store, /api/admin/models, /api/admin/readings, /api/admin/news-sources
GET/POST /api/admin/keys, /api/admin/sizes, /api/admin/status, POST /api/admin/cache/clear   (Bearer ADMIN_TOKEN)
```

Every quote object carries `source`, `freshness` (`realtime | delayed | eod | weekly | monthly | demo`), `asOf`,
`fetchedAt`, `stale` and `error`, so the UI can show exactly what it is looking at.

## Architecture

```
public/              static terminal UI (vanilla JS + ECharts, dark/light, responsive); tv.html = pop-out player
src/index.js         Worker: router, admin, cron warm-up
src/universe.js      asset universe + reference market sizes (one place to add instruments)
src/data.js          quote/history resolution, caching, EIA overlay, market-size computation
src/adapters/*.js    one file per source (yahoo, fred, coingecko, goldapi, eia)
src/analytics.js     returns, vol, drawdown, correlation, rolling corr, regime, anomalies, OLS betas, crisis patterns
src/flows.js         measured flow / liquidity series
src/ai.js            Anthropic + Exa/Parallel integration for the intelligence module
src/news.js          RSS aggregation, keyword classification, optional AI curation
src/tv.js            live TV channel list (defaults + admin overrides)
src/reading.js       stored AI reading, staleness fingerprint, scheduled refresh
src/precrash.js      pre-crash condition checklists (1987, 2000, 2008, 2020, 2022)
src/lib/store.js     persistent store: Vercel Blob / Cloudflare KV / injected / memory, AES-GCM for secrets
src/lib/cache.js     KV or in-memory cache with stale-on-error
src/lib/config.js    credential resolution (Admin KV > env)
local/server.mjs     Node runner with KV shim
```

**Adding an instrument:** add one line to `ASSETS` in `src/universe.js`. **Adding a source:** write an adapter in
`src/adapters/`, handle it in `src/data.js`, and (if it needs a key) add the field to `CREDENTIAL_FIELDS`.

## Honesty rules enforced in code

* Market cap, debt outstanding, physical stock value, traded volume and capital flow are labelled as different measures.
* Price rises and volume are never shown as inflows; flow sections without licensed data say *unavailable*.
* Cache fallbacks are flagged `stale` with the upstream error; nothing is interpolated.
* Regime, anomaly, pattern and shock outputs are labelled *rules-based / heuristic / scenario estimate*.
* The AI module only receives measured inputs and must separate verified facts from hypotheses and cite sources.

## Roadmap (Phase 2–3)

* Licensed ETF-flow / exchange-flow / CFTC adapters for the Capital Flow Monitor
* Scheduled alerting (regime changes, ≥3σ anomalies) via cron + email/webhook
* D1 historical storage for intraday snapshots and longer crypto history
* Multi-factor sensitivity models (regularised regressions, regime-conditional betas)

Data is for information only and not investment advice. Check each provider's terms before commercial use.
