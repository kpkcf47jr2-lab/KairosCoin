/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Portfolio & Price Service
   Fetches token balances and price data
   ═══════════════════════════════════════════════════════════ */

import { CHAINS } from '../config/chains';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Chain ID → CoinGecko platform ID mapping
const CG_PLATFORMS = {
  56: 'binance-smart-chain',
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum-one',
  137: 'polygon-pos',
};

// Chain ID → DexScreener chain ID
const DS_CHAINS = {
  56: 'bsc',
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  137: 'polygon',
};

/**
 * Fetch token balances for a wallet on a chain
 */
export async function getTokenBalances(provider, account, tokens) {
  if (!provider || !account || !tokens?.length) return [];
  const { ethers } = await import('ethers');

  const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
  const results = [];

  // Get native balance
  const nativeToken = tokens.find(t => t.isNative);
  if (nativeToken) {
    try {
      const bal = await provider.getBalance(account);
      const formatted = Number(ethers.formatEther(bal));
      results.push({ ...nativeToken, balance: formatted, balanceRaw: bal.toString() });
    } catch {}
  }

  // Batch ERC20 balances
  const erc20Tokens = tokens.filter(t => !t.isNative);
  const promises = erc20Tokens.map(async (token) => {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const bal = await contract.balanceOf(account);
      const formatted = Number(bal) / 10 ** (token.decimals || 18);
      return { ...token, balance: formatted, balanceRaw: bal.toString() };
    } catch {
      return { ...token, balance: 0, balanceRaw: '0' };
    }
  });

  const erc20Results = await Promise.allSettled(promises);
  for (const r of erc20Results) {
    if (r.status === 'fulfilled') results.push(r.value);
  }

  return results.filter(t => t.balance > 0);
}

/**
 * Fetch token prices from DexScreener (free, no API key)
 */
export async function getTokenPrices(chainId, addresses) {
  if (!addresses?.length) return {};
  const chain = DS_CHAINS[chainId];
  if (!chain) return {};

  const prices = {};
  // DexScreener accepts batched address lookups
  const batchSize = 30;
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    try {
      const res = await fetch(`${DEXSCREENER_API}/tokens/${batch.join(',')}`);
      const data = await res.json();
      if (data.pairs) {
        for (const pair of data.pairs) {
          if (pair.chainId === chain) {
            const addr = pair.baseToken.address.toLowerCase();
            if (!prices[addr] || pair.liquidity?.usd > (prices[addr]?.liquidity || 0)) {
              prices[addr] = {
                price: parseFloat(pair.priceUsd || 0),
                priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                volume24h: parseFloat(pair.volume?.h24 || 0),
                liquidity: parseFloat(pair.liquidity?.usd || 0),
                dex: pair.dexId,
                pairAddress: pair.pairAddress,
                url: pair.url,
              };
            }
          }
        }
      }
    } catch {}
  }
  return prices;
}

/**
 * Get top tokens by volume for a chain
 */
export async function getTopTokens(chainId) {
  const chain = DS_CHAINS[chainId];
  if (!chain) return [];

  try {
    const res = await fetch(`${DEXSCREENER_API}/search?q=top%20${chain}`);
    const data = await res.json();
    if (!data.pairs) return [];

    // Deduplicate by base token, sort by volume
    const tokenMap = new Map();
    for (const pair of data.pairs) {
      if (pair.chainId !== chain) continue;
      const addr = pair.baseToken.address.toLowerCase();
      if (!tokenMap.has(addr) || pair.volume?.h24 > tokenMap.get(addr).volume24h) {
        tokenMap.set(addr, {
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          dex: pair.dexId,
          url: pair.url,
        });
      }
    }

    return Array.from(tokenMap.values())
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * Get OHLCV candle data for price chart (via DexScreener pair)
 */
export async function getTokenChart(pairAddress, chainId) {
  // DexScreener doesn't provide direct OHLCV API for free
  // Use simple price history from CoinGecko as fallback
  try {
    const platform = CG_PLATFORMS[chainId];
    if (!platform) return [];

    // Try to get from CoinGecko market chart
    const res = await fetch(`${COINGECKO_API}/coins/${platform}/contract/${pairAddress}/market_chart?vs_currency=usd&days=7`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.prices || []).map(([time, price]) => ({
      time: Math.floor(time / 1000),
      value: price,
    }));
  } catch {
    return [];
  }
}

/**
 * Validate a token address and fetch its info
 */
export async function resolveTokenAddress(provider, address, chainId) {
  if (!provider || !address) return null;
  const { ethers } = await import('ethers');

  const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ];

  try {
    if (!ethers.isAddress(address)) return null;
    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);
    return {
      address,
      name,
      symbol,
      decimals: Number(decimals),
      isCustom: true,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate price impact from quote data
 */
export function calculatePriceImpact(quote) {
  if (!quote || !quote.price || !quote.guaranteedPrice) return null;
  const expected = parseFloat(quote.price);
  const guaranteed = parseFloat(quote.guaranteedPrice);
  if (!expected || !guaranteed) return null;
  const impact = ((expected - guaranteed) / expected) * 100;
  return Math.abs(impact);
}

/**
 * Get price impact severity
 * @returns 'low' | 'medium' | 'high' | 'critical'
 */
export function getPriceImpactSeverity(impact) {
  if (impact === null || impact === undefined) return null;
  if (impact < 1) return 'low';
  if (impact < 3) return 'medium';
  if (impact < 5) return 'high';
  return 'critical';
}
