// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Cross-Chain Bridge Service
//  Powered by LI.FI Protocol (aggregates 20+ bridges)
//  Supports: Stargate, Across, Hop, Celer, etc.
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { CHAINS } from '../constants/chains';

const LIFI_API = 'https://li.quest/v1';
const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Supported bridge chains (must have matching IDs in our CHAINS config)
export const BRIDGE_CHAINS = [56, 1, 137, 42161, 8453];

/**
 * Get available tokens for bridging on a specific chain
 */
export async function getBridgeTokens(chainId) {
  try {
    const res = await fetch(`${LIFI_API}/tokens?chains=${chainId}`);
    if (!res.ok) throw new Error('Failed to fetch tokens');
    const data = await res.json();
    return data.tokens?.[chainId] || [];
  } catch (err) {
    console.error('[Bridge] getBridgeTokens error:', err);
    // Return native token as fallback
    const chain = CHAINS[chainId];
    return [{
      address: NATIVE_TOKEN,
      symbol: chain?.nativeCurrency?.symbol || 'ETH',
      name: chain?.nativeCurrency?.name || 'Native',
      decimals: 18,
      chainId,
    }];
  }
}

/**
 * Get a bridge quote from LI.FI
 * @param {Object} params
 * @param {number} params.fromChainId - Source chain ID
 * @param {number} params.toChainId - Destination chain ID
 * @param {string} params.fromToken - Source token address (or NATIVE_TOKEN)
 * @param {string} params.toToken - Destination token address (or NATIVE_TOKEN)
 * @param {string} params.fromAmount - Amount in wei
 * @param {string} params.fromAddress - User's wallet address
 * @param {number} params.slippage - Slippage tolerance (0.01 = 1%)
 */
export async function getBridgeQuote({
  fromChainId,
  toChainId,
  fromToken = NATIVE_TOKEN,
  toToken = NATIVE_TOKEN,
  fromAmount,
  fromAddress,
  slippage = 0.03,
}) {
  const params = new URLSearchParams({
    fromChain: fromChainId.toString(),
    toChain: toChainId.toString(),
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
    toAddress: fromAddress,
    slippage: slippage.toString(),
  });

  const res = await fetch(`${LIFI_API}/quote?${params}`);
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Bridge quote failed: ${error}`);
  }

  const quote = await res.json();

  return {
    raw: quote,
    bridge: quote.tool || 'unknown',
    fromAmount: quote.estimate.fromAmount,
    toAmount: quote.estimate.toAmount,
    toAmountMin: quote.estimate.toAmountMin,
    gasCostUSD: quote.estimate.gasCosts?.reduce((sum, g) => sum + parseFloat(g.amountUSD || 0), 0).toFixed(2),
    feeCostUSD: quote.estimate.feeCosts?.reduce((sum, f) => sum + parseFloat(f.amountUSD || 0), 0).toFixed(2),
    executionDuration: quote.estimate.executionDuration || 60,
    transactionRequest: quote.transactionRequest,
  };
}

/**
 * Get multiple bridge routes for comparison
 */
export async function getBridgeRoutes({
  fromChainId,
  toChainId,
  fromToken = NATIVE_TOKEN,
  toToken = NATIVE_TOKEN,
  fromAmount,
  fromAddress,
}) {
  const params = {
    fromChainId,
    toChainId,
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    fromAmount,
    fromAddress,
    toAddress: fromAddress,
    options: {
      slippage: 0.03,
      order: 'RECOMMENDED',
      maxPriceImpact: 0.4,
    },
  };

  try {
    const res = await fetch(`${LIFI_API}/advanced/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) throw new Error('Routes request failed');
    const data = await res.json();
    
    return (data.routes || []).map(route => ({
      id: route.id,
      bridge: route.steps?.[0]?.tool || 'unknown',
      fromAmount: route.fromAmount,
      toAmount: route.toAmount,
      toAmountMin: route.toAmountMin,
      gasCostUSD: route.gasCostUSD,
      executionDuration: route.steps?.reduce((sum, s) => sum + (s.estimate?.executionDuration || 0), 0),
      tags: route.tags || [],
      steps: route.steps,
    }));
  } catch (err) {
    console.error('[Bridge] getRoutes error:', err);
    return [];
  }
}

/**
 * Execute a bridge transaction
 * @param {Object} quote - Quote from getBridgeQuote()
 * @param {ethers.Wallet} signer - Signed wallet
 * @returns {Object} Transaction receipt
 */
export async function executeBridge(quote, signer) {
  const txRequest = quote.transactionRequest;
  
  if (!txRequest) {
    throw new Error('No transaction request in quote');
  }

  const tx = await signer.sendTransaction({
    to: txRequest.to,
    data: txRequest.data,
    value: txRequest.value,
    gasLimit: txRequest.gasLimit || 500000,
    gasPrice: txRequest.gasPrice,
  });

  const receipt = await tx.wait();
  
  return {
    hash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status === 1 ? 'success' : 'failed',
  };
}

/**
 * Check bridge transaction status
 * @param {string} txHash - The source chain TX hash
 * @param {number} fromChainId - Source chain ID
 * @param {number} toChainId - Destination chain ID
 */
export async function getBridgeStatus(txHash, fromChainId, toChainId) {
  try {
    const params = new URLSearchParams({
      txHash,
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
    });

    const res = await fetch(`${LIFI_API}/status?${params}`);
    if (!res.ok) return { status: 'PENDING' };
    
    const data = await res.json();
    return {
      status: data.status || 'PENDING', // PENDING | DONE | FAILED
      substatus: data.substatus,
      receiving: data.receiving,
      sending: data.sending,
    };
  } catch {
    return { status: 'PENDING' };
  }
}

/**
 * Format bridge amount for display
 */
export function formatBridgeAmount(amountWei, decimals = 18) {
  const formatted = ethers.formatUnits(amountWei, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export { NATIVE_TOKEN };
