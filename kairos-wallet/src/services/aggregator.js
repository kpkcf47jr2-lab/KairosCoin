// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Multi-DEX Aggregator
//  Compares prices across multiple DEXs per chain
//  Picks the BEST route — MetaMask doesn't do this
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS } from '../constants/chains';
import { getProvider } from './blockchain';

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function factory() external view returns (address)',
  'function WETH() external view returns (address)',
];

// Multiple DEXs per chain — MetaMask only uses one!
const MULTI_DEX = {
  56: [
    { name: 'PancakeSwap V2', router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', color: '#1FC7D4' },
    { name: 'BiSwap', router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8', color: '#FF6B35' },
    { name: 'ApeSwap', router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7', color: '#A16552' },
    { name: 'MDEX', router: '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8', color: '#4A90E2' },
  ],
  1: [
    { name: 'Uniswap V2', router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', color: '#FF007A' },
    { name: 'SushiSwap', router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', color: '#FA52A0' },
  ],
  137: [
    { name: 'QuickSwap', router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', color: '#418ACA' },
    { name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', color: '#FA52A0' },
  ],
  42161: [
    { name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', color: '#FA52A0' },
    { name: 'Camelot', router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d', color: '#FFAF1D' },
  ],
  43114: [
    { name: 'Trader Joe', router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', color: '#E84142' },
    { name: 'Pangolin', router: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', color: '#FC4C00' },
  ],
  8453: [
    { name: 'BaseSwap', router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', color: '#0052FF' },
    { name: 'Aerodrome', router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', color: '#0000FF' },
  ],
};

/**
 * Get quotes from ALL DEXs on a chain simultaneously
 * Returns sorted array: best price first
 */
export async function getAggregatedQuotes(chainId, tokenIn, tokenOut, amountIn, decimalsIn, decimalsOut) {
  const chain = CHAINS[chainId];
  const dexes = MULTI_DEX[chainId] || [];
  if (dexes.length === 0) throw new Error('No DEXs configurados para esta red');

  const wrappedNative = chain.wrappedNative;
  const isNativeIn = tokenIn === 'native';
  const isNativeOut = tokenOut === 'native';
  const actualTokenIn = isNativeIn ? wrappedNative : tokenIn;
  const actualTokenOut = isNativeOut ? wrappedNative : tokenOut;

  if (actualTokenIn.toLowerCase() === actualTokenOut.toLowerCase()) {
    throw new Error('No puedes intercambiar el mismo token');
  }

  const parsedAmountIn = ethers.parseUnits(amountIn.toString(), decimalsIn);
  const provider = getProvider(chainId);

  // Query ALL DEXs in parallel
  const quotePromises = dexes.map(async (dex) => {
    try {
      const router = new ethers.Contract(dex.router, ROUTER_ABI, provider);
      
      // Try direct path and through wrapped native
      const paths = [
        [actualTokenIn, actualTokenOut],
        ...(actualTokenIn.toLowerCase() !== wrappedNative.toLowerCase() &&
            actualTokenOut.toLowerCase() !== wrappedNative.toLowerCase()
          ? [[actualTokenIn, wrappedNative, actualTokenOut]]
          : []),
      ];

      let bestOut = 0n;
      let bestPath = null;

      for (const path of paths) {
        try {
          const amounts = await router.getAmountsOut(parsedAmountIn, path);
          const out = amounts[amounts.length - 1];
          if (out > bestOut) {
            bestOut = out;
            bestPath = path;
          }
        } catch { /* path not available */ }
      }

      if (!bestPath || bestOut === 0n) return null;

      const formattedOut = ethers.formatUnits(bestOut, decimalsOut);

      // Price impact
      let priceImpact = 0;
      try {
        const oneUnit = ethers.parseUnits('1', decimalsIn);
        const midAmounts = await router.getAmountsOut(oneUnit, bestPath);
        const midPrice = parseFloat(ethers.formatUnits(midAmounts[midAmounts.length - 1], decimalsOut));
        const effectivePrice = parseFloat(formattedOut) / parseFloat(amountIn);
        priceImpact = midPrice > 0 ? Math.abs((effectivePrice - midPrice) / midPrice) * 100 : 0;
      } catch {}

      return {
        dex: dex.name,
        dexColor: dex.color,
        router: dex.router,
        amountOut: formattedOut,
        amountOutRaw: bestOut.toString(),
        path: bestPath,
        priceImpact: priceImpact.toFixed(2),
        route: bestPath.map(addr =>
          addr.toLowerCase() === wrappedNative.toLowerCase()
            ? chain.nativeCurrency.symbol
            : addr
        ),
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(quotePromises);
  const quotes = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));

  if (quotes.length === 0) {
    throw new Error('No hay liquidez en ningún DEX para este par.');
  }

  // Mark best and savings
  if (quotes.length > 1) {
    const best = parseFloat(quotes[0].amountOut);
    const worst = parseFloat(quotes[quotes.length - 1].amountOut);
    quotes[0].isBest = true;
    quotes[0].savingsPercent = worst > 0 ? (((best - worst) / worst) * 100).toFixed(2) : '0';
  } else {
    quotes[0].isBest = true;
    quotes[0].savingsPercent = '0';
  }

  return quotes;
}

/**
 * Get DEX list for a chain
 */
export function getAvailableDEXs(chainId) {
  return MULTI_DEX[chainId] || [];
}
