// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Price Service
//  Fetches live prices from CoinGecko (free API)
// ═══════════════════════════════════════════════════════

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Rate limiting for CoinGecko free API (30 calls/min)
let lastCoinGeckoCall = 0;
const MIN_CALL_INTERVAL = 2100; // ~28 calls/min to stay safe

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastCoinGeckoCall;
  if (elapsed < MIN_CALL_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_CALL_INTERVAL - elapsed));
  }
  lastCoinGeckoCall = Date.now();

  const res = await fetch(url);
  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise(r => setTimeout(r, 5000));
    lastCoinGeckoCall = Date.now();
    const retry = await fetch(url);
    if (!retry.ok) throw new Error('CoinGecko rate limited');
    return retry;
  }
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res;
}

// Map chain IDs to CoinGecko platform IDs
const PLATFORM_MAP = {
  56: 'binance-smart-chain',
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  43114: 'avalanche',
  8453: 'base',
};

// Map native currencies to CoinGecko IDs
const NATIVE_COIN_MAP = {
  56: 'binancecoin',
  1: 'ethereum',
  137: 'matic-network',
  42161: 'ethereum',
  43114: 'avalanche-2',
  8453: 'ethereum',
};

// Cache for prices
const priceCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get native currency price in USD
 */
export async function getNativePrice(chainId) {
  const coinId = NATIVE_COIN_MAP[chainId];
  if (!coinId) return 0;

  const cacheKey = `native_${coinId}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    const res = await rateLimitedFetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await res.json();
    const price = data[coinId]?.usd || 0;
    const change24h = data[coinId]?.usd_24h_change || 0;

    priceCache.set(cacheKey, { price, change24h, timestamp: Date.now() });
    return price;
  } catch (err) {
    return cached?.price || 0;
  }
}

/**
 * Get token prices in USD (batch)
 */
export async function getTokenPrices(chainId, tokenAddresses) {
  if (!tokenAddresses.length) return {};

  const platform = PLATFORM_MAP[chainId];
  if (!platform) return {};

  const addresses = tokenAddresses.join(',').toLowerCase();
  const cacheKey = `tokens_${chainId}_${addresses}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.prices;
  }

  try {
    const res = await rateLimitedFetch(
      `${COINGECKO_API}/simple/token_price/${platform}?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await res.json();
    
    const prices = {};
    for (const [addr, info] of Object.entries(data)) {
      prices[addr.toLowerCase()] = {
        usd: info.usd || 0,
        change24h: info.usd_24h_change || 0,
      };
    }

    priceCache.set(cacheKey, { prices, timestamp: Date.now() });
    return prices;
  } catch (err) {
    return cached?.prices || {};
  }
}

/**
 * Get KAIROS price from PancakeSwap V2 (real DEX price)
 * Queries the router for KAIROS -> WBNB -> BUSD path
 */
const KAIROS_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';

export async function getKairosPrice() {
  const cacheKey = 'kairos_price';
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached;
  }

  try {
    // Try to get KAIROS price via PancakeSwap router getAmountsOut
    // KAIROS -> WBNB -> USDT path
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org', 56, { staticNetwork: true });
    const routerAbi = ['function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'];
    const router = new ethers.Contract(PANCAKE_ROUTER, routerAbi, provider);
    
    const amountIn = ethers.parseUnits('1', 18); // 1 KAIROS
    
    // Try KAIROS -> WBNB -> USDT
    let usdPrice = 0;
    try {
      const amounts = await router.getAmountsOut(amountIn, [KAIROS_ADDRESS, WBNB, USDT_BSC]);
      usdPrice = parseFloat(ethers.formatUnits(amounts[2], 18));
    } catch {
      // Try KAIROS -> WBNB -> BUSD as fallback
      try {
        const amounts = await router.getAmountsOut(amountIn, [KAIROS_ADDRESS, WBNB, BUSD]);
        usdPrice = parseFloat(ethers.formatUnits(amounts[2], 18));
      } catch {
        // No liquidity pool found - return 0
        usdPrice = 0;
      }
    }
    
    const result = { usd: usdPrice, change24h: 0, timestamp: Date.now() };
    priceCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Failed to get KAIROS price:', err);
    return cached || { usd: 0, change24h: 0 };
  }
}

/**
 * Format USD value
 */
export function formatUSD(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toFixed(6)}`;
  return '$0.00';
}

/**
 * Format token balance for display
 */
export function formatBalance(balance, decimals = 4) {
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(decimals);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toExponential(2);
}

/**
 * Format percentage change
 */
export function formatChange(change) {
  if (change === null || change === undefined || isNaN(change)) return '0.00%';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change.toFixed(2)}%`;
}
