/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — DEX Aggregator Service (v2)
   Multi-source swap routing:
   1. On-chain DEX routers (KairosSwap, PancakeSwap, Uniswap, etc.)
      → Works always, no API key needed
   2. 0x Swap API (optional, if API key available)
      → Better multi-DEX routing when configured
   ═══════════════════════════════════════════════════════════ */

import { ethers } from 'ethers';
import { CHAINS } from '../config/chains.js';
import { NATIVE_ADDRESS, KAIROS_ADDRESS } from '../config/tokens.js';

// ── Configuration ──
const ZERO_X_API_KEY = import.meta.env.VITE_0X_API_KEY || '';

// Kairos fee: 0.15% on 0x swaps → Kairos treasury
const KAIROS_FEE_BPS = 15;
const KAIROS_FEE_RECIPIENT = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';

// ══════════════════════════════════════════════════════════
//  ON-CHAIN DEX ROUTING (Primary — No API key needed)
// ══════════════════════════════════════════════════════════

// KairosSwap (BSC) — our native AMM
const KAIROS_SWAP = {
  router: '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6',
  factory: '0xB5891c54199d539CB8afd37BFA9E17370095b9D9',
};

// PancakeSwap V2 (BSC) — for non-KAIROS pairs on BSC
const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// Primary DEX routers per chain (for non-KAIROS pairs)
const PRIMARY_ROUTERS = {
  56: PANCAKE_ROUTER,                                      // PancakeSwap V2
  1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',       // Uniswap V2
  8453: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',     // Aerodrome/BaseSwap
  42161: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',    // SushiSwap
  137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',      // QuickSwap
};

const DEX_NAMES_MAP = {
  56: 'PancakeSwap', 1: 'Uniswap V2', 8453: 'BaseSwap',
  42161: 'SushiSwap', 137: 'QuickSwap',
};

const FACTORY_ADDRESSES = {
  56: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',       // PancakeSwap Factory
  1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',        // Uniswap V2
  8453: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',      // BaseSwap
  42161: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',     // SushiSwap
  137: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',       // QuickSwap
};

// Router V2 ABI (shared by all Uniswap V2 forks)
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
  'function WETH() external view returns (address)',
  'function factory() external view returns (address)',
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

// ══════════════════════════════════════════════════════════
//  0x API ENDPOINTS (Optional — better routing if key available)
// ══════════════════════════════════════════════════════════

const ZERO_X_ENDPOINTS = {
  56: 'https://bsc.api.0x.org',
  1: 'https://api.0x.org',
  8453: 'https://base.api.0x.org',
  42161: 'https://arbitrum.api.0x.org',
  137: 'https://polygon.api.0x.org',
};

// ══════════════════════════════════════════════════════════
//  PUBLIC API: getQuote
// ══════════════════════════════════════════════════════════

/**
 * Get a swap quote. Tries 0x API first (if key available), falls back to on-chain routing.
 */
export async function getQuote({ chainId, sellToken, buyToken, sellAmount, slippage = 0.5 }) {
  // Try 0x API first if API key is available
  if (ZERO_X_API_KEY) {
    try {
      const q = await getQuoteFrom0x({ chainId, sellToken, buyToken, sellAmount, slippage });
      return q;
    } catch (err) {
      console.warn('0x API failed, falling back to on-chain routing:', err.message);
    }
  }

  // On-chain DEX routing (always available)
  return getQuoteOnChain({ chainId, sellToken, buyToken, sellAmount, slippage });
}

/**
 * Get a lighter price estimate (on-chain only, fast).
 */
export async function getPrice({ chainId, sellToken, buyToken, sellAmount }) {
  const quote = await getQuoteOnChain({ chainId, sellToken, buyToken, sellAmount, slippage: 0.5 });
  return {
    sellAmount: quote.sellAmount,
    buyAmount: quote.buyAmount,
    price: quote.price,
  };
}

// ══════════════════════════════════════════════════════════
//  ON-CHAIN ROUTING IMPLEMENTATION
// ══════════════════════════════════════════════════════════

