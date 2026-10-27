// Asset universe. Every instrument declares its source so the UI can show provenance.
// kind: 'index' | 'etf' | 'future' | 'spot' | 'yield' | 'spread' | 'level' | 'crypto' | 'fx'
// freshness is the *best case* for that source; the adapter reports the actual as-of time.
//
// Sources:
//   yahoo     Yahoo Finance chart API — delayed quotes (typically 15 min for indices, real-time-ish for some ETFs), daily history to 10Y+.
//   fred      Federal Reserve Bank of St. Louis — end-of-day / weekly / monthly official series.
//   coingecko CoinGecko public API — near real-time crypto prices, market caps and volumes.
//   goldapi   gold-api.com — near real-time spot gold/silver.
//   eia       U.S. Energy Information Administration — official spot prices (API key).

export const ASSETS = [
  // ── Equities ──────────────────────────────────────────────────────────────
  { id: 'SPX', name: 'S&P 500', cls: 'equity', region: 'US', kind: 'index', source: 'yahoo', symbol: '^GSPC', unit: 'pts', freshness: 'delayed' },
  { id: 'NDX', name: 'Nasdaq 100', cls: 'equity', region: 'US', kind: 'index', source: 'yahoo', symbol: '^NDX', unit: 'pts', freshness: 'delayed' },
  { id: 'RUT', name: 'Russell 2000', cls: 'equity', region: 'US', kind: 'index', source: 'yahoo', symbol: '^RUT', unit: 'pts', freshness: 'delayed' },
  { id: 'SX5E', name: 'Euro Stoxx 50', cls: 'equity', region: 'Europe', kind: 'index', source: 'yahoo', symbol: '^STOXX50E', unit: 'pts', freshness: 'delayed' },
  { id: 'UKX', name: 'FTSE 100', cls: 'equity', region: 'Europe', kind: 'index', source: 'yahoo', symbol: '^FTSE', unit: 'pts', freshness: 'delayed' },
  { id: 'DAX', name: 'DAX 40', cls: 'equity', region: 'Europe', kind: 'index', source: 'yahoo', symbol: '^GDAXI', unit: 'pts', freshness: 'delayed' },
  { id: 'NKY', name: 'Nikkei 225', cls: 'equity', region: 'Japan', kind: 'index', source: 'yahoo', symbol: '^N225', unit: 'pts', freshness: 'delayed' },
  { id: 'SHCOMP', name: 'Shanghai Composite', cls: 'equity', region: 'China', kind: 'index', source: 'yahoo', symbol: '000001.SS', unit: 'pts', freshness: 'delayed' },
  { id: 'HSI', name: 'Hang Seng', cls: 'equity', region: 'China', kind: 'index', source: 'yahoo', symbol: '^HSI', unit: 'pts', freshness: 'delayed' },
  { id: 'EEM', name: 'MSCI Emerging Markets (EEM ETF)', cls: 'equity', region: 'EM', kind: 'etf', source: 'yahoo', symbol: 'EEM', unit: 'USD', freshness: 'delayed' },
  { id: 'JCI', name: 'Jakarta Composite', cls: 'equity', region: 'EM', kind: 'index', source: 'yahoo', symbol: '^JKSE', unit: 'pts', freshness: 'delayed' },
  { id: 'KOSPI', name: 'KOSPI', cls: 'equity', region: 'EM', kind: 'index', source: 'yahoo', symbol: '^KS11', unit: 'pts', freshness: 'delayed' },
  { id: 'NIFTY', name: 'Nifty 50', cls: 'equity', region: 'EM', kind: 'index', source: 'yahoo', symbol: '^NSEI', unit: 'pts', freshness: 'delayed' },

  // ── Fixed income ──────────────────────────────────────────────────────────
  { id: 'UST2Y', name: 'US 2Y Treasury yield', cls: 'rates', region: 'US', kind: 'yield', source: 'fred', symbol: 'DGS2', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'UST10Y', name: 'US 10Y Treasury yield', cls: 'rates', region: 'US', kind: 'yield', source: 'fred', symbol: 'DGS10', unit: '%', freshness: 'eod', fredFreq: 'daily', intraday: { source: 'yahoo', symbol: '^TNX' } },
  { id: 'UST30Y', name: 'US 30Y Treasury yield', cls: 'rates', region: 'US', kind: 'yield', source: 'fred', symbol: 'DGS30', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'T10Y2Y', name: 'US 10Y–2Y curve', cls: 'rates', region: 'US', kind: 'spread', source: 'fred', symbol: 'T10Y2Y', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'TLT', name: 'US 20Y+ Treasuries (TLT ETF)', cls: 'rates', region: 'US', kind: 'etf', source: 'yahoo', symbol: 'TLT', unit: 'USD', freshness: 'delayed' },
  { id: 'IGOAS', name: 'US IG corporate OAS', cls: 'credit', region: 'US', kind: 'spread', source: 'fred', symbol: 'BAMLC0A0CM', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'HYOAS', name: 'US HY corporate OAS', cls: 'credit', region: 'US', kind: 'spread', source: 'fred', symbol: 'BAMLH0A0HYM2', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'LQD', name: 'US IG corporate bonds (LQD ETF)', cls: 'credit', region: 'US', kind: 'etf', source: 'yahoo', symbol: 'LQD', unit: 'USD', freshness: 'delayed' },
  { id: 'HYG', name: 'US HY corporate bonds (HYG ETF)', cls: 'credit', region: 'US', kind: 'etf', source: 'yahoo', symbol: 'HYG', unit: 'USD', freshness: 'delayed' },
  { id: 'EMB', name: 'EM USD sovereign bonds (EMB ETF)', cls: 'credit', region: 'EM', kind: 'etf', source: 'yahoo', symbol: 'EMB', unit: 'USD', freshness: 'delayed' },
  { id: 'BUND10Y', name: 'Germany 10Y yield (proxy)', cls: 'rates', region: 'Europe', kind: 'yield', source: 'fred', symbol: 'IRLTLT01DEM156N', unit: '%', freshness: 'monthly', fredFreq: 'monthly' },
  { id: 'JGB10Y', name: 'Japan 10Y yield (proxy)', cls: 'rates', region: 'Japan', kind: 'yield', source: 'fred', symbol: 'IRLTLT01JPM156N', unit: '%', freshness: 'monthly', fredFreq: 'monthly' },

  // ── Crypto ────────────────────────────────────────────────────────────────
  { id: 'BTC', name: 'Bitcoin', cls: 'crypto', region: 'Global', kind: 'crypto', source: 'coingecko', symbol: 'bitcoin', unit: 'USD', freshness: 'realtime' },
  { id: 'ETH', name: 'Ethereum', cls: 'crypto', region: 'Global', kind: 'crypto', source: 'coingecko', symbol: 'ethereum', unit: 'USD', freshness: 'realtime' },
  { id: 'SOL', name: 'Solana', cls: 'crypto', region: 'Global', kind: 'crypto', source: 'coingecko', symbol: 'solana', unit: 'USD', freshness: 'realtime' },
  { id: 'USDT', name: 'Tether (stablecoin supply)', cls: 'crypto', region: 'Global', kind: 'crypto', source: 'coingecko', symbol: 'tether', unit: 'USD', freshness: 'realtime', stablecoin: true },
  { id: 'USDC', name: 'USD Coin (stablecoin supply)', cls: 'crypto', region: 'Global', kind: 'crypto', source: 'coingecko', symbol: 'usd-coin', unit: 'USD', freshness: 'realtime', stablecoin: true },

  // ── Commodities ───────────────────────────────────────────────────────────
  { id: 'GOLD', name: 'Gold spot', cls: 'commodity', region: 'Global', kind: 'spot', source: 'goldapi', symbol: 'XAU', unit: 'USD/oz', freshness: 'realtime', history: { source: 'yahoo', symbol: 'GC=F' } },
  { id: 'SILVER', name: 'Silver spot', cls: 'commodity', region: 'Global', kind: 'spot', source: 'goldapi', symbol: 'XAG', unit: 'USD/oz', freshness: 'realtime', history: { source: 'yahoo', symbol: 'SI=F' } },
  { id: 'WTI', name: 'WTI crude (front future)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'CL=F', unit: 'USD/bbl', freshness: 'delayed', official: { source: 'fred', symbol: 'DCOILWTICO' } },
  { id: 'BRENT', name: 'Brent crude (front future)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'BZ=F', unit: 'USD/bbl', freshness: 'delayed', official: { source: 'fred', symbol: 'DCOILBRENTEU' } },
  { id: 'NATGAS', name: 'Henry Hub natural gas (front future)', cls: 'commodity', region: 'US', kind: 'future', source: 'yahoo', symbol: 'NG=F', unit: 'USD/MMBtu', freshness: 'delayed', official: { source: 'fred', symbol: 'DHHNGSP' } },
  { id: 'COPPER', name: 'Copper (COMEX front future)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'HG=F', unit: 'USD/lb', freshness: 'delayed' },
  { id: 'WHEAT', name: 'Wheat (CBOT)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'ZW=F', unit: 'USc/bu', freshness: 'delayed' },
  { id: 'CORN', name: 'Corn (CBOT)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'ZC=F', unit: 'USc/bu', freshness: 'delayed' },
  { id: 'SOY', name: 'Soybeans (CBOT)', cls: 'commodity', region: 'Global', kind: 'future', source: 'yahoo', symbol: 'ZS=F', unit: 'USc/bu', freshness: 'delayed' },
  { id: 'DBA', name: 'Agriculture basket (DBA ETF)', cls: 'commodity', region: 'Global', kind: 'etf', source: 'yahoo', symbol: 'DBA', unit: 'USD', freshness: 'delayed' },

  // ── Currencies ────────────────────────────────────────────────────────────
  { id: 'DXY', name: 'US Dollar Index', cls: 'fx', region: 'US', kind: 'index', source: 'yahoo', symbol: 'DX-Y.NYB', unit: 'pts', freshness: 'delayed' },
  { id: 'EURUSD', name: 'EUR/USD', cls: 'fx', region: 'Europe', kind: 'fx', source: 'yahoo', symbol: 'EURUSD=X', unit: 'USD', freshness: 'delayed' },
  { id: 'USDJPY', name: 'USD/JPY', cls: 'fx', region: 'Japan', kind: 'fx', source: 'yahoo', symbol: 'JPY=X', unit: 'JPY', freshness: 'delayed' },
  { id: 'GBPUSD', name: 'GBP/USD', cls: 'fx', region: 'Europe', kind: 'fx', source: 'yahoo', symbol: 'GBPUSD=X', unit: 'USD', freshness: 'delayed' },
  { id: 'USDCNY', name: 'USD/CNY', cls: 'fx', region: 'China', kind: 'fx', source: 'yahoo', symbol: 'CNY=X', unit: 'CNY', freshness: 'delayed' },
  { id: 'USDIDR', name: 'USD/IDR', cls: 'fx', region: 'EM', kind: 'fx', source: 'yahoo', symbol: 'IDR=X', unit: 'IDR', freshness: 'delayed' },

  // ── Macro / liquidity ─────────────────────────────────────────────────────
  { id: 'VIX', name: 'VIX (CBOE volatility index)', cls: 'macro', region: 'US', kind: 'index', source: 'yahoo', symbol: '^VIX', unit: 'pts', freshness: 'delayed', official: { source: 'fred', symbol: 'VIXCLS' } },
  { id: 'FEDFUNDS', name: 'Effective fed funds rate', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'DFF', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'CPI', name: 'US CPI (YoY %)', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'CPIAUCSL', unit: '% y/y', freshness: 'monthly', fredFreq: 'monthly', transform: 'yoy' },
  { id: 'BREAKEVEN10', name: 'US 10Y breakeven inflation', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'T10YIE', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'WALCL', name: 'Fed balance sheet (total assets)', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'WALCL', unit: 'USD mn', freshness: 'weekly', fredFreq: 'weekly', scale: 1e6 },
  { id: 'RRP', name: 'Fed overnight reverse repo', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'RRPONTSYD', unit: 'USD bn', freshness: 'eod', fredFreq: 'daily', scale: 1e9 },
  { id: 'TGA', name: 'Treasury General Account', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'WTREGEN', unit: 'USD mn', freshness: 'weekly', fredFreq: 'weekly', scale: 1e6 },
  { id: 'M2', name: 'US M2 money stock', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'M2SL', unit: 'USD bn', freshness: 'monthly', fredFreq: 'monthly', scale: 1e9 },
  { id: 'ECBRATE', name: 'ECB deposit facility rate', cls: 'macro', region: 'Europe', kind: 'level', source: 'fred', symbol: 'ECBDFR', unit: '%', freshness: 'eod', fredFreq: 'daily' },
  { id: 'BROADUSD', name: 'Broad trade-weighted USD', cls: 'macro', region: 'US', kind: 'index', source: 'fred', symbol: 'DTWEXBGS', unit: 'pts', freshness: 'eod', fredFreq: 'daily' },
  { id: 'HOUSE', name: 'US house prices (Case-Shiller, YoY %)', cls: 'macro', region: 'US', kind: 'level', source: 'fred', symbol: 'CSUSHPISA', unit: '% y/y', freshness: 'monthly', fredFreq: 'monthly', transform: 'yoy' },
];

export const ASSET_MAP = Object.fromEntries(ASSETS.map(a => [a.id, a]));

export const CLASSES = {
  equity: 'Equities', rates: 'Rates', credit: 'Credit', crypto: 'Crypto', commodity: 'Commodities', fx: 'FX', macro: 'Macro',
};

// Reference market-size figures. These are *not* live prices — they are published
// aggregates, shown with their source and as-of date, and can be overridden in Admin.
// measure: 'market_cap' | 'debt_outstanding' | 'physical_stock_value'
export const SIZE_REFERENCES = [
  { id: 'EQ_GLOBAL', label: 'Global equities', cls: 'equity', measure: 'market_cap', usd: 157.8e12, source: 'SIFMA Capital Markets Fact Book 2026 ed.', asOf: '2025', url: 'https://www.sifma.org/news/blog/2026-capital-markets-fact-book-key-findings', children: [
    { id: 'EQ_US', label: 'US equities', usd: 68.9e12 },
    { id: 'EQ_EXUS', label: 'Non-US equities', usd: 157.8e12 - 68.9e12 },
  ] },
  { id: 'FI_GLOBAL', label: 'Global fixed income', cls: 'rates', measure: 'debt_outstanding', usd: 160.7e12, source: 'SIFMA Capital Markets Fact Book 2026 ed.', asOf: '2025', url: 'https://www.sifma.org/news/blog/2026-capital-markets-fact-book-key-findings', children: [
    { id: 'FI_US', label: 'US fixed income', usd: 61.2e12 },
    { id: 'FI_EXUS', label: 'Non-US fixed income', usd: 160.7e12 - 61.2e12 },
  ] },
  // Gold: computed live = above-ground stock (tonnes) × spot price. Stock figure from World Gold Council.
  { id: 'GOLD_STOCK', label: 'Above-ground gold', cls: 'commodity', measure: 'physical_stock_value', tonnes: 216265, source: 'World Gold Council above-ground stock (end-2024) × live spot', asOf: '2024', url: 'https://www.gold.org/goldhub/data/how-much-gold', live: true },
  // Crypto: live total market cap from CoinGecko (measure: market_cap).
  { id: 'CRYPTO_TOTAL', label: 'Crypto total market cap', cls: 'crypto', measure: 'market_cap', source: 'CoinGecko /global (live)', live: true },
];
