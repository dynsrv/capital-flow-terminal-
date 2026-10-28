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

**Routing (Admin → Real-time data routing):** set the provider priority, pick a source per instrument (Auto, a
specific provider, or Off), and press **Scan my plans** to test every instrument against every saved key (✓ priced,
D delayed, ✕ not in plan). Anything a provider cannot price falls through to the next provider automatically and the
gap is remembered for six hours; the daily job re-scans. Extra mappings: Finnhub for EUR/JPY/GBP, gold, silver and US
indices (paid Finnhub plans), Alpaca for BTC/ETH/SOL.

Keys never reach the browser: `/api/rt/quotes` polls the configured providers at the interval and caches the result at the
edge for that long, so all visitors share one upstream call per interval. Each updated price is relabelled `live` with its
provider and timestamp. Index levels only come from a provider that publishes the index (no ETF proxies). Non-US indices,
yields, spreads, oil, copper, grains and macro series keep their standard (delayed / end-of-day) sources.

**US Dollar Index and commodities:** ICE does not license the Dollar Index to any of these providers, so the router
computes it with ICE's published formula (50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091 ×
USDSEK^0.042 × USDCHF^0.036) from six live FX rates, labelled *ICE formula*; it is live only when all six are priced and the
three extra legs are polled only while DXY uses the formula. WTI, Brent, natural gas and copper can route to Finnhub
(OANDA prices, paid plans) or Twelve Data (paid plans); until a scan shows ✓ they keep their delayed futures source.
Twelve Data requests are split into credit-sized chunks refreshed in turn, and *Scan my plans* tests a credit's worth of
Twelve Data symbols per press (the Admin line says how many are left).

**WebSocket streams (Admin → credentials → Real-time):** each provider that offers a stream has its own switch.
Vercel Edge cannot hold sockets open, so streams run in the browser, which means the key travels with the stream:

| Switch | Modes | Stream | Notes |
|---|---|---|---|
| Massive WebSocket | off · admin | `wss://socket.massive.com/stocks` trades | One connection per key, so admin only. Without real-time on the plan it falls back to per-second bars from `delayed.massive.com` (15-min delayed, labelled) |
| Alpaca WebSocket | off · admin | `stream.data.alpaca.markets/v2/iex` trades | One connection per key on Basic, so admin only |
| Finnhub WebSocket | off · admin · everyone | `ws.finnhub.io` trades | `everyone` puts the key in every visitor's browser |
| Twelve Data WebSocket | off · admin · everyone | `ws.twelvedata.com` price events | Symbols outside the plan are listed in Admin |

`admin` streams only in a browser unlocked with the admin token (`/api/admin/rt-sockets`); `everyone` is published in
`/api/rt/config`. Admin → Real-time shows each stream's status, symbol count, ticks and last tick. Polling keeps running
underneath, so a stream that drops never leaves a price stale.

## Roles: visitor, member, admin

| | Visitor | Member | Admin |
|---|---|---|---|
| Sign-in | none | PIN (6–10 digits), *Sign in* top right | `ADMIN_TOKEN` at `#admin` |
| Prices and ticker | delayed (free public sources) | live when real-time is on | live when real-time is on |
| Paid provider calls | never: `/api/rt/config` returns real-time off and `/api/rt/quotes` answers 401 | shared, at the real-time interval | same, plus admin-only WebSocket streams |
| Live TV | direct streams | all channels, including the `/api/hls` relay | all channels |

- Members are managed in Admin → Members (add, new PIN, disable, sign out everywhere, remove). PINs are stored only as
  HMAC(server secret, salt + PIN) inside the encrypted store document `auth/members`; each PIN must be unique.
- A sign-in returns a signed 30-day session token (`m1.<id>.<gen>.<exp>.<sig>`); new PIN, disable or *Sign out everywhere*
  bumps `gen` and ends existing sessions. Five wrong PINs from one address pause sign-in for 15 minutes (per instance).
- WebSocket mode `members` (formerly `everyone`) hands the Finnhub / Twelve Data key to signed-in members only.
- `/api/rt/*` responses are `private, no-store`, so a CDN never serves live prices to a visitor.

## Admin console

`#admin` is a dedicated console: the ticker, news and TV sidebar, page navigation and footer are hidden, and the header
shows *Back to terminal* and *Lock*. Sections: Overview, API keys, Members, Real-time, AI & news, Usage & logs, Live TV,
Appearance, Data & storage. Real-time (which probes providers) and Usage (which lists storage) load only when opened.

## Usage & API logs (Admin)

