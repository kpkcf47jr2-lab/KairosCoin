/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Liquidity Service
   KairosSwap (native AMM) on BSC + fallback DEXes on other chains
   100% of protocol fees stay within Kairos 777 ecosystem
   ═══════════════════════════════════════════════════════════ */
import { ethers } from 'ethers';
import { CHAINS } from '../config/chains';
import { KAIROS_ADDRESS, NATIVE_ADDRESS } from '../config/tokens';

// ══ KairosSwap — Native AMM (BSC) ══
// All fees (0.05% protocol + 0.25% LP) stay in Kairos ecosystem
const KAIROS_SWAP = {
  factory: '0xB5891c54199d539CB8afd37BFA9E17370095b9D9',
  router:  '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6',
};

// ── Router V2 addresses per chain ──
// BSC uses KairosSwap natively; other chains use established DEXes
const ROUTER_ADDRESSES = {
  56:    KAIROS_SWAP.router,  // KairosSwap (native AMM)
  1:     '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
  8453:  '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24', // Aerodrome / BaseSwap
  42161: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
  137:   '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
};

// ── Factory V2 addresses per chain ──
const FACTORY_ADDRESSES = {
  56:    KAIROS_SWAP.factory,  // KairosSwap Factory
  1:     '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Uniswap V2
  8453:  '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6', // BaseSwap
  42161: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4', // SushiSwap
  137:   '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', // QuickSwap
};

const DEX_NAMES = {
  56: 'KairosSwap', 1: 'Uniswap V2', 8453: 'BaseSwap',
  42161: 'SushiSwap', 137: 'QuickSwap',
};

// Exported for frontend display
export const KAIROS_SWAP_INFO = KAIROS_SWAP;

// ── ABIs ──
const ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
  'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function factory() external view returns (address)',
  'function WETH() external view returns (address)',
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

export function getDexName(chainId) {
  return DEX_NAMES[chainId] || 'DEX';
}

export function getRouterAddress(chainId) {
  return ROUTER_ADDRESSES[chainId];
}

/**
 * Get or create the LP pair address for two tokens
 */
export async function getPairAddress(provider, chainId, tokenA, tokenB) {
  const factory = new ethers.Contract(FACTORY_ADDRESSES[chainId], FACTORY_ABI, provider);
  const addrA = tokenA === NATIVE_ADDRESS ? CHAINS[chainId].wrappedNative : tokenA;
  const addrB = tokenB === NATIVE_ADDRESS ? CHAINS[chainId].wrappedNative : tokenB;
  const pair = await factory.getPair(addrA, addrB);
  return pair === ethers.ZeroAddress ? null : pair;
}

/**
 * Get pair reserves and user LP balance
 */
export async function getPairInfo(provider, chainId, tokenA, tokenB, account) {
  const pairAddr = await getPairAddress(provider, chainId, tokenA, tokenB);
  if (!pairAddr) return null;

  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [reserves, token0, totalSupply, userBalance] = await Promise.all([
    pair.getReserves(),
    pair.token0(),
    pair.totalSupply(),
    account ? pair.balanceOf(account) : 0n,
  ]);

  const addrA = tokenA === NATIVE_ADDRESS ? CHAINS[chainId].wrappedNative : tokenA;
  const isToken0 = addrA.toLowerCase() === token0.toLowerCase();

  return {
    pairAddress: pairAddr,
    reserveA: isToken0 ? reserves[0] : reserves[1],
    reserveB: isToken0 ? reserves[1] : reserves[0],
    totalSupply,
    userLPBalance: userBalance,
    userSharePercent: totalSupply > 0n
      ? Number((userBalance * 10000n) / totalSupply) / 100
      : 0,
  };
}

/**
 * Get user's LP positions for KAIROS pairs
 */
