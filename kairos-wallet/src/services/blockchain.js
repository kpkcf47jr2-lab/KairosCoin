// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Blockchain Service
//  Multi-chain RPC interactions, balance queries,
//  token operations, transaction management
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS, ERC20_ABI, DEFAULT_TOKENS } from '../constants/chains';
import { getDiscoveredTokens } from './tokenDiscovery';

// Provider cache to reuse connections
const providerCache = new Map();

/**
 * Get or create a provider for a chain.
 * Uses FallbackProvider when multiple RPCs are available for automatic failover.
 */
export function getProvider(chainId) {
  // Support custom chains from localStorage
  const customChains = JSON.parse(localStorage.getItem('kairos_custom_chains') || '{}');
  const chain = CHAINS[chainId] || customChains[chainId];
  if (!chain) throw new Error(`Chain ${chainId} not supported`);

  const key = `provider_${chainId}`;
  if (providerCache.has(key)) return providerCache.get(key);

  let provider;
  const rpcUrls = chain.rpcUrls || [chain.rpcUrl];

  if (rpcUrls.length > 1) {
    // Real FallbackProvider — tries each RPC in order
    const providers = rpcUrls.map((url, i) => {
      const p = new ethers.JsonRpcProvider(url, chainId, {
        staticNetwork: true,
        batchMaxCount: 10,
      });
      return { provider: p, priority: i + 1, stallTimeout: 2000, weight: 1 };
    });
    provider = new ethers.FallbackProvider(providers, chainId);
  } else {
    provider = new ethers.JsonRpcProvider(rpcUrls[0], chainId, {
      staticNetwork: true,
      batchMaxCount: 10,
    });
  }

  providerCache.set(key, provider);
  return provider;
}

/**
 * Clear provider cache (used when custom networks change)
 */
export function clearProviderCache(chainId) {
  if (chainId) {
    providerCache.delete(`provider_${chainId}`);
  } else {
    providerCache.clear();
  }
}

/**
 * Get native currency balance (BNB, ETH, MATIC, etc.)
 */
export async function getNativeBalance(chainId, address) {
  const provider = getProvider(chainId);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Get ERC-20 token balance
 */
export async function getTokenBalance(chainId, tokenAddress, walletAddress) {
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  
  const [balance, decimals] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals(),
  ]);

  return {
    raw: balance.toString(),
    formatted: ethers.formatUnits(balance, decimals),
    decimals: Number(decimals),
  };
}

/**
 * Get all token balances for a wallet on a chain
 */
export async function getAllBalances(chainId, walletAddress, customTokens = []) {
  const chain = CHAINS[chainId];
  const provider = getProvider(chainId);
  const defaultTokens = DEFAULT_TOKENS[chainId] || [];
  const discoveredTokens = getDiscoveredTokens(chainId);
  
  // Merge all token lists, dedup by address
  const seen = new Set();
  const allTokens = [];
  for (const token of [...defaultTokens, ...discoveredTokens, ...customTokens]) {
    const addr = token.address.toLowerCase();
    if (!seen.has(addr)) {
      seen.add(addr);
      allTokens.push(token);
    }
  }

  // Get native balance
  const nativeBalancePromise = provider.getBalance(walletAddress);

  // Get all token balances in parallel
  const tokenPromises = allTokens.map(async (token) => {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const formatted = ethers.formatUnits(balance, token.decimals);
      return {
        ...token,
        balance: formatted,
        balanceRaw: balance.toString(),
        hasBalance: balance > 0n,
      };
    } catch (err) {
      return { ...token, balance: '0', balanceRaw: '0', hasBalance: false, error: true };
    }
  });

  const [nativeBalance, ...tokenResults] = await Promise.all([
    nativeBalancePromise,
    ...tokenPromises,
  ]);

  return {
    native: {
      ...chain.nativeCurrency,
      balance: ethers.formatEther(nativeBalance),
      balanceRaw: nativeBalance.toString(),
      hasBalance: nativeBalance > 0n,
      isNative: true,
    },
    tokens: tokenResults,
  };
}

