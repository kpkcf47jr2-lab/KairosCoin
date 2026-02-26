// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Swap Service
//  Real DEX integration: PancakeSwap, Uniswap, QuickSwap
//  Supports token-to-token, native-to-token swaps
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS, ERC20_ABI } from '../constants/chains';
import { getProvider } from './blockchain';

// Router V2 ABI (standard across Uniswap V2 forks)
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
  'function factory() external view returns (address)',
  'function WETH() external view returns (address)',
];

// Factory ABI to check pair existence
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

// Pair ABI for reserves
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

// DEX names per chain
export const DEX_NAMES = {
  56: 'PancakeSwap',
  1: 'Uniswap',
  137: 'QuickSwap',
  42161: 'SushiSwap',
  43114: 'Trader Joe',
  8453: 'BaseSwap',
};

// Slippage presets
export const SLIPPAGE_PRESETS = {
  low: { value: 0.1, label: '0.1%' },
  medium: { value: 0.5, label: '0.5%' },
  high: { value: 1.0, label: '1.0%' },
  custom: { value: null, label: 'Custom' },
};

/**
 * Get router contract for a chain
 */
function getRouter(chainId) {
  const chain = CHAINS[chainId];
  if (!chain?.dexRouter) throw new Error('No DEX disponible en esta red');
  const provider = getProvider(chainId);
  return new ethers.Contract(chain.dexRouter, ROUTER_ABI, provider);
}

/**
 * Get factory contract from router
 */
async function getFactory(chainId) {
  const router = getRouter(chainId);
  const factoryAddress = await router.factory();
  const provider = getProvider(chainId);
  return new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
}

/**
 * Check if a trading pair exists
 */
export async function pairExists(chainId, tokenA, tokenB) {
  try {
    const factory = await getFactory(chainId);
    const pairAddress = await factory.getPair(tokenA, tokenB);
    return pairAddress !== ethers.ZeroAddress;
  } catch {
    return false;
  }
}

/**
 * Get swap quote (expected output amount)
 * @param {number} chainId
 * @param {string} tokenIn - Input token address (or 'native' for BNB/ETH)
 * @param {string} tokenOut - Output token address (or 'native')
 * @param {string} amountIn - Human-readable amount
 * @param {number} decimalsIn - Input token decimals
 * @param {number} decimalsOut - Output token decimals
 * @returns {{ amountOut, path, priceImpact, route }}
 */
export async function getSwapQuote(chainId, tokenIn, tokenOut, amountIn, decimalsIn, decimalsOut) {
  const chain = CHAINS[chainId];
  const router = getRouter(chainId);
  const wrappedNative = chain.wrappedNative;

  const isNativeIn = tokenIn === 'native';
  const isNativeOut = tokenOut === 'native';
  
  const actualTokenIn = isNativeIn ? wrappedNative : tokenIn;
  const actualTokenOut = isNativeOut ? wrappedNative : tokenOut;

  if (actualTokenIn.toLowerCase() === actualTokenOut.toLowerCase()) {
    throw new Error('No puedes intercambiar el mismo token');
  }

  const parsedAmountIn = ethers.parseUnits(amountIn.toString(), decimalsIn);

  // Build possible paths
  const paths = [
    // Direct path
    [actualTokenIn, actualTokenOut],
    // Through wrapped native
    ...(actualTokenIn.toLowerCase() !== wrappedNative.toLowerCase() && 
        actualTokenOut.toLowerCase() !== wrappedNative.toLowerCase()
      ? [[actualTokenIn, wrappedNative, actualTokenOut]]
      : []),
  ];

  let bestAmountOut = 0n;
  let bestPath = null;

  for (const path of paths) {
    try {
      const amounts = await router.getAmountsOut(parsedAmountIn, path);
      const out = amounts[amounts.length - 1];
      if (out > bestAmountOut) {
        bestAmountOut = out;
        bestPath = path;
      }
    } catch {
      // Path doesn't exist, try next
    }
  }

  if (!bestPath || bestAmountOut === 0n) {
    throw new Error('No hay liquidez para este par. Prueba otro token o cantidad.');
  }

  const formattedOut = ethers.formatUnits(bestAmountOut, decimalsOut);
  
  // Calculate price impact
  const amountInFloat = parseFloat(amountIn);
  const amountOutFloat = parseFloat(formattedOut);
  const effectivePrice = amountOutFloat / amountInFloat;
  
  // Get mid-price from single unit
  let midPrice = 0;
  try {
    const oneUnit = ethers.parseUnits('1', decimalsIn);
    const midAmounts = await router.getAmountsOut(oneUnit, bestPath);
    midPrice = parseFloat(ethers.formatUnits(midAmounts[midAmounts.length - 1], decimalsOut));
  } catch {}
  
  const priceImpact = midPrice > 0 ? Math.abs((effectivePrice - midPrice) / midPrice) * 100 : 0;

  // Build route display
  const route = bestPath.map(addr => {
    if (addr.toLowerCase() === wrappedNative.toLowerCase()) return chain.nativeCurrency.symbol;
    return addr;
  });

  return {
    amountOut: formattedOut,
    amountOutRaw: bestAmountOut.toString(),
    path: bestPath,
    priceImpact: priceImpact.toFixed(2),
    effectivePrice,
    route,
    dex: DEX_NAMES[chainId] || 'DEX',
  };
}

