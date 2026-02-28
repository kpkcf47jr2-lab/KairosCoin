/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — DEX Aggregator Service
   Routes swaps through multiple DEX protocols to find best price.
   Currently uses 0x Swap API (aggregates PancakeSwap, Uniswap,
   SushiSwap, Curve, Balancer, DODO, and 100+ more sources).
   ═══════════════════════════════════════════════════════════ */

import { CHAINS } from '../config/chains.js';
import { NATIVE_ADDRESS } from '../config/tokens.js';

// 0x API endpoints per chain
const ZERO_X_ENDPOINTS = {
  56: 'https://bsc.api.0x.org',
  1: 'https://api.0x.org',
  8453: 'https://base.api.0x.org',
  42161: 'https://arbitrum.api.0x.org',
  137: 'https://polygon.api.0x.org',
};

// 0x API key from environment (set VITE_0X_API_KEY in .env)
const ZERO_X_API_KEY = import.meta.env.VITE_0X_API_KEY || '';

// Kairos fee: 0.15% on each swap -> goes to Kairos treasury
const KAIROS_FEE_BPS = 15; // 0.15% = 15 basis points
const KAIROS_FEE_RECIPIENT = '0xCee44904A6aA94dEa28754373887E07D4B6f4968'; // Owner wallet

/**
 * Get a swap quote (no signing required). Shows estimated output.
 */
export async function getQuote({ chainId, sellToken, buyToken, sellAmount, slippage = 0.5 }) {
  const endpoint = ZERO_X_ENDPOINTS[chainId];
  if (!endpoint) throw new Error(`Chain ${chainId} not supported`);

  const params = new URLSearchParams({
    sellToken: sellToken === NATIVE_ADDRESS ? CHAINS[chainId]?.nativeCurrency?.symbol : sellToken,
    buyToken: buyToken === NATIVE_ADDRESS ? CHAINS[chainId]?.nativeCurrency?.symbol : buyToken,
    sellAmount,
    slippagePercentage: (slippage / 100).toString(),
    feeRecipient: KAIROS_FEE_RECIPIENT,
    buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
    enableSlippageProtection: 'true',
  });

  const response = await fetch(`${endpoint}/swap/v1/quote?${params}`, {
    headers: ZERO_X_API_KEY ? { '0x-api-key': ZERO_X_API_KEY } : {},
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.reason || `Quote failed (${response.status})`);
  }

  const data = await response.json();
  return parseQuoteResponse(data, chainId);
}

/**
 * Get a lighter price estimate (no routing, just price).
 * Faster than getQuote, good for live previews.
 */
export async function getPrice({ chainId, sellToken, buyToken, sellAmount }) {
  const endpoint = ZERO_X_ENDPOINTS[chainId];
  if (!endpoint) throw new Error(`Chain ${chainId} not supported`);

  const params = new URLSearchParams({
    sellToken: sellToken === NATIVE_ADDRESS ? CHAINS[chainId]?.nativeCurrency?.symbol : sellToken,
    buyToken: buyToken === NATIVE_ADDRESS ? CHAINS[chainId]?.nativeCurrency?.symbol : buyToken,
    sellAmount,
    feeRecipient: KAIROS_FEE_RECIPIENT,
    buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
  });

  const response = await fetch(`${endpoint}/swap/v1/price?${params}`, {
    headers: ZERO_X_API_KEY ? { '0x-api-key': ZERO_X_API_KEY } : {},
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.reason || `Price failed (${response.status})`);
  }

  return response.json();
}

/**
 * Parse 0x API response into our standard format
 */
async function parseQuoteResponse(data, chainId) {
  const sources = (data.sources || [])
    .filter(s => parseFloat(s.proportion) > 0)
    .map(s => ({
      name: s.name,
      proportion: parseFloat(s.proportion),
      percentage: Math.round(parseFloat(s.proportion) * 100),
    }))
    .sort((a, b) => b.proportion - a.proportion);

  const gasUsd = await estimateGasUsd(data.estimatedGas, data.gasPrice, chainId);

  return {
    // Amounts
    sellAmount: data.sellAmount,
    buyAmount: data.buyAmount,
    price: data.price,
    guaranteedPrice: data.guaranteedPrice,
    // Gas
    estimatedGas: data.estimatedGas,
    gasPrice: data.gasPrice,
    estimatedGasUsd: gasUsd,
    // Sources (which DEXes are used)
    sources,
    sourceSummary: sources.map(s => `${s.name} ${s.percentage}%`).join(' + ') || 'Direct',
    // Transaction data for execution
    to: data.to,
    data: data.data,
    value: data.value,
    // Allowance
    allowanceTarget: data.allowanceTarget,
    // Fees
    protocolFee: data.protocolFee || '0',
    minimumProtocolFee: data.minimumProtocolFee || '0',
  };
}

