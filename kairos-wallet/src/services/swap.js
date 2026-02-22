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
  
  // Approve max uint256 for convenience (standard practice like MetaMask)
  const tx = await token.approve(spenderAddress, ethers.MaxUint256);
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

/**
 * Get list of popular swap tokens for a chain (with natives)
 */
export function getSwapTokens(chainId, balances) {
  const chain = CHAINS[chainId];
  const tokens = [];
  
  // Add native
  if (balances?.native) {
    tokens.push({
      ...balances.native,
      id: 'native',
      isNative: true,
    });
  }

  // Add tokens with balance first
  if (balances?.tokens) {
    for (const t of balances.tokens) {
      tokens.push({ ...t, id: t.address });
    }
  }

  return tokens;
}