Every upstream call goes through one fetch helper, which records the service, operation (path only: keys, tickers and
query strings are never logged), status, latency and size. Anthropic responses add model and token counts (input, cache
write, cache read, output); Exa adds its reported `costDollars`; Twelve Data counts credits (one per symbol). Storage
operations and our own function invocations are counted too, as are live-TV relay requests.

- **Estimate:** list prices as of 28 Oct 2026 (Anthropic per-model token rates including Haiku 5.5's long-prompt tier,
  Exa $7/1k searches, Parallel $1/1k, Vercel $0.60/M invocations, Blob $5/M writes and $0.40/M reads), editable in Admin,
  plus monthly plan fees you enter. Month to date, a straight-line projection, a daily chart by service, a per-service
  table with per-operation detail, model token use, and a filterable API log with CSV export.
- **Storage:** each server instance keeps counts in memory and saves one shard per day (`usage/d/<day>/<instance>`) at most
  every *Usage save interval* minutes (default 60) and only when something changed; a model call saves on the next request.
  The daily job folds finished days into `usage/day/<day>`. Counts from an instance that stops before its next save are
  lost, so totals are a floor; provider dashboards and Vercel's usage page are the billing record.
- **Settings:** *Usage meter* (on/off) and *Usage save interval* in the credentials panel (group Usage).
- Admin keys are now read from storage at most once every 30 s per instance instead of on every request.

## Detected anomalies: how and when

Each instrument's latest 1-day and 5-day change is compared with its own daily changes over roughly the last year (log
returns for prices, basis-point changes for yields and spreads). A z-score of 2 or more on either horizon, or 10-day realised
volatility at twice its 1-year level, flags it; 3σ is *high*, 4σ *extreme*. Each flag gets a rules-based reading (rarity,
trend, peers, what to watch).

Admin → Intelligence → **Anomaly scan** (`ANOMALY_SCHEDULE`): *live* (computed on page view, cached 5 min), *daily*
(stored scan at 22:00 UTC with the nightly job) or *twice-daily* (also 09:15 UTC via `/api/cron/anomalies`). Scheduled
scans mark anomalies that are new or stronger since the previous scan, list cleared ones, and keep the last 60 scans
(`anomalies/latest`, `anomalies/log`). *Scan now* runs one at any time. Cron schedules live in `deploy/vercel/crons.json`.

## 2020–2023 episodes (Intelligence)

A card for the COVID crash (Feb–Mar 2020) and the inflation bear market (2022, with the March 2023 bank stress), each in
three phases: **Before the peak** (documented conditions, each tested against current data, e.g. rally length, record
highs, volatility, credit, Fed cuts or loose policy, inflation, speculation, valuation, mechanical selling), **During the
fall** (the signature of the fall: VIX above 40, 20% in a month, HY widening, dollar dash, oil collapse; or stocks and bonds
falling together, 250 bp of hikes, CPI above 7%, dollar surge, deep inversion, crypto collapse, growth underperformance)
with a "happening now?" score, and **Impact** (policy response, casualties, recovery time, lesson). API: `/api/intel/recent`.

## Valuation and systematic-selling measures

Two pre-crash conditions are measured from free official data and public prices (`src/valuation.js`):

* **Stretched valuation**: market value of US corporate equities ÷ GDP (FRED `NCBEILQ027S` ÷ `GDP`) and ÷ after-tax
  corporate profits (`CP`), ranked against history since 1947. The quarterly value is carried forward with the S&P 500
  move since quarter end and labelled *nowcast*. Reference points: 1987 ≈ 60% of GDP, 2000 ≈ 163%, 2007 ≈ 121%.
* **Mechanical selling in place**: a 10%-volatility-target model (exposure = 10 ÷ 21-day realised vol, capped 1.5×),
  VIX ÷ VIX3M term structure, and distance from the 50-day average. *Primed* when model exposure is in the top quarter
  of five years; *under way* when VIX > VIX3M or exposure has been cut 30%+ in ten sessions. Labelled *model*.

## Appearance

Admin → **Appearance** sets the font and text size for every visitor (stored as `UI_FONT`, `UI_FONT_SIZE`; served at `/api/ui`):

| Font | Text | Figures |
|---|---|---|
| Terminal (default) | JetBrains Mono | JetBrains Mono |
| Classic (original) | IBM Plex Sans | IBM Plex Mono |
| Modern | Inter | JetBrains Mono |

Text size: small 92%, default 100%, large 108%, x-large 116% (all CSS font sizes are multiplied by `--fs`; chart labels follow).
The admin card previews a choice locally before *Apply to everyone*.

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