/**
 * Estimate gas cost in USD using live prices
 */
// Cache native prices for 5 minutes
let _nativePriceCache = { data: null, ts: 0 };
const COINGECKO_IDS = { 56: 'binancecoin', 1: 'ethereum', 8453: 'ethereum', 42161: 'ethereum', 137: 'matic-network' };
const FALLBACK_PRICES = { 56: 600, 1: 3200, 8453: 3200, 42161: 3200, 137: 0.4 };

async function fetchNativePrices() {
  if (_nativePriceCache.data && Date.now() - _nativePriceCache.ts < 300000) return _nativePriceCache.data;
  try {
    const ids = [...new Set(Object.values(COINGECKO_IDS))].join(',');
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!res.ok) throw new Error('CoinGecko fetch failed');
    const data = await res.json();
    const prices = {};
    for (const [chainId, cgId] of Object.entries(COINGECKO_IDS)) {
      prices[chainId] = data[cgId]?.usd || FALLBACK_PRICES[chainId] || 1;
    }
    _nativePriceCache = { data: prices, ts: Date.now() };
    return prices;
  } catch {
    return FALLBACK_PRICES;
  }
}

async function estimateGasUsd(gas, gasPrice, chainId) {
  if (!gas || !gasPrice) return null;
  const gasCostWei = BigInt(gas) * BigInt(gasPrice);
  const gasCostEth = Number(gasCostWei) / 1e18;
  const prices = await fetchNativePrices();
  const nativePrice = prices[chainId] || FALLBACK_PRICES[chainId] || 1;
  return (gasCostEth * nativePrice).toFixed(2);
}

/**
 * Check ERC20 allowance and approve if needed
 */
export async function checkAndApprove({ provider, tokenAddress, spender, amount }) {
  const { ethers } = await import('ethers');
  const signer = await provider.getSigner();
  const account = await signer.getAddress();

  const erc20 = new ethers.Contract(tokenAddress, [
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
  ], signer);

  const current = await erc20.allowance(account, spender);
  if (current >= BigInt(amount)) return { approved: true, tx: null };

  // Approve max
  const tx = await erc20.approve(spender, ethers.MaxUint256);
  await tx.wait();
  return { approved: true, tx };
}

/**
 * Execute a swap using the quote data
 */
export async function executeSwap({ provider, quoteData }) {
  const { ethers } = await import('ethers');
  const signer = await provider.getSigner();

  const tx = await signer.sendTransaction({
    to: quoteData.to,
    data: quoteData.data,
    value: quoteData.value || '0',
    gasLimit: Math.ceil(Number(quoteData.estimatedGas) * 1.3), // 30% buffer
  });

  return tx;
}

// ── DEX Sources Info (for UI display) ──
export const DEX_SOURCES = {
  'PancakeSwap': { color: '#D4A017', icon: '🥞' },
  'PancakeSwap_V3': { color: '#D4A017', icon: '🥞' },
  'Uniswap': { color: '#FF007A', icon: '🦄' },
  'Uniswap_V3': { color: '#FF007A', icon: '🦄' },
  'SushiSwap': { color: '#FA52A0', icon: '🍣' },
  'Curve': { color: '#FF3E3E', icon: '🔴' },
  'Balancer': { color: '#1E1E1E', icon: '⚖️' },
  'Balancer_V2': { color: '#1E1E1E', icon: '⚖️' },
  'DODO': { color: '#FFE804', icon: '🐤' },
  'DODO_V2': { color: '#FFE804', icon: '🐤' },
  'Kyber': { color: '#31CB9E', icon: '💎' },
  'KyberDMM': { color: '#31CB9E', icon: '💎' },
  'Bancor': { color: '#0A2540', icon: '🔷' },
  'Curve_V2': { color: '#FF3E3E', icon: '🔴' },
  'Synapse': { color: '#B055FF', icon: '🔮' },
  'TraderJoe': { color: '#E8544F', icon: '🎩' },
  'Camelot': { color: '#FFAF1D', icon: '⚔️' },
  'Velodrome': { color: '#2150F5', icon: '🚴' },
  'Aerodrome': { color: '#0052FF', icon: '✈️' },
};
