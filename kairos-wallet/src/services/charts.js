// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Price Charts Service
//  CoinGecko sparkline data for token price history
// ═══════════════════════════════════════════════════════

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Platform IDs for CoinGecko
const PLATFORM_MAP = {
  56: 'binance-smart-chain',
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  43114: 'avalanche',
  8453: 'base',
};

// Native coin IDs on CoinGecko
const NATIVE_COIN_IDS = {
  56: 'binancecoin',
  1: 'ethereum',
  137: 'matic-network',
  42161: 'ethereum',
  43114: 'avalanche-2',
  8453: 'ethereum',
};

// Cache for chart data (key => { data, timestamp })
const chartCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get price history for a native coin
 * @param {number} chainId
 * @param {number} days - 1, 7, 30, 365
 * @returns {{ prices: [timestamp, price][], change24h: number }}
 */
export async function getNativePriceHistory(chainId, days = 7) {
  const coinId = NATIVE_COIN_IDS[chainId];
  if (!coinId) return null;

  const key = `native_${chainId}_${days}`;
  const cached = chartCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!resp.ok) throw new Error('API error');
    const json = await resp.json();
    
    const prices = json.prices || [];
    const change24h = prices.length > 1
      ? ((prices[prices.length - 1][1] - prices[0][1]) / prices[0][1]) * 100
      : 0;

    const data = { prices, change24h };
    chartCache[key] = { data, timestamp: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/**
 * Get price history for a token by contract address
 * @param {number} chainId
 * @param {string} contractAddress
 * @param {number} days
 * @returns {{ prices: [timestamp, price][], change24h: number }}
 */
export async function getTokenPriceHistory(chainId, contractAddress, days = 7) {
  const platform = PLATFORM_MAP[chainId];
  if (!platform || !contractAddress) return null;

  const key = `${contractAddress.toLowerCase()}_${chainId}_${days}`;
  const cached = chartCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(
      `${COINGECKO_BASE}/coins/${platform}/contract/${contractAddress}/market_chart/?vs_currency=usd&days=${days}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!resp.ok) throw new Error('API error');
    const json = await resp.json();
    
    const prices = json.prices || [];
    const change24h = prices.length > 1
      ? ((prices[prices.length - 1][1] - prices[0][1]) / prices[0][1]) * 100
      : 0;

    const data = { prices, change24h };
    chartCache[key] = { data, timestamp: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/**
 * Normalize price data to sparkline points (0-1 range)
 * @param {Array} prices - [[timestamp, price], ...]
 * @param {number} points - Number of points to reduce to
 * @returns {{ points: number[], min: number, max: number, current: number }}
 */
export function normalizeSparkline(prices, points = 50) {
  if (!prices || prices.length < 2) return null;

  // Sample evenly
  const step = Math.max(1, Math.floor(prices.length / points));
  const sampled = [];
  for (let i = 0; i < prices.length; i += step) {
    sampled.push(prices[i][1]);
  }
  // Always include last
  if (sampled[sampled.length - 1] !== prices[prices.length - 1][1]) {
    sampled.push(prices[prices.length - 1][1]);
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;

  return {
    points: sampled.map(v => (v - min) / range),
    min,
    max,
    current: sampled[sampled.length - 1],
    values: sampled,
  };
}