/**
 * Check and approve token spending if needed
 */
export async function checkAndApprove(chainId, privateKey, tokenAddress, spenderAddress, amount, decimals) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  
  const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
  const currentAllowance = await token.allowance(wallet.address, spenderAddress);
  
  if (currentAllowance >= parsedAmount) {
    return null; // Already approved
  }
  
  // Approve only exact amount needed (safer than MaxUint256)
  const tx = await token.approve(spenderAddress, parsedAmount);
  await tx.wait();
  
  return {
    hash: tx.hash,
    type: 'approve',
  };
}

/**
 * Execute a swap
 * @param {Object} params
 * @param {number} params.chainId
 * @param {string} params.privateKey
 * @param {string} params.tokenIn - 'native' or token address
 * @param {string} params.tokenOut - 'native' or token address
 * @param {string} params.amountIn - Human-readable
 * @param {string} params.amountOutMin - Minimum output (after slippage)
 * @param {number} params.decimalsIn
 * @param {number} params.decimalsOut
 * @param {string[]} params.path - Token path from quote
 * @param {number} params.slippage - Slippage percentage (e.g., 0.5)
 * @param {boolean} params.useFeeOnTransfer - For tokens with transfer taxes
 */
export async function executeSwap({
  chainId, privateKey, tokenIn, tokenOut, amountIn, amountOutMin,
  decimalsIn, decimalsOut, path, slippage = 0.5, useFeeOnTransfer = false,
}) {
  const chain = CHAINS[chainId];
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const router = new ethers.Contract(chain.dexRouter, ROUTER_ABI, wallet);
  
  const parsedAmountIn = ethers.parseUnits(amountIn.toString(), decimalsIn);
  
  // Calculate minimum output with slippage
  const parsedAmountOutMin = ethers.parseUnits(amountOutMin.toString(), decimalsOut);
  const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100));
  const minOut = (parsedAmountOutMin * slippageMultiplier) / 10000n;
  
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  const isNativeIn = tokenIn === 'native';
  const isNativeOut = tokenOut === 'native';

  let tx;

  if (isNativeIn) {
    // Native -> Token (swapExactETHForTokens)
    if (useFeeOnTransfer) {
      tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        minOut, path, wallet.address, deadline,
        { value: parsedAmountIn }
      );
    } else {
      tx = await router.swapExactETHForTokens(
        minOut, path, wallet.address, deadline,
        { value: parsedAmountIn }
      );
    }
  } else if (isNativeOut) {
    // Token -> Native (swapExactTokensForETH)
    // First approve if needed
    await checkAndApprove(chainId, privateKey, tokenIn, chain.dexRouter, amountIn, decimalsIn);
    
    if (useFeeOnTransfer) {
      tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        parsedAmountIn, minOut, path, wallet.address, deadline
      );
    } else {
      tx = await router.swapExactTokensForETH(
        parsedAmountIn, minOut, path, wallet.address, deadline
      );
    }
  } else {
    // Token -> Token (swapExactTokensForTokens)
    await checkAndApprove(chainId, privateKey, tokenIn, chain.dexRouter, amountIn, decimalsIn);
    
    if (useFeeOnTransfer) {
      tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parsedAmountIn, minOut, path, wallet.address, deadline
      );
    } else {
      tx = await router.swapExactTokensForTokens(
        parsedAmountIn, minOut, path, wallet.address, deadline
      );
    }
  }

  return {
    hash: tx.hash,
    from: wallet.address,
    type: 'swap',
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin: ethers.formatUnits(minOut, decimalsOut),
    dex: DEX_NAMES[chainId],
    chainId,
    timestamp: Date.now(),
    status: 'pending',
  };
}

