// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Price Oracle Service
//  Real-time price feeds from Binance for margin trading & liquidation
//  Uses REST polling with backup — reliable and production-ready
// ═══════════════════════════════════════════════════════════════════════════════

const logger = require("../utils/logger");

// ── State ────────────────────────────────────────────────────────────────────
const prices = {};        // { 'BTCUSDT': { price: 97500.50, change24h: 2.3, updated: Date } }
let pollInterval = null;
const POLL_MS = 3000;     // Poll every 3 seconds
const STALE_MS = 30000;   // Price considered stale after 30s

// Supported pairs for margin trading (30+ top pairs available on Binance.US)
const SUPPORTED_PAIRS = [
  // Top 10
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  // DeFi / Layer 1
  'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT',
  'ARBUSDT', 'SUIUSDT', 'SEIUSDT', 'AAVEUSDT', 'OPUSDT',
  // Mid-cap
  'FILUSDT', 'ALGOUSDT', 'ICPUSDT', 'XLMUSDT', 'ETCUSDT',
  'HBARUSDT', 'TIAUSDT', 'PEPEUSDT', 'SHIBUSDT',
  // Extra popular
  'BONKUSDT', 'RENDERUSDT', 'ENAUSDT',
];

// ═════════════════════════════════════════════════════════════════════════════
//                         PRICE FETCHING
// ═════════════════════════════════════════════════════════════════════════════

// Map CoinGecko IDs to our Binance-style symbols
const COINGECKO_MAP = {
  bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT', ripple: 'XRPUSDT', dogecoin: 'DOGEUSDT',
  cardano: 'ADAUSDT', 'avalanche-2': 'AVAXUSDT', polkadot: 'DOTUSDT',
  chainlink: 'LINKUSDT', uniswap: 'UNIUSDT', litecoin: 'LTCUSDT',
  cosmos: 'ATOMUSDT', 'near': 'NEARUSDT', aptos: 'APTUSDT',
  arbitrum: 'ARBUSDT', sui: 'SUIUSDT', sei: 'SEIUSDT',
  aave: 'AAVEUSDT', optimism: 'OPUSDT', filecoin: 'FILUSDT',
  algorand: 'ALGOUSDT', 'internet-computer': 'ICPUSDT', stellar: 'XLMUSDT',
  'ethereum-classic': 'ETCUSDT', 'hedera-hashgraph': 'HBARUSDT',
  celestia: 'TIAUSDT', pepe: 'PEPEUSDT', 'shiba-inu': 'SHIBUSDT',
  bonk: 'BONKUSDT', 'render-token': 'RENDERUSDT', ethena: 'ENAUSDT',
};
const COINGECKO_IDS = Object.keys(COINGECKO_MAP).join(',');

// ── Primary: Binance.US (no geo restriction from US servers) ─────────────
async function fetchFromBinanceUS() {
  const url = `https://api.binance.us/api/v3/ticker/24hr?symbols=${JSON.stringify(SUPPORTED_PAIRS)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance.US API ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Binance.US returned non-array');

  for (const ticker of data) {
    prices[ticker.symbol] = {
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.volume),
      quoteVolume24h: parseFloat(ticker.quoteVolume),
      updated: new Date(),
    };
  }
  return 'binance.us';
}

// ── Fallback: CoinGecko (free, no restrictions) ─────────────────────────
async function fetchFromCoinGecko() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_high_24hr=true&include_low_24hr=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API ${res.status}`);
  const data = await res.json();

  for (const [geckoId, symbol] of Object.entries(COINGECKO_MAP)) {
    const coin = data[geckoId];
    if (!coin) continue;
    prices[symbol] = {
      price: coin.usd,
      change24h: coin.usd_24h_change || 0,
      high24h: coin.usd_24h_high || coin.usd,
      low24h: coin.usd_24h_low || coin.usd,
      volume24h: coin.usd_24h_vol || 0,
      quoteVolume24h: coin.usd_24h_vol || 0,
      updated: new Date(),
    };
  }
  return 'coingecko';
}

// ── Fallback 2: Binance Global (works from some regions) ────────────────
async function fetchFromBinanceGlobal() {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(SUPPORTED_PAIRS)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance Global ${res.status}`);
  const data = await res.json();
  if (data.code) throw new Error(data.msg || 'Binance blocked');

  for (const ticker of data) {
    prices[ticker.symbol] = {
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.volume),
      quoteVolume24h: parseFloat(ticker.quoteVolume),
      updated: new Date(),
    };
  }
  return 'binance.com';
}

async function fetchPrices() {
  const sources = [fetchFromBinanceUS, fetchFromCoinGecko, fetchFromBinanceGlobal];
  let source = null;

  for (const fetcher of sources) {
    try {
      source = await fetcher();
      break; // Success — stop trying
    } catch (err) {
      logger.debug(`Price source failed: ${err.message}`);
      continue;
    }
  }

  if (!source) {
    logger.warn("All price sources failed");
    return;
  }

  // KAIROS is always 1 USD
  prices['KAIROSUSDT'] = {
    price: 1.00,
    change24h: 0,
    high24h: 1.00,
    low24h: 1.00,
    volume24h: 0,
    quoteVolume24h: 0,
    updated: new Date(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                         PUBLIC API
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Start the price oracle polling
 */
async function start() {
  logger.info("Starting Price Oracle...");
  await fetchPrices(); // Initial fetch
  pollInterval = setInterval(fetchPrices, POLL_MS);
  logger.info(`Price Oracle running — polling ${SUPPORTED_PAIRS.length} pairs every ${POLL_MS}ms`);
}

/**
 * Stop the price oracle
 */
function stop() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  logger.info("Price Oracle stopped");
}

/**
 * Get current price for a symbol
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @returns {{ price: number, change24h: number, updated: Date } | null}
 */
function getPrice(symbol) {
  const s = symbol.toUpperCase();
  const data = prices[s];
  if (!data) return null;

  // Check staleness
  const age = Date.now() - data.updated.getTime();
  if (age > STALE_MS) {
    logger.warn(`Price stale for ${s} — ${(age / 1000).toFixed(0)}s old`);
  }

  return data;
}

/**
 * Get current price value only
 */
function getPriceValue(symbol) {
  const data = getPrice(symbol);
  return data ? data.price : null;
}

/**
 * Get all current prices
 */
function getAllPrices() {
  return { ...prices };
}

/**
 * Check if price is fresh (not stale)
 */
function isPriceFresh(symbol) {
  const data = prices[symbol.toUpperCase()];
  if (!data) return false;
  return (Date.now() - data.updated.getTime()) < STALE_MS;
}

/**
 * Get supported pairs list
 */
function getSupportedPairs() {
  return [...SUPPORTED_PAIRS, 'KAIROSUSDT'];
}

module.exports = {
  start,
  stop,
  getPrice,
  getPriceValue,
  getAllPrices,
  isPriceFresh,
  getSupportedPairs,
  SUPPORTED_PAIRS,
};