/**
 * Get token info from contract
 */
export async function getTokenInfo(chainId, tokenAddress) {
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      chainId,
    };
  } catch (err) {
    throw new Error('Token no encontrado o contrato inválido');
  }
}

/**
 * Send native currency (BNB, ETH, etc.)
 */
export async function sendNative(chainId, privateKey, to, amount, gasPreset = 'standard') {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const feeData = await provider.getFeeData();
  const multiplier = { slow: 0.8, standard: 1.0, fast: 1.3, instant: 1.8 }[gasPreset] || 1.0;
  const mult100 = BigInt(Math.round(multiplier * 100));

  // Build tx params — support both EIP-1559 and legacy gas
  const txParams = {
    to,
    value: ethers.parseEther(amount.toString()),
  };

  if (feeData.maxFeePerGas) {
    // EIP-1559 (Ethereum, Arbitrum, Base, etc.)
    txParams.maxFeePerGas = feeData.maxFeePerGas * mult100 / 100n;
    txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * mult100 / 100n;
  } else if (feeData.gasPrice) {
    // Legacy (BSC, older networks)
    txParams.gasPrice = feeData.gasPrice * mult100 / 100n;
  }

  const tx = await wallet.sendTransaction(txParams);

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: amount,
    chainId,
    timestamp: Date.now(),
    status: 'pending',
  };
}

/**
 * Send ERC-20 token
 */
export async function sendToken(chainId, privateKey, tokenAddress, to, amount, decimals, gasPreset = 'standard') {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  
  const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

  const tx = await contract.transfer(to, parsedAmount);

  return {
    hash: tx.hash,
    from: tx.from,
    to,
    value: amount,
    tokenAddress,
    chainId,
    timestamp: Date.now(),
    status: 'pending',
  };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(chainId, txHash) {
  const provider = getProvider(chainId);
  const receipt = await provider.waitForTransaction(txHash, 1, 120000);
  return {
    hash: txHash,
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Estimate gas for a native transfer
 */
export async function estimateGasNative(chainId, from, to, amount) {
  const provider = getProvider(chainId);
  const gasEstimate = await provider.estimateGas({
    from,
    to,
    value: ethers.parseEther(amount.toString()),
  });
  const feeData = await provider.getFeeData();
  const effectiveGasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const gasCost = gasEstimate * effectiveGasPrice;
  
  return {
    gasLimit: gasEstimate.toString(),
    gasPrice: ethers.formatUnits(effectiveGasPrice, 'gwei'),
    gasCostWei: gasCost.toString(),
    gasCostFormatted: ethers.formatEther(gasCost),
  };
}

/**
 * Estimate gas for token transfer
 */
export async function estimateGasToken(chainId, from, tokenAddress, to, amount, decimals) {
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
  
  const gasEstimate = await contract.transfer.estimateGas(to, parsedAmount, { from });
  const feeData = await provider.getFeeData();
  const effectiveGasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const gasCost = gasEstimate * effectiveGasPrice;
  
  return {
    gasLimit: gasEstimate.toString(),
    gasPrice: ethers.formatUnits(effectiveGasPrice, 'gwei'),
    gasCostWei: gasCost.toString(),
    gasCostFormatted: ethers.formatEther(gasCost),
  };
}

/**
 * Get transaction history from block explorer API
 */
export async function getTransactionHistory(chainId, address, page = 1, limit = 20) {
  const chain = CHAINS[chainId];
  if (!chain?.blockExplorerApiUrl) return [];

  try {
    // Normal transactions
    const url = `${chain.blockExplorerApiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${limit}&sort=desc`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1') return [];

    return data.result.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
      timestamp: Number(tx.timeStamp) * 1000,
      blockNumber: Number(tx.blockNumber),
      status: tx.txreceipt_status === '1' ? 'confirmed' : 'failed',
      isIncoming: tx.to.toLowerCase() === address.toLowerCase(),
      chainId,
      nonce: Number(tx.nonce),
    }));
  } catch (err) {
    console.error('Failed to fetch tx history:', err);
    return [];
  }
}