// ═══════════════════════════════════════════════════════
//  POPULAR TOKENS CATALOG (per chain)
// ═══════════════════════════════════════════════════════
const POPULAR_TOKENS = {
  56: [
    { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, icon: '💵' },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, icon: '💲' },
    { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, icon: '🟡' },
    { symbol: 'ETH', name: 'Ethereum', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, icon: '⟠' },
    { symbol: 'BTCB', name: 'Bitcoin BEP20', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, icon: '₿' },
    { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, icon: '🥞' },
    { symbol: 'XRP', name: 'XRP', address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals: 18, icon: '✕' },
    { symbol: 'DOGE', name: 'Dogecoin', address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals: 8, icon: '🐕' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '⏳' },
  ],
  1: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, icon: '💵' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, icon: '💲' },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, icon: '◈' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, icon: '₿' },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, icon: '🦄' },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, icon: '⬡' },
    { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, icon: '🐕' },
    { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, icon: '🐸' },
  ],
  137: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, icon: '💵' },
    { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, icon: '💲' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, icon: '₿' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, icon: '⟠' },
    { symbol: 'AAVE', name: 'Aave', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, icon: '👻' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9', decimals: 18, icon: '⏳' },
  ],
  42161: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, icon: '💵' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, icon: '💲' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, icon: '₿' },
    { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, icon: '🔵' },
    { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18, icon: '💎' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '⏳' },
  ],
  8453: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, icon: '💲' },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, icon: '◈' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '⏳' },
  ],
  43114: [
    { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, icon: '💵' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, icon: '💲' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8, icon: '₿' },
    { symbol: 'JOE', name: 'Trader Joe', address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', decimals: 18, icon: '🎩' },
  ],
};

/**
 * Get list of swap tokens for a chain — user's token balances + popular catalog
 */
export function getSwapTokens(chainId, balances) {
  const tokens = [];
  const addedAddresses = new Set();
  
  // 1. Add native token
  if (balances?.native) {
    tokens.push({ ...balances.native, id: 'native', isNative: true });
    addedAddresses.add('native');
  }

  // 2. Add user's tokens (with balances)
  if (balances?.tokens) {
    for (const t of balances.tokens) {
      tokens.push({ ...t, id: t.address, hasBalance: true });
      addedAddresses.add(t.address.toLowerCase());
    }
  }

  // 3. Add popular tokens not yet in list (balance = 0)
  const popular = POPULAR_TOKENS[chainId] || [];
  for (const p of popular) {
    if (!addedAddresses.has(p.address.toLowerCase())) {
      tokens.push({
        ...p,
        id: p.address,
        balance: '0',
        hasBalance: false,
      });
      addedAddresses.add(p.address.toLowerCase());
    }
  }

  return tokens;
}

/**
 * Look up a token by address on-chain
 */
export async function lookupToken(chainId, address) {
  const provider = getProvider(chainId);
  const token = new ethers.Contract(address, [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ], provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name().catch(() => 'Unknown'),
    token.symbol().catch(() => '???'),
    token.decimals().catch(() => 18),
    token.totalSupply().catch(() => 0n),
  ]);

  return {
    address,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: ethers.formatUnits(totalSupply, decimals),
    id: address,
    balance: '0',
    hasBalance: false,
  };
}

// ═══════════════════════════════════════════════════════
//  SWAP HISTORY
// ═══════════════════════════════════════════════════════
const SWAP_HISTORY_KEY = 'kairos_swap_history';
const MAX_SWAP_HISTORY = 50;

export function getSwapHistory() {
  try { return JSON.parse(localStorage.getItem(SWAP_HISTORY_KEY) || '[]'); } catch { return []; }
}

export function addSwapToHistory(swap) {
  const history = getSwapHistory();
  history.unshift({
    ...swap,
    id: Date.now().toString(36),
    timestamp: Date.now(),
  });
  if (history.length > MAX_SWAP_HISTORY) history.length = MAX_SWAP_HISTORY;
  localStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(history));
}

// ═══════════════════════════════════════════════════════
//  FAVORITES
// ═══════════════════════════════════════════════════════
const SWAP_FAVORITES_KEY = 'kairos_swap_favorites';

export function getSwapFavorites() {
  try { return JSON.parse(localStorage.getItem(SWAP_FAVORITES_KEY) || '[]'); } catch { return []; }
}

export function toggleSwapFavorite(pair) {
  const favs = getSwapFavorites();
  const key = `${pair.fromSymbol}-${pair.toSymbol}`;
  const exists = favs.findIndex(f => f.key === key);
  if (exists >= 0) {
    favs.splice(exists, 1);
  } else {
    favs.push({ ...pair, key });
  }
  localStorage.setItem(SWAP_FAVORITES_KEY, JSON.stringify(favs));
  return favs;
}
