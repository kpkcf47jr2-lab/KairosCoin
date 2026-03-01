// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Cross-Chain Portfolio Service
//  Aggregates balances across ALL chains simultaneously
//  MetaMask can't do this — we can
// ═══════════════════════════════════════════════════════

import { CHAINS, CHAIN_ORDER, ERC20_ABI, DEFAULT_TOKENS } from '../constants/chains';
import { getProvider } from './blockchain';
import { getNativePrice, getTokenPrices, getKairosPrice } from './prices';
import { ethers } from 'ethers';

// KAIROS contract address (same on BSC/Base/Arbitrum)
const KAIROS_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3'.toLowerCase();

const CROSS_CHAIN_CACHE_KEY = 'kairos_crosschain_portfolio';
const CACHE_TTL = 60000; // 1 minute

/**
 * Fetch native balance for an address on a specific chain
 */
async function fetchNativeBalance(chainId, address) {
  try {
    const provider = getProvider(chainId);
    const chain = CHAINS[chainId];
    const balance = await provider.getBalance(address);
    return {
      chainId,
      symbol: chain.nativeCurrency.symbol,
      balance: ethers.formatEther(balance),
      isNative: true,
    };
  } catch {
    return { chainId, symbol: CHAINS[chainId]?.nativeCurrency?.symbol || '?', balance: '0', isNative: true };
  }
}

/**
 * Fetch token balances for known tokens on a chain
 */
async function fetchTokenBalances(chainId, address) {
  const tokens = DEFAULT_TOKENS[chainId] || [];
  const results = [];
  const provider = getProvider(chainId);

  for (const token of tokens.slice(0, 6)) { // Max 6 tokens per chain to stay fast
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      const formatted = ethers.formatUnits(balance, token.decimals);
      if (parseFloat(formatted) > 0.0001) {
        results.push({
          chainId,
          address: token.address,
          symbol: token.symbol,
          balance: formatted,
          decimals: token.decimals,
          isNative: false,
        });
      }
    } catch {}
  }

  return results;
}

/**
 * Get portfolio across ALL chains simultaneously
 * Returns: { chains: { [chainId]: { native, tokens, totalUSD } }, totalUSD, timestamp }
 */
export async function getCrossChainPortfolio(address) {
  // Check cache
  try {
    const cached = JSON.parse(localStorage.getItem(CROSS_CHAIN_CACHE_KEY) || '{}');
    if (cached.address === address && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }
  } catch {}

  const portfolio = { chains: {}, totalUSD: 0, address, timestamp: Date.now() };

  // Fetch all chains in parallel
  const chainPromises = CHAIN_ORDER.map(async (chainId) => {
    const chain = CHAINS[chainId];
    try {
      const [nativeData, tokens, nativePrice] = await Promise.all([
        fetchNativeBalance(chainId, address),
        fetchTokenBalances(chainId, address),
        getNativePrice(chainId),
      ]);

      // Get token prices
      const tokenAddresses = tokens.filter(t => !t.isNative).map(t => t.address);
      let tokenPrices = {};
      if (tokenAddresses.length > 0) {
        try {
          // Exclude KAIROS from CoinGecko request — it won't be listed there
          const nonKairosAddresses = tokenAddresses.filter(a => a.toLowerCase() !== KAIROS_ADDRESS);
          if (nonKairosAddresses.length > 0) {
            tokenPrices = await getTokenPrices(chainId, nonKairosAddresses);
          }
        } catch {}
      }

      // Inject KAIROS price if present (USD-pegged stablecoin)
      const hasKairos = tokens.some(t => t.address?.toLowerCase() === KAIROS_ADDRESS);
      if (hasKairos) {
        try {
          const kairosPrice = await getKairosPrice();
          tokenPrices[KAIROS_ADDRESS] = { usd: kairosPrice.usd, change24h: kairosPrice.change24h || 0 };
        } catch {
          // Fallback to peg price
          tokenPrices[KAIROS_ADDRESS] = { usd: 1.00, change24h: 0 };
        }
      }

      // Calculate USD values
      const nativeVal = parseFloat(nativeData.balance) * nativePrice;
      let tokensUSD = 0;
      const tokenResults = tokens.map(t => {
        const price = tokenPrices[t.address?.toLowerCase()]?.usd || 0;
        const usd = parseFloat(t.balance) * price;
        tokensUSD += usd;
        return { ...t, price, usd };
      });

      const chainTotal = nativeVal + tokensUSD;

      return {
        chainId,
        chainName: chain.name,
        shortName: chain.shortName,
        color: chain.color,
        native: { ...nativeData, price: nativePrice, usd: nativeVal },
        tokens: tokenResults,
        totalUSD: chainTotal,
      };
    } catch (err) {
      return {
        chainId,
        chainName: chain.name,
        shortName: chain.shortName,
        color: chain.color,
        native: { balance: '0', usd: 0 },
        tokens: [],
        totalUSD: 0,
        error: err.message,
      };
    }
  });

  const results = await Promise.allSettled(chainPromises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const data = result.value;
      portfolio.chains[data.chainId] = data;
      portfolio.totalUSD += data.totalUSD;
    }
  }

  // Cache result
  try {
    localStorage.setItem(CROSS_CHAIN_CACHE_KEY, JSON.stringify(portfolio));
  } catch {}

  return portfolio;
}

/**
 * Get cached cross-chain portfolio (for quick access without fetching)
 */
export function getCachedCrossChainPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(CROSS_CHAIN_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}