/**
 * Resolve sell/buy token to actual addresses (handle native → wrapped)
 */
function resolveAddresses(chainId, sellToken, buyToken) {
  const chain = CHAINS[chainId];
  const wrapped = chain?.wrappedNative;
  const sellIsNative = sellToken === NATIVE_ADDRESS;
  const buyIsNative = buyToken === NATIVE_ADDRESS;
  const sellAddr = sellIsNative ? wrapped : sellToken;
  const buyAddr = buyIsNative ? wrapped : buyToken;
  return { sellAddr, buyAddr, sellIsNative, buyIsNative, wrapped };
}

/**
 * Determine which router to use for a given pair on a specific chain.
 * On BSC: Use KairosSwap for KAIROS pairs (if pair exists), PancakeSwap otherwise.
 * On other chains: Use the primary DEX router.
 */
async function selectRouter(provider, chainId, sellAddr, buyAddr) {
  const kairosAddr = KAIROS_ADDRESS[chainId];

  // On BSC, check if this is a KAIROS pair and KairosSwap has liquidity
  if (chainId === 56 && kairosAddr) {
    const isKairosPair =
      sellAddr.toLowerCase() === kairosAddr.toLowerCase() ||
      buyAddr.toLowerCase() === kairosAddr.toLowerCase();

    if (isKairosPair) {
      try {
        const factory = new ethers.Contract(KAIROS_SWAP.factory, FACTORY_ABI, provider);
        const pair = await factory.getPair(sellAddr, buyAddr);
        if (pair && pair !== ethers.ZeroAddress) {
          return { router: KAIROS_SWAP.router, dexName: 'KairosSwap', icon: '◆' };
        }
      } catch { /* fall through to PancakeSwap */ }
    }
  }

  return {
    router: PRIMARY_ROUTERS[chainId],
    dexName: DEX_NAMES_MAP[chainId] || 'DEX',
    icon: '🔄',
  };
}

/**
 * Build the optimal swap path. Tries direct path first, then via WETH.
 */
async function buildPath(provider, routerAddress, factoryAddress, sellAddr, buyAddr, wrapped, sellAmount) {
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);

  // Path option 1: Direct [sell → buy]
  const directPath = [sellAddr, buyAddr];
  let directAmounts = null;
  try {
    directAmounts = await router.getAmountsOut(sellAmount, directPath);
  } catch { /* no direct pair */ }

  // Path option 2: Via wrapped native [sell → WETH → buy]
  let viaWethPath = null;
  let viaWethAmounts = null;
  if (wrapped &&
      sellAddr.toLowerCase() !== wrapped.toLowerCase() &&
      buyAddr.toLowerCase() !== wrapped.toLowerCase()) {
    viaWethPath = [sellAddr, wrapped, buyAddr];
    try {
      viaWethAmounts = await router.getAmountsOut(sellAmount, viaWethPath);
    } catch { /* no WETH route */ }
  }

  // Pick the path with the better output
  if (directAmounts && viaWethAmounts) {
    const directOut = directAmounts[directAmounts.length - 1];
    const viaOut = viaWethAmounts[viaWethAmounts.length - 1];
    if (viaOut > directOut) {
      return { path: viaWethPath, amountOut: viaOut, hops: 2 };
    }
    return { path: directPath, amountOut: directOut, hops: 1 };
  }

  if (directAmounts) {
    return { path: directPath, amountOut: directAmounts[directAmounts.length - 1], hops: 1 };
  }

  if (viaWethAmounts) {
    return { path: viaWethPath, amountOut: viaWethAmounts[viaWethAmounts.length - 1], hops: 2 };
  }

  return null;
}

/**
 * Get factory address for a given router.
 */
function getFactoryForRouter(chainId, routerAddress) {
  if (routerAddress === KAIROS_SWAP.router) return KAIROS_SWAP.factory;
  return FACTORY_ADDRESSES[chainId];
}

/**
 * Get a swap quote entirely on-chain using DEX router contracts.
 */