export async function getUserPositions(provider, chainId, account) {
  const kairosAddr = KAIROS_ADDRESS[chainId];
  if (!kairosAddr) return [];

  const chain = CHAINS[chainId];
  // Check pairs: KAIROS/Native, KAIROS/USDT, KAIROS/USDC
  const pairTokens = [
    { symbol: chain.nativeCurrency?.symbol || 'Native', address: NATIVE_ADDRESS, wrapped: chain.wrappedNative },
  ];

  // Add stablecoins for the chain
  const STABLES = {
    56: [
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
      { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
    ],
    1: [
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    ],
    8453: [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    ],
    42161: [
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ],
    137: [
      { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    ],
  };

  const stables = STABLES[chainId] || [];
  stables.forEach(s => pairTokens.push(s));

  const positions = [];
  const factory = new ethers.Contract(FACTORY_ADDRESSES[chainId], FACTORY_ABI, provider);

  for (const token of pairTokens) {
    try {
      const tokenAddr = token.wrapped || (token.address === NATIVE_ADDRESS ? chain.wrappedNative : token.address);
      const pairAddr = await factory.getPair(kairosAddr, tokenAddr);
      if (!pairAddr || pairAddr === ethers.ZeroAddress) continue;

      const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
      const [reserves, token0, totalSupply, userBal] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
        pair.totalSupply(),
        pair.balanceOf(account),
      ]);

      if (userBal === 0n && totalSupply === 0n) continue;

      const isKairosToken0 = kairosAddr.toLowerCase() === token0.toLowerCase();
      const reserveKairos = isKairosToken0 ? reserves[0] : reserves[1];
      const reserveOther = isKairosToken0 ? reserves[1] : reserves[0];

      positions.push({
        pair: `KAIROS/${token.symbol}`,
        pairAddress: pairAddr,
        tokenAddress: token.address,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals || 18,
        reserveKairos,
        reserveOther,
        totalSupply,
        userLPBalance: userBal,
        userSharePercent: totalSupply > 0n ? Number((userBal * 10000n) / totalSupply) / 100 : 0,
        dex: getDexName(chainId),
        hasPosition: userBal > 0n,
      });
    } catch (err) {
      console.warn(`Failed to check pair KAIROS/${token.symbol}:`, err.message);
    }
  }

  return positions;
}

/**
 * Approve token for Router
 */
export async function approveForRouter(provider, chainId, tokenAddress, amount) {
  const signer = await provider.getSigner();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const routerAddr = ROUTER_ADDRESSES[chainId];

  const currentAllowance = await token.allowance(await signer.getAddress(), routerAddr);
  if (currentAllowance >= BigInt(amount)) return null; // Already approved

  const tx = await token.approve(routerAddr, ethers.MaxUint256);
  await tx.wait();
  return tx.hash;
}

/**
 * Add liquidity — KAIROS + another token
 * If tokenB is NATIVE_ADDRESS, uses addLiquidityETH
 */
export async function addLiquidity({
  provider, chainId, tokenA, tokenB,
  amountA, amountB, slippage = 0.5, account,
}) {
  const signer = await provider.getSigner();
  const router = new ethers.Contract(ROUTER_ADDRESSES[chainId], ROUTER_ABI, signer);
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  const slippageFactor = BigInt(Math.floor((100 - slippage) * 10)) ; // e.g. 995 for 0.5%
  const amountAMin = (BigInt(amountA) * slippageFactor) / 1000n;
  const amountBMin = (BigInt(amountB) * slippageFactor) / 1000n;

  const isNativeB = tokenB === NATIVE_ADDRESS;

  let tx;
  if (isNativeB) {
    // addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline)
    tx = await router.addLiquidityETH(
      tokenA, amountA, amountAMin, amountBMin, account, deadline,
      { value: amountB }
    );
  } else {
    // addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline)
    tx = await router.addLiquidity(
      tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, account, deadline,
    );
  }

  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

/**
 * Remove liquidity — burn LP tokens to get back KAIROS + other token
 */
export async function removeLiquidity({
  provider, chainId, tokenA, tokenB,
  lpAmount, slippage = 0.5, account, pairAddress,
}) {
  const signer = await provider.getSigner();
  const router = new ethers.Contract(ROUTER_ADDRESSES[chainId], ROUTER_ABI, signer);
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  // Approve LP tokens for Router
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
  const currentAllowance = await pair.allowance(account, ROUTER_ADDRESSES[chainId]);
  if (currentAllowance < BigInt(lpAmount)) {
    const approveTx = await pair.approve(ROUTER_ADDRESSES[chainId], ethers.MaxUint256);
    await approveTx.wait();
  }

  const isNativeB = tokenB === NATIVE_ADDRESS;
  const addrA = tokenA;
  const addrB = isNativeB ? CHAINS[chainId].wrappedNative : tokenB;

  let tx;
  if (isNativeB) {
    tx = await router.removeLiquidityETH(addrA, lpAmount, 0, 0, account, deadline);
  } else {
    tx = await router.removeLiquidity(addrA, addrB, lpAmount, 0, 0, account, deadline);
  }

  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

/**
 * Calculate how much tokenB is needed for a given amountA based on pool reserves
 */
export function calculatePairedAmount(amountA, reserveA, reserveB) {
  if (reserveA === 0n || !amountA) return 0n;
  return (BigInt(amountA) * reserveB) / reserveA;
}

/**
 * Calculate price from reserves
 */
export function getPoolPrice(reserveA, reserveB, decimalsA = 18, decimalsB = 18) {
  if (reserveA === 0n) return 0;
  const adjustedA = Number(reserveA) / (10 ** decimalsA);
  const adjustedB = Number(reserveB) / (10 ** decimalsB);
  return adjustedB / adjustedA;
}
