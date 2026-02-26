// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Yield Vault Service
//  Multi-token yield via Aave V3, Venus, Compound V3
//  Supported: USDT, USDC, ETH, BTC, POL, BNB, KAIROS +
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS } from '../constants/chains';
import { getProvider } from './blockchain';

// ── Protocol ABIs (minimal) ──

const AAVE_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

const AAVE_DATA_ABI = [
  'function getReserveData(address asset) view returns (tuple(uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp))',
  'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
];

const VENUS_VTOKEN_ABI = [
  'function mint(uint256 mintAmount) returns (uint256)',
  'function redeem(uint256 redeemTokens) returns (uint256)',
  'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function balanceOfUnderlying(address owner) returns (uint256)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function exchangeRateStored() view returns (uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// ── Protocol Addresses ──

const PROTOCOLS = {
  // Aave V3 addresses
  aave: {
    1:     { pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426c86AF5bBb' },
    137:   { pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654' },
    42161: { pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654' },
    8453:  { pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', dataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac' },
  },
  // Venus (BSC)
  venus: {
    56: {
      comptroller: '0xfD36E2c2a6789Db23113685031d7F16329158384',
    },
  },
};

// ── Vault Tokens per Chain ──
// Each token: { symbol, name, address, decimals, icon, protocol, vaultAddress/poolAddress }

const VAULT_TOKENS = {
  // BSC (56) — Venus Protocol
  56: [
    { symbol: 'USDT',   name: 'Tether USD',     address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, icon: '💵', protocol: 'venus', vToken: '0xfD5840Cd36d94D7229439859C0112a4185BC0255' },
    { symbol: 'USDC',   name: 'USD Coin',        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, icon: '🪙', protocol: 'venus', vToken: '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8' },
    { symbol: 'BNB',    name: 'BNB',             address: '0x0000000000000000000000000000000000000000', decimals: 18, icon: '⛓️', protocol: 'venus', vToken: '0xA07c5b74C9B40447a954e1466938b865b6BBea36', isNative: true },
    { symbol: 'BTCB',   name: 'Bitcoin BEP2',    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, icon: '₿',  protocol: 'venus', vToken: '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B' },
    { symbol: 'ETH',    name: 'Ethereum',        address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, icon: '💎', protocol: 'venus', vToken: '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8' },
    { symbol: 'KAIROS', name: 'KairosCoin',      address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '🏛️', protocol: 'kairos', apy: 5.0 },
  ],
  // Ethereum (1) — Aave V3
  1: [
    { symbol: 'USDT',  name: 'Tether USD',  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  icon: '💵', protocol: 'aave' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  icon: '🪙', protocol: 'aave' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, icon: '💎', protocol: 'aave' },
    { symbol: 'WBTC',  name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  icon: '₿',  protocol: 'aave' },
    { symbol: 'DAI',   name: 'Dai',         address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, icon: '🟡', protocol: 'aave' },
  ],
  // Polygon (137) — Aave V3
  137: [
    { symbol: 'USDT',  name: 'Tether USD',  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  icon: '💵', protocol: 'aave' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6,  icon: '🪙', protocol: 'aave' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, icon: '💎', protocol: 'aave' },
    { symbol: 'WBTC',  name: 'Wrapped BTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8,  icon: '₿',  protocol: 'aave' },
    { symbol: 'POL',   name: 'POL',         address: '0x0000000000000000000000000000000000001010', decimals: 18, icon: '🟣', protocol: 'aave', wrappedAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9', decimals: 18, icon: '🏛️', protocol: 'kairos', apy: 5.0 },
  ],
  // Arbitrum (42161) — Aave V3
  42161: [
    { symbol: 'USDT',  name: 'Tether USD',  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  icon: '💵', protocol: 'aave' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  icon: '🪙', protocol: 'aave' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, icon: '💎', protocol: 'aave' },
    { symbol: 'WBTC',  name: 'Wrapped BTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8,  icon: '₿',  protocol: 'aave' },
    { symbol: 'ARB',   name: 'Arbitrum',    address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, icon: '🔵', protocol: 'aave' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '🏛️', protocol: 'kairos', apy: 5.0 },
  ],
  // Base (8453) — Aave V3
  8453: [
    { symbol: 'USDC',  name: 'USD Coin',    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  icon: '🪙', protocol: 'aave' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, icon: '💎', protocol: 'aave' },
    { symbol: 'KAIROS', name: 'KairosCoin', address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', decimals: 18, icon: '🏛️', protocol: 'kairos', apy: 5.0 },
  ],
  // Avalanche (43114) — Aave V3
  43114: [
    { symbol: 'USDT',  name: 'Tether USD',  address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6,  icon: '💵', protocol: 'aave' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6,  icon: '🪙', protocol: 'aave' },
    { symbol: 'WAVAX', name: 'Wrapped AVAX',address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18, icon: '🔺', protocol: 'aave' },
    { symbol: 'WBTC',  name: 'Wrapped BTC', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8,  icon: '₿',  protocol: 'aave' },
  ],
};

// ── Helpers ──
// Uses cached getProvider from blockchain.js (imported above)

function getSigner(chainId, privateKey) {
  return new ethers.Wallet(privateKey, getProvider(chainId));
}

// ── Local Vault Position Storage ──

const VAULT_STORAGE_KEY = 'kairos_vault_positions';

function getLocalPositions() {
  try {
    return JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveLocalPosition(address, chainId, tokenSymbol, data) {
  const positions = getLocalPositions();
  const key = `${address.toLowerCase()}_${chainId}_${tokenSymbol}`;
  positions[key] = { ...data, updatedAt: Date.now() };
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(positions));
}

function getLocalPosition(address, chainId, tokenSymbol) {
  const positions = getLocalPositions();
  return positions[`${address.toLowerCase()}_${chainId}_${tokenSymbol}`] || null;
}

// ── Public API ──

/**
 * Get available vault tokens for current chain
 */
export function getVaultTokens(chainId) {
  return VAULT_TOKENS[chainId] || [];
}

/**
 * Get APY for a token on its protocol
 */
export async function getTokenAPY(chainId, token) {
  try {
    // KAIROS fixed APY from treasury
    if (token.protocol === 'kairos') {
      return { apy: token.apy || 5.0, protocol: 'Kairos Treasury' };
    }

    // Aave V3
    if (token.protocol === 'aave') {
      const aaveConfig = PROTOCOLS.aave[chainId];
      if (!aaveConfig) return { apy: 0, protocol: 'Aave V3' };

      const provider = getProvider(chainId);
      const dataProvider = new ethers.Contract(aaveConfig.dataProvider, AAVE_DATA_ABI, provider);
      
      try {
        const reserveData = await dataProvider.getReserveData(token.address);
        // liquidityRate is in RAY (1e27), convert to APY percentage
        const liquidityRate = Number(reserveData.liquidityRate || reserveData[5]);
        const apy = (liquidityRate / 1e27) * 100;
        return { apy: Math.round(apy * 100) / 100, protocol: 'Aave V3' };
      } catch {
        // Fallback: estimate typical APYs
        const estimates = { USDT: 4.2, USDC: 4.5, WETH: 1.8, WBTC: 0.3, DAI: 4.0, POL: 2.5, ARB: 1.2, WAVAX: 2.0 };
        return { apy: estimates[token.symbol] || 2.0, protocol: 'Aave V3' };
      }
    }

    // Venus (BSC)
    if (token.protocol === 'venus' && token.vToken) {
      const provider = getProvider(chainId);
      const vToken = new ethers.Contract(token.vToken, VENUS_VTOKEN_ABI, provider);

      try {
        const supplyRate = await vToken.supplyRatePerBlock();
        // BSC ~28800 blocks/day, 365 days
        const blocksPerYear = 28800n * 365n;
        const apy = (Number(supplyRate) * Number(blocksPerYear)) / 1e18 * 100;
        return { apy: Math.round(apy * 100) / 100, protocol: 'Venus' };
      } catch {
        const estimates = { USDT: 3.8, USDC: 4.1, BNB: 1.5, BTCB: 0.5, ETH: 1.3 };
        return { apy: estimates[token.symbol] || 2.0, protocol: 'Venus' };
      }
    }

    return { apy: 0, protocol: 'Unknown' };
  } catch (err) {
    console.error('APY fetch error:', err);
    return { apy: 0, protocol: token.protocol };
  }
}

/**
 * Get all APYs for tokens on a chain
 */
export async function getAllAPYs(chainId) {
  const tokens = getVaultTokens(chainId);
  const results = {};

  // Fetch all in parallel
  const apyPromises = tokens.map(async (token) => {
    const { apy, protocol } = await getTokenAPY(chainId, token);
    results[token.symbol] = { apy, protocol };
  });

  await Promise.allSettled(apyPromises);
  return results;
}

/**
 * Get user's current balance of a vault token
 */
export async function getTokenBalance(chainId, address, token) {
  const provider = getProvider(chainId);

  if (token.isNative || token.address === '0x0000000000000000000000000000000000000000') {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
  const balance = await contract.balanceOf(address);
  return ethers.formatUnits(balance, token.decimals);
}

/**
 * Get user's deposited vault position
 */
export async function getVaultPosition(chainId, address, token) {
  try {
    if (token.protocol === 'kairos') {
      // KAIROS vault: tracked locally with simulated yield
      const pos = getLocalPosition(address, chainId, token.symbol);
      if (!pos || !pos.deposited || pos.deposited <= 0) return { deposited: 0, earned: 0 };

      const elapsed = (Date.now() - pos.depositedAt) / 1000; // seconds
      const apyRate = (token.apy || 5.0) / 100;
      const secondRate = apyRate / (365.25 * 24 * 3600);
      const earned = pos.deposited * secondRate * elapsed;

      return {
        deposited: pos.deposited,
        earned: Math.round(earned * 1e6) / 1e6,
        depositedAt: pos.depositedAt,
        protocol: 'Kairos Treasury',
      };
    }

    if (token.protocol === 'venus' && token.vToken) {
      const provider = getProvider(chainId);
      const vToken = new ethers.Contract(token.vToken, VENUS_VTOKEN_ABI, provider);

      const vBalance = await vToken.balanceOf(address);
      if (vBalance === 0n) return { deposited: 0, earned: 0 };

      const exchangeRate = await vToken.exchangeRateStored();
      const underlying = (vBalance * exchangeRate) / ethers.parseEther('1');
      const deposited = Number(ethers.formatUnits(underlying, token.decimals));

      // Check local position for earned calculation
      const pos = getLocalPosition(address, chainId, token.symbol);
      const earned = pos ? Math.max(0, deposited - pos.deposited) : 0;

      return { deposited, earned, protocol: 'Venus' };
    }

    if (token.protocol === 'aave') {
      const aaveConfig = PROTOCOLS.aave[chainId];
      if (!aaveConfig) return { deposited: 0, earned: 0 };

      const provider = getProvider(chainId);
      const dataProvider = new ethers.Contract(aaveConfig.dataProvider, AAVE_DATA_ABI, provider);

      const assetAddr = token.wrappedAddress || token.address;
      const userData = await dataProvider.getUserReserveData(assetAddr, address);
      const aTokenBalance = Number(ethers.formatUnits(userData[0], token.decimals));

      if (aTokenBalance <= 0) return { deposited: 0, earned: 0 };

      const pos = getLocalPosition(address, chainId, token.symbol);
      const earned = pos ? Math.max(0, aTokenBalance - pos.deposited) : 0;

      return { deposited: aTokenBalance, earned, protocol: 'Aave V3' };
    }

    return { deposited: 0, earned: 0 };
  } catch (err) {
    console.error('Position fetch error:', err);
    // Fallback to local
    const pos = getLocalPosition(address, chainId, token.symbol);
    if (pos && pos.deposited > 0) {
      const elapsed = (Date.now() - (pos.depositedAt || Date.now())) / 1000;
      const apyRate = (token.apy || 3.0) / 100;
      const earned = pos.deposited * (apyRate / (365.25 * 24 * 3600)) * elapsed;
      return { deposited: pos.deposited, earned: Math.round(earned * 1e6) / 1e6, protocol: token.protocol };
    }
    return { deposited: 0, earned: 0 };
  }
}

/**
 * Get ALL vault positions for a user across tokens on a chain
 */
export async function getAllPositions(chainId, address) {
  const tokens = getVaultTokens(chainId);
  const results = [];

  const promises = tokens.map(async (token) => {
    const position = await getVaultPosition(chainId, address, token);
    if (position.deposited > 0) {
      results.push({ ...token, ...position });
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Deposit token into vault
 */
export async function deposit(chainId, privateKey, token, amount) {
  const signer = getSigner(chainId, privateKey);
  const address = signer.address;
  const parsedAmount = ethers.parseUnits(amount.toString(), token.decimals);

  // KAIROS vault: local tracking with virtual yield
  if (token.protocol === 'kairos') {
    const pos = getLocalPosition(address, chainId, token.symbol);
    const currentDeposited = pos?.deposited || 0;

    // Transfer KAIROS to vault address (owner wallet acts as treasury)
    const kairos = new ethers.Contract(token.address, ERC20_ABI, signer);
    const tx = await kairos.approve(address, parsedAmount);
    await tx.wait();
    // NOTE: In production, transfer to treasury wallet. For now, track locally.

    saveLocalPosition(address, chainId, token.symbol, {
      deposited: currentDeposited + parseFloat(amount),
      depositedAt: pos?.depositedAt || Date.now(),
    });

    return { success: true, hash: tx.hash, protocol: 'Kairos Treasury' };
  }

  // Venus deposit (BSC)
  if (token.protocol === 'venus' && token.vToken) {
    const vTokenContract = new ethers.Contract(token.vToken, VENUS_VTOKEN_ABI, signer);

    if (token.isNative) {
      // BNB: send directly to vBNB
      const tx = await vTokenContract.mint(parsedAmount, { value: parsedAmount });
      const receipt = await tx.wait();
      saveLocalPosition(address, chainId, token.symbol, { deposited: parseFloat(amount), depositedAt: Date.now() });
      return { success: true, hash: receipt.hash, protocol: 'Venus' };
    } else {
      // ERC-20: approve + mint
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
      const allowance = await tokenContract.allowance(address, token.vToken);
      if (allowance < parsedAmount) {
        const approveTx = await tokenContract.approve(token.vToken, ethers.MaxUint256);
        await approveTx.wait();
      }
      const tx = await vTokenContract.mint(parsedAmount);
      const receipt = await tx.wait();
      saveLocalPosition(address, chainId, token.symbol, { deposited: parseFloat(amount), depositedAt: Date.now() });
      return { success: true, hash: receipt.hash, protocol: 'Venus' };
    }
  }

  // Aave V3 deposit
  if (token.protocol === 'aave') {
    const aaveConfig = PROTOCOLS.aave[chainId];
    if (!aaveConfig) throw new Error('Aave not available on this chain');

    const poolContract = new ethers.Contract(aaveConfig.pool, AAVE_POOL_ABI, signer);
    const assetAddr = token.wrappedAddress || token.address;

    // Approve
    const tokenContract = new ethers.Contract(assetAddr, ERC20_ABI, signer);
    const allowance = await tokenContract.allowance(address, aaveConfig.pool);
    if (allowance < parsedAmount) {
      const approveTx = await tokenContract.approve(aaveConfig.pool, ethers.MaxUint256);
      await approveTx.wait();
    }

    // Supply
    const tx = await poolContract.supply(assetAddr, parsedAmount, address, 0);
    const receipt = await tx.wait();
    saveLocalPosition(address, chainId, token.symbol, { deposited: parseFloat(amount), depositedAt: Date.now() });
    return { success: true, hash: receipt.hash, protocol: 'Aave V3' };
  }

  throw new Error('Protocol not supported');
}

/**
 * Withdraw from vault
 */
export async function withdraw(chainId, privateKey, token, amount) {
  const signer = getSigner(chainId, privateKey);
  const address = signer.address;
  const parsedAmount = ethers.parseUnits(amount.toString(), token.decimals);

  // KAIROS vault
  if (token.protocol === 'kairos') {
    const pos = getLocalPosition(address, chainId, token.symbol);
    if (!pos || pos.deposited < parseFloat(amount)) throw new Error('Saldo insuficiente en vault');

    const newDeposited = pos.deposited - parseFloat(amount);
    saveLocalPosition(address, chainId, token.symbol, {
      deposited: newDeposited > 0.0001 ? newDeposited : 0,
      depositedAt: newDeposited > 0 ? pos.depositedAt : 0,
    });

    return { success: true, hash: '0x_kairos_local_withdraw', protocol: 'Kairos Treasury' };
  }

  // Venus
  if (token.protocol === 'venus' && token.vToken) {
    const vTokenContract = new ethers.Contract(token.vToken, VENUS_VTOKEN_ABI, signer);
    const tx = await vTokenContract.redeemUnderlying(parsedAmount);
    const receipt = await tx.wait();

    const pos = getLocalPosition(address, chainId, token.symbol);
    if (pos) {
      const newDeposited = Math.max(0, pos.deposited - parseFloat(amount));
      saveLocalPosition(address, chainId, token.symbol, { ...pos, deposited: newDeposited });
    }
    return { success: true, hash: receipt.hash, protocol: 'Venus' };
  }

  // Aave V3
  if (token.protocol === 'aave') {
    const aaveConfig = PROTOCOLS.aave[chainId];
    if (!aaveConfig) throw new Error('Aave not available on this chain');

    const poolContract = new ethers.Contract(aaveConfig.pool, AAVE_POOL_ABI, signer);
    const assetAddr = token.wrappedAddress || token.address;

    const tx = await poolContract.withdraw(assetAddr, parsedAmount, address);
    const receipt = await tx.wait();

    const pos = getLocalPosition(address, chainId, token.symbol);
    if (pos) {
      const newDeposited = Math.max(0, pos.deposited - parseFloat(amount));
      saveLocalPosition(address, chainId, token.symbol, { ...pos, deposited: newDeposited });
    }
    return { success: true, hash: receipt.hash, protocol: 'Aave V3' };
  }

  throw new Error('Protocol not supported');
}

/**
 * Estimate gas cost for deposit/withdraw
 */
export async function estimateGas(chainId, token, action = 'deposit') {
  try {
    const provider = getProvider(chainId);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;

    // Estimated gas limits per protocol
    const gasLimits = {
      kairos: 60000n,
      venus: 250000n,
      aave: 300000n,
    };

    const gasLimit = gasLimits[token.protocol] || 200000n;
    const gasCost = gasLimit * gasPrice;

    return {
      gasLimit: gasLimit.toString(),
      gasCostWei: gasCost.toString(),
      gasCostFormatted: ethers.formatEther(gasCost),
    };
  } catch {
    return { gasLimit: '200000', gasCostWei: '0', gasCostFormatted: '0.0' };
  }
}

/**
 * Get total vault value in USD for an address across all chains
 */
export async function getTotalVaultValueUSD(address) {
  const chainIds = Object.keys(VAULT_TOKENS).map(Number);
  let totalUSD = 0;

  // Token price estimates (in production, fetch from CoinGecko/CoinMarketCap)
  const prices = {
    USDT: 1, USDC: 1, DAI: 1,
    ETH: 2800, WETH: 2800,
    BTC: 95000, BTCB: 95000, WBTC: 95000,
    BNB: 650, POL: 0.45, ARB: 1.10, WAVAX: 35, AVAX: 35,
    KAIROS: 1,
  };

  for (const chainId of chainIds) {
    const positions = await getAllPositions(chainId, address);
    for (const pos of positions) {
      const price = prices[pos.symbol] || 0;
      totalUSD += (pos.deposited + pos.earned) * price;
    }
  }

  return Math.round(totalUSD * 100) / 100;
}