/**
 * Get ERC-20 token transfer history
 */
export async function getTokenTransferHistory(chainId, address, tokenAddress = null, page = 1, limit = 20) {
  const chain = CHAINS[chainId];
  if (!chain?.blockExplorerApiUrl) return [];

  try {
    let url = `${chain.blockExplorerApiUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${limit}&sort=desc`;
    if (tokenAddress) {
      url += `&contractaddress=${tokenAddress}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1') return [];

    return data.result.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatUnits(tx.value, Number(tx.tokenDecimal)),
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      tokenAddress: tx.contractAddress,
      tokenDecimal: Number(tx.tokenDecimal),
      timestamp: Number(tx.timeStamp) * 1000,
      blockNumber: Number(tx.blockNumber),
      status: 'confirmed',
      isIncoming: tx.to.toLowerCase() === address.toLowerCase(),
      chainId,
    }));
  } catch (err) {
    console.error('Failed to fetch token tx history:', err);
    return [];
  }
}

/**
 * Get current gas prices
 */
export async function getGasPrice(chainId) {
  const provider = getProvider(chainId);
  const feeData = await provider.getFeeData();
  const effectivePrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const gwei = ethers.formatUnits(effectivePrice, 'gwei');
  
  return {
    standard: parseFloat(gwei),
    slow: parseFloat(gwei) * 0.8,
    fast: parseFloat(gwei) * 1.3,
    instant: parseFloat(gwei) * 1.8,
  };
}

// ═══════════════════════════════════════════════════════
//  Speed-Up / Cancel Pending Transactions
// ═══════════════════════════════════════════════════════

/**
 * Speed up a pending transaction by re-submitting with same nonce + higher gas
 */
export async function speedUpTransaction(chainId, privateKey, originalTx) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const feeData = await provider.getFeeData();
  
  const txParams = {
    to: originalTx.to,
    value: ethers.parseEther(originalTx.value?.toString() || '0'),
    data: originalTx.data || '0x',
    nonce: originalTx.nonce,
  };

  // 30% gas bump (EIP-1559 requires at least 10% bump to replace)
  if (feeData.maxFeePerGas) {
    txParams.maxFeePerGas = feeData.maxFeePerGas * 150n / 100n;
    txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 150n / 100n;
  } else {
    txParams.gasPrice = feeData.gasPrice * 150n / 100n;
  }

  const tx = await wallet.sendTransaction(txParams);
  return { hash: tx.hash, nonce: tx.nonce, status: 'pending' };
}

/**
 * Cancel a pending transaction by sending 0 value to self with same nonce
 */
export async function cancelTransaction(chainId, privateKey, nonce) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const feeData = await provider.getFeeData();
  
  const txParams = {
    to: wallet.address,
    value: 0n,
    nonce: nonce,
  };

  // Use 50% higher gas to ensure replacement
  if (feeData.maxFeePerGas) {
    txParams.maxFeePerGas = feeData.maxFeePerGas * 200n / 100n;
    txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 200n / 100n;
  } else {
    txParams.gasPrice = feeData.gasPrice * 200n / 100n;
  }

  const tx = await wallet.sendTransaction(txParams);
  return { hash: tx.hash, nonce: tx.nonce, status: 'cancelling' };
}

/**
 * Send native with custom gas parameters
 */
export async function sendNativeCustomGas(chainId, privateKey, to, amount, gasParams) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);

  const txParams = {
    to,
    value: ethers.parseEther(amount.toString()),
  };

  if (gasParams.maxFeePerGas) {
    txParams.maxFeePerGas = ethers.parseUnits(gasParams.maxFeePerGas.toString(), 'gwei');
    txParams.maxPriorityFeePerGas = ethers.parseUnits(
      (gasParams.maxPriorityFeePerGas || gasParams.maxFeePerGas * 0.1).toString(), 'gwei'
    );
  } else if (gasParams.gasPrice) {
    txParams.gasPrice = ethers.parseUnits(gasParams.gasPrice.toString(), 'gwei');
  }

  if (gasParams.gasLimit) {
    txParams.gasLimit = BigInt(gasParams.gasLimit);
  }

  const tx = await wallet.sendTransaction(txParams);
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: amount,
    chainId,
    nonce: tx.nonce,
    timestamp: Date.now(),
    status: 'pending',
  };
}

// ═══════════════════════════════════════════════════════
//  Token Approvals Management
// ═══════════════════════════════════════════════════════

const APPROVAL_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

/**
 * Get all token approvals for known DEX routers
 */
export async function getTokenApprovals(chainId, walletAddress, tokenAddresses) {
  const provider = getProvider(chainId);
  const chain = CHAINS[chainId];
  if (!chain) return [];

  // Common spenders to check: DEX routers, bridge contracts
  const KNOWN_SPENDERS = {
    [chain.dexRouter]: chain.dexName || 'DEX Router',
    ...(chain.wrappedNative ? {} : {}),
  };

  const approvals = [];

  for (const tokenAddr of tokenAddresses) {
    const contract = new ethers.Contract(tokenAddr, [...ERC20_ABI, ...APPROVAL_ABI], provider);
    
    for (const [spender, label] of Object.entries(KNOWN_SPENDERS)) {
      if (!spender) continue;
      try {
        const allowance = await contract.allowance(walletAddress, spender);
        if (allowance > 0n) {
          const decimals = await contract.decimals().catch(() => 18);
          const symbol = await contract.symbol().catch(() => '???');
          const isUnlimited = allowance >= ethers.MaxUint256 / 2n;

          approvals.push({
            tokenAddress: tokenAddr,
            tokenSymbol: symbol,
            spender,
            spenderLabel: label,
            allowance: isUnlimited ? 'Unlimited' : ethers.formatUnits(allowance, decimals),
            allowanceRaw: allowance.toString(),
            isUnlimited,
          });
        }
      } catch { /* skip errors */ }
    }
  }

  return approvals;
}

/**
 * Revoke a token approval (set allowance to 0)
 */
export async function revokeApproval(chainId, privateKey, tokenAddress, spenderAddress) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(tokenAddress, APPROVAL_ABI, wallet);

  const tx = await contract.approve(spenderAddress, 0n);
  await tx.wait();

  return { hash: tx.hash, status: 'revoked' };
}

/**
 * Approve with a specific spending cap (not unlimited)
 */
export async function approveWithCap(chainId, privateKey, tokenAddress, spenderAddress, amount, decimals = 18) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(tokenAddress, APPROVAL_ABI, wallet);

  const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
  const tx = await contract.approve(spenderAddress, parsedAmount);
  await tx.wait();

  return { hash: tx.hash, status: 'approved', amount };
}

// ═══════════════════════════════════════════════════════
//  ENS Resolution
// ═══════════════════════════════════════════════════════

/**
 * Resolve ENS name to address (works on Ethereum mainnet)
 */
export async function resolveENS(name) {
  try {
    // ENS resolution requires Ethereum mainnet provider
    const ethProvider = getProvider(1);
    const address = await ethProvider.resolveName(name);
    return address;
  } catch {
    return null;
  }
}

/**
 * Reverse resolve address to ENS name
 */
export async function lookupENS(address) {
  try {
    const ethProvider = getProvider(1);
    const name = await ethProvider.lookupAddress(address);
    return name;
  } catch {
    return null;
  }
}