async function getQuoteOnChain({ chainId, sellToken, buyToken, sellAmount, slippage = 0.5 }) {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Cadena ${chainId} no soportada`);

  const rpcProvider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const { sellAddr, buyAddr, sellIsNative, buyIsNative, wrapped } = resolveAddresses(chainId, sellToken, buyToken);

  // Select the best router
  const { router: routerAddress, dexName, icon } = await selectRouter(rpcProvider, chainId, sellAddr, buyAddr);
  if (!routerAddress) throw new Error(`No hay DEX disponible para la cadena ${chainId}`);

  // Build optimal path
  const factoryAddr = getFactoryForRouter(chainId, routerAddress);
  const result = await buildPath(rpcProvider, routerAddress, factoryAddr, sellAddr, buyAddr, wrapped, sellAmount);

  if (!result) {
    throw new Error('No hay liquidez disponible para este par. Intenta con otro token o monto.');
  }

  const { path, amountOut, hops } = result;

  // Calculate price
  const priceNum = Number(amountOut) / Number(sellAmount);
  const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000));

  // Estimate gas (rough)
  const baseGas = sellIsNative || buyIsNative ? 150000 : 200000;
  const estimatedGas = baseGas + (hops - 1) * 80000;
  const gasUsd = await estimateGasUsd(estimatedGas.toString(), null, chainId);

  return {
    // Amounts
    sellAmount: sellAmount.toString(),
    buyAmount: amountOut.toString(),
    price: priceNum.toString(),
    guaranteedPrice: (priceNum * Number(slippageFactor) / 10000).toString(),

    // Gas
    estimatedGas: estimatedGas.toString(),
    gasPrice: null,
    estimatedGasUsd: gasUsd,

    // Sources
    sources: [{ name: dexName, proportion: 1, percentage: 100 }],
    sourceSummary: `${icon} ${dexName} 100%`,

    // On-chain routing metadata (used by executeSwap)
    routeType: 'onchain',
    routerAddress,
    path,
    sellIsNative,
    buyIsNative,
    slippageFactor,

    // Allowance target = router (for ERC20 approval)
    allowanceTarget: routerAddress,

    // No raw calldata for on-chain routes
    to: null,
    data: null,
    value: null,
  };
}

// ══════════════════════════════════════════════════════════
//  0x API IMPLEMENTATION (Optional Enhancement)
// ══════════════════════════════════════════════════════════

async function getQuoteFrom0x({ chainId, sellToken, buyToken, sellAmount, slippage }) {
  const endpoint = ZERO_X_ENDPOINTS[chainId];
  if (!endpoint) throw new Error(`0x API: cadena ${chainId} no soportada`);

  const chain = CHAINS[chainId];
  const params = new URLSearchParams({
    sellToken: sellToken === NATIVE_ADDRESS ? chain?.nativeCurrency?.symbol : sellToken,
    buyToken: buyToken === NATIVE_ADDRESS ? chain?.nativeCurrency?.symbol : buyToken,
    sellAmount,
    slippagePercentage: (slippage / 100).toString(),
    feeRecipient: KAIROS_FEE_RECIPIENT,
    buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
    enableSlippageProtection: 'true',
  });

  const response = await fetch(`${endpoint}/swap/v1/quote?${params}`, {
    headers: { '0x-api-key': ZERO_X_API_KEY },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.reason || `0x quote failed (${response.status})`);
  }

  const data = await response.json();
  return parse0xResponse(data, chainId);
}

async function parse0xResponse(data, chainId) {
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
    sellAmount: data.sellAmount,
    buyAmount: data.buyAmount,
    price: data.price,
    guaranteedPrice: data.guaranteedPrice,
    estimatedGas: data.estimatedGas,
    gasPrice: data.gasPrice,
    estimatedGasUsd: gasUsd,
    sources,
    sourceSummary: sources.map(s => `${s.name} ${s.percentage}%`).join(' + ') || 'Direct',
    // 0x returns raw calldata
    routeType: '0x',
    to: data.to,
    data: data.data,
    value: data.value,
    allowanceTarget: data.allowanceTarget,
    protocolFee: data.protocolFee || '0',
    minimumProtocolFee: data.minimumProtocolFee || '0',
    // Not used for 0x routes
    routerAddress: null,
    path: null,
    sellIsNative: false,
    buyIsNative: false,
    slippageFactor: null,
  };
}

// ══════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ══════════════════════════════════════════════════════════

/**
 * Check ERC20 allowance and approve if needed
 */
export async function checkAndApprove({ provider, tokenAddress, spender, amount }) {
  const signer = await provider.getSigner();
  const account = await signer.getAddress();

  const erc20 = new ethers.Contract(tokenAddress, [
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
  ], signer);

  const current = await erc20.allowance(account, spender);
  if (current >= BigInt(amount)) return { approved: true, tx: null };

  const tx = await erc20.approve(spender, ethers.MaxUint256);
  await tx.wait();
  return { approved: true, tx };
}

/**
 * Execute a swap using the quote data.
 * Handles both 0x API calldata and on-chain DEX routing.
 */
export async function executeSwap({ provider, quoteData }) {
  const signer = await provider.getSigner();

  // ── 0x API route: send raw calldata ──
  if (quoteData.routeType === '0x' && quoteData.data && quoteData.to) {
    return signer.sendTransaction({
      to: quoteData.to,
      data: quoteData.data,
      value: quoteData.value || '0',
      gasLimit: Math.ceil(Number(quoteData.estimatedGas) * 1.3),
    });
  }

  // ── On-chain DEX route: call router directly ──
  const account = await signer.getAddress();
  const router = new ethers.Contract(quoteData.routerAddress, ROUTER_ABI, signer);
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

  // Apply slippage to minimum output
  const amountOutMin = quoteData.slippageFactor
    ? (BigInt(quoteData.buyAmount) * BigInt(quoteData.slippageFactor)) / 10000n
    : (BigInt(quoteData.buyAmount) * 9950n) / 10000n; // default 0.5%

  if (quoteData.sellIsNative) {
    // Native → Token: send native currency as value
    return router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      amountOutMin,
      quoteData.path,
      account,
      deadline,
      { value: quoteData.sellAmount }
    );
  } else if (quoteData.buyIsNative) {
    // Token → Native
    return router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      quoteData.sellAmount,
      amountOutMin,
      quoteData.path,
      account,
      deadline,
    );
  } else {
    // Token → Token
    return router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      quoteData.sellAmount,
      amountOutMin,
      quoteData.path,
      account,
      deadline,
    );
  }
}

// ── Gas estimation ──
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
  if (!gas) return null;
  try {
    let gasCostWei;
    if (gasPrice) {
      gasCostWei = BigInt(gas) * BigInt(gasPrice);
    } else {
      // Fetch current gas price from RPC
      const chain = CHAINS[chainId];
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const feeData = await provider.getFeeData();
      gasCostWei = BigInt(gas) * (feeData.gasPrice || 5000000000n); // 5 gwei fallback
    }
    const gasCostEth = Number(gasCostWei) / 1e18;
    const prices = await fetchNativePrices();
    const nativePrice = prices[chainId] || FALLBACK_PRICES[chainId] || 1;
    return (gasCostEth * nativePrice).toFixed(2);
  } catch {
    return null;
  }
}

// ── DEX Sources Info (for UI display) ──
export const DEX_SOURCES = {
  'KairosSwap': { color: '#D4AF37', icon: '◆' },
  'PancakeSwap': { color: '#D4A017', icon: '🥞' },
  'PancakeSwap_V3': { color: '#D4A017', icon: '🥞' },
  'Uniswap': { color: '#FF007A', icon: '🦄' },
  'Uniswap V2': { color: '#FF007A', icon: '🦄' },
  'Uniswap_V3': { color: '#FF007A', icon: '🦄' },
  'SushiSwap': { color: '#FA52A0', icon: '🍣' },
  'BaseSwap': { color: '#0052FF', icon: '🔵' },
  'QuickSwap': { color: '#8247E5', icon: '🟣' },
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
