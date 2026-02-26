// Kairos Extension — Blockchain Service
// Provider cache, balance queries, token balances, transaction sending

import { ethers } from 'ethers';
import { CHAINS, ERC20_ABI } from '../constants/chains';

// ── Provider Cache ──
const providerCache = {};

/**
 * Get or create a cached JSON-RPC provider for a chain
 * @param {number} chainId
 * @returns {ethers.JsonRpcProvider}
 */
export function getProvider(chainId) {
  if (providerCache[chainId]) return providerCache[chainId];
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  providerCache[chainId] = new ethers.JsonRpcProvider(chain.rpcUrl, {
    chainId: chain.id,
    name: chain.shortName,
  });
  return providerCache[chainId];
}

/**
 * Get native coin balance
 * @param {number} chainId
 * @param {string} address
 * @returns {Promise<string>} Formatted balance string
 */
export async function getNativeBalance(chainId, address) {
  const provider = getProvider(chainId);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Get ERC-20 token balance
 * @param {number} chainId
 * @param {string} tokenAddress
 * @param {string} walletAddress
 * @returns {Promise<{ balance: string, symbol: string, decimals: number, name: string }>}
 */
export async function getTokenBalance(chainId, tokenAddress, walletAddress) {
  const provider = getProvider(chainId);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  const [balance, symbol, decimals, name] = await Promise.all([
    token.balanceOf(walletAddress),
    token.symbol(),
    token.decimals(),
    token.name(),
  ]);

  return {
    balance: ethers.formatUnits(balance, decimals),
    rawBalance: balance.toString(),
    symbol,
    decimals: Number(decimals),
    name,
  };
}

/**
 * Get KAIROS token balance for a chain
 * @param {number} chainId
 * @param {string} walletAddress
 * @returns {Promise<string|null>} Balance or null if not deployed on chain
 */
export async function getKairosBalance(chainId, walletAddress) {
  const chain = CHAINS[chainId];
  if (!chain?.kairos) return null;

  try {
    const result = await getTokenBalance(chainId, chain.kairos, walletAddress);
    return result.balance;
  } catch {
    return '0';
  }
}

/**
 * Get all balances: native + KAIROS
 * @param {number} chainId
 * @param {string} address
 * @returns {Promise<{ native: string, kairos: string|null, nativeSymbol: string }>}
 */
export async function getAllBalances(chainId, address) {
  const chain = CHAINS[chainId];
  const [native, kairos] = await Promise.all([
    getNativeBalance(chainId, address),
    getKairosBalance(chainId, address),
  ]);
  return {
    native,
    kairos,
    nativeSymbol: chain.symbol,
  };
}

/**
 * Send native currency
 * @param {number} chainId
 * @param {string} privateKey
 * @param {string} to
 * @param {string} amount - In ether units
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function sendNative(chainId, privateKey, to, amount) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);

  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseEther(amount),
  });

  return tx;
}

/**
 * Send ERC-20 token
 * @param {number} chainId
 * @param {string} privateKey
 * @param {string} tokenAddress
 * @param {string} to
 * @param {string} amount - In token units (e.g., "100.5")
 * @param {number} decimals
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function sendToken(chainId, privateKey, tokenAddress, to, amount, decimals = 18) {
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  const tx = await token.transfer(to, ethers.parseUnits(amount, decimals));
  return tx;
}

/**
 * Get estimated gas cost for a transfer
 * @param {number} chainId
 * @param {string} to
 * @param {string} amount
 * @returns {Promise<string>} Gas cost in native coin units
 */
export async function estimateGas(chainId, to, amount) {
  const provider = getProvider(chainId);
  const gasPrice = await provider.getFeeData();
  const gasLimit = 21000n; // Standard ETH transfer

  const cost = gasLimit * (gasPrice.gasPrice || 0n);
  return ethers.formatEther(cost);
}

/**
 * Get transaction history from explorer API
 * @param {number} chainId
 * @param {string} address
 * @returns {Promise<Array>}
 */
export async function getTransactionHistory(chainId, address) {
  const chain = CHAINS[chainId];
  if (!chain.explorerApi) return [];

  try {
    const url = `${chain.explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1') return [];

    return data.result.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      timestamp: Number(tx.timeStamp) * 1000,
      isIncoming: tx.to?.toLowerCase() === address.toLowerCase(),
      status: tx.txreceipt_status === '1' ? 'success' : 'failed',
      gasUsed: tx.gasUsed,
    }));
  } catch {
    return [];
  }
}
