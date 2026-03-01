// Kairos Trade — Wallet/DEX Broker Service (Resilient v2.0)
// Ultra-reliable DEX execution: Multi-aggregator + Retry + Circuit Breaker + Timeout
// Zero-downtime design: if ALL aggregators fail → direct DEX router fallback
// Uses ethers.js for blockchain interaction

import { devLog, devWarn } from '../utils/devLog';

// ═══════════════════════════════════════════════════════════
//  MULTI-AGGREGATOR CONFIG — Redundant price sources
// ═══════════════════════════════════════════════════════════

// Primary: 0x Protocol (100+ DEXes per chain)
const AGGREGATOR_0X = {
  name: '0x',
  endpoints: {
    56:    'https://bsc.api.0x.org',
    1:     'https://api.0x.org',
    137:   'https://polygon.api.0x.org',
    42161: 'https://arbitrum.api.0x.org',
    8453:  'https://base.api.0x.org',
  },
};

// Secondary: 1inch API (fallback aggregator)
const AGGREGATOR_1INCH = {
  name: '1inch',
  endpoints: {
    56:    'https://api.1inch.dev/swap/v6.0/56',
    1:     'https://api.1inch.dev/swap/v6.0/1',
    137:   'https://api.1inch.dev/swap/v6.0/137',
    42161: 'https://api.1inch.dev/swap/v6.0/42161',
    8453:  'https://api.1inch.dev/swap/v6.0/8453',
  },
};

// Tertiary: Paraswap (second fallback)
const AGGREGATOR_PARASWAP = {
  name: 'Paraswap',
  endpoints: {
    56:    'https://apiv5.paraswap.io',
    1:     'https://apiv5.paraswap.io',
    137:   'https://apiv5.paraswap.io',
    42161: 'https://apiv5.paraswap.io',
    8453:  'https://apiv5.paraswap.io',
  },
};

// Legacy flat map (backwards compatibility)
const AGGREGATOR_ENDPOINTS = AGGREGATOR_0X.endpoints;

// Kairos fee recipient (treasury)
const KAIROS_FEE_RECIPIENT = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
const KAIROS_FEE_BPS = 15; // 0.15%

// ═══════════════════════════════════════════════════════════
//  RESILIENCE CONFIG
// ═══════════════════════════════════════════════════════════
const RESILIENCE = {
  QUOTE_TIMEOUT_MS: 8000,       // Max 8s per aggregator quote
  EXECUTE_TIMEOUT_MS: 60000,    // Max 60s for TX confirmation
  MAX_RETRIES: 2,               // Retry failed quotes up to 2x
  RETRY_DELAY_MS: 500,          // Wait 500ms between retries
  QUOTE_MAX_AGE_MS: 15000,      // Re-quote if older than 15s
  CIRCUIT_BREAKER_THRESHOLD: 3, // Mark aggregator "down" after 3 consecutive fails
  CIRCUIT_BREAKER_RESET_MS: 120000, // Reset circuit after 2 min
  GAS_MULTIPLIER: 1.5,          // 50% gas buffer (up from 30%)
  PARALLEL_QUOTES: true,        // Query multiple aggregators simultaneously
};

// Circuit breaker state per aggregator
const _circuitState = {
  '0x':       { failures: 0, lastFail: 0, open: false },
  '1inch':    { failures: 0, lastFail: 0, open: false },
  'Paraswap': { failures: 0, lastFail: 0, open: false },
};

function _recordSuccess(aggName) {
  if (_circuitState[aggName]) {
    _circuitState[aggName].failures = 0;
    _circuitState[aggName].open = false;
  }
}

function _recordFailure(aggName) {
  const state = _circuitState[aggName];
  if (!state) return;
  state.failures++;
  state.lastFail = Date.now();
  if (state.failures >= RESILIENCE.CIRCUIT_BREAKER_THRESHOLD) {
    state.open = true;
    devWarn(`[CIRCUIT-BREAKER] ${aggName} marked DOWN (${state.failures} consecutive failures)`);
  }
}

function _isCircuitOpen(aggName) {
  const state = _circuitState[aggName];
  if (!state || !state.open) return false;
  // Auto-reset after cooldown
  if (Date.now() - state.lastFail > RESILIENCE.CIRCUIT_BREAKER_RESET_MS) {
    state.open = false;
    state.failures = 0;
    devLog(`[CIRCUIT-BREAKER] ${aggName} circuit RESET (cooldown elapsed)`);
    return false;
  }
  return true;
}

// Timeout helper
function _fetchWithTimeout(url, options, timeoutMs) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Retry helper
async function _withRetry(fn, maxRetries, delayMs, label) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        devWarn(`[RETRY] ${label} attempt ${attempt + 1}/${maxRetries} failed: ${err.message}. Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

// Execution mode: 'aggregator' (best price) or 'direct' (single DEX fallback)
let EXECUTION_MODE = 'aggregator';

const CHAIN_CONFIG = {
  56: {
    name: 'BSC',
    rpc: ['https://bsc-dataseed1.binance.org', 'https://bsc-dataseed2.binance.org', 'https://bsc-dataseed3.binance.org'],
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    wrapped: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    dexName: 'PancakeSwap',
    explorer: 'https://bscscan.com',
    nativeSymbol: 'BNB',
  },
  1: {
    name: 'Ethereum',
    rpc: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    wrapped: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    dexName: 'Uniswap',
    explorer: 'https://etherscan.io',
    nativeSymbol: 'ETH',
  },
  137: {
    name: 'Polygon',
    rpc: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    wrapped: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    dexName: 'QuickSwap',
    explorer: 'https://polygonscan.com',
    nativeSymbol: 'MATIC',
  },
  42161: {
    name: 'Arbitrum',
    rpc: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    wrapped: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    dexName: 'SushiSwap',
    explorer: 'https://arbiscan.io',
    nativeSymbol: 'ETH',
  },
  43114: {
    name: 'Avalanche',
    rpc: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe
    factory: '0x9Ad6C38BE94206cA50bb0d90783181834C6AbB96',
    wrapped: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    dexName: 'Trader Joe',
    explorer: 'https://snowtrace.io',
    nativeSymbol: 'AVAX',
  },
  8453: {
    name: 'Base',
    rpc: ['https://mainnet.base.org', 'https://rpc.ankr.com/base'],
    router: '0x327Df1E6de05895d2ab08513aaDD9313fE505d86', // BaseSwap
    factory: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB',
    wrapped: '0x4200000000000000000000000000000000000006', // WETH
    dexName: 'BaseSwap',
    explorer: 'https://basescan.org',
    nativeSymbol: 'ETH',
  },
};

// Common token addresses by chain
const TOKEN_ADDRESSES = {
  56: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    BTC: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',  // BTCB
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    KAIROS: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',  // WBNB
  },
  1: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  137: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    KAIROS: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  42161: {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    KAIROS: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  43114: {
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  },
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    WETH: '0x4200000000000000000000000000000000000006',
    KAIROS: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  },
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
  'function WETH() view returns (address)',
];

// Dynamic ethers import
let ethersLib = null;
async function getEthers() {
  if (ethersLib) return ethersLib;
  try {
    ethersLib = await import('ethers');
    return ethersLib;
  } catch {
    // Fallback: Load from CDN
    if (window.ethers) {
      ethersLib = window.ethers;
      return ethersLib;
    }
    throw new Error('ethers.js not available. Install with: npm install ethers');
  }
}

class WalletBrokerService {
  constructor() {
    this.providers = {};
    this.wallets = {};
    this.executionMode = EXECUTION_MODE;
  }

  // ═══════════════════════════════════════════════════════════
  //  EXECUTION MODE CONTROL
  // ═══════════════════════════════════════════════════════════

  setExecutionMode(mode) {
    if (!['aggregator', 'direct'].includes(mode)) throw new Error('Invalid mode. Use "aggregator" or "direct"');
    this.executionMode = mode;
    EXECUTION_MODE = mode;
    devLog(`[BROKER] Execution mode → ${mode === 'aggregator' ? '🔄 Aggregator (100+ DEXes)' : '📍 Direct (single DEX)'}`);
  }

  getExecutionMode() {
    return this.executionMode;
  }

  // ═══════════════════════════════════════════════════════════
  //  MULTI-AGGREGATOR: Get best quote from ALL available sources
  // ═══════════════════════════════════════════════════════════

  async _getAggregatorQuote(chainId, tokenIn, tokenOut, amountInWei) {
    // Try aggregators in priority order, skip circuit-broken ones
    const aggregators = [
      { ...AGGREGATOR_0X, method: '_quote0x' },
      { ...AGGREGATOR_1INCH, method: '_quote1inch' },
      { ...AGGREGATOR_PARASWAP, method: '_quoteParaswap' },
    ];

    if (RESILIENCE.PARALLEL_QUOTES) {
      // Race all available aggregators in parallel — fastest wins
      const available = aggregators.filter(a => !_isCircuitOpen(a.name) && a.endpoints[chainId]);
      if (available.length === 0) {
        devWarn('[AGGREGATOR] All aggregators circuit-broken, will try direct DEX');
        return null;
      }

      const results = await Promise.allSettled(
        available.map(agg =>
          _withRetry(
            () => this[agg.method](chainId, tokenIn, tokenOut, amountInWei),
            RESILIENCE.MAX_RETRIES,
            RESILIENCE.RETRY_DELAY_MS,
            agg.name
          ).then(quote => {
            if (quote) {
              _recordSuccess(agg.name);
              return { ...quote, aggregator: agg.name };
            }
            throw new Error('Empty quote');
          }).catch(err => {
            _recordFailure(agg.name);
            throw err;
          })
        )
      );

      // Pick the best quote (highest buyAmount = best price for the user)
      const validQuotes = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => {
          const aBuy = BigInt(a.buyAmount || '0');
          const bBuy = BigInt(b.buyAmount || '0');
          return bBuy > aBuy ? 1 : bBuy < aBuy ? -1 : 0;
        });

      if (validQuotes.length > 0) {
        const best = validQuotes[0];
        devLog(`[AGGREGATOR] Best quote from ${best.aggregator} (${validQuotes.length} sources responded)`);
        if (validQuotes.length > 1) {
          devLog(`[AGGREGATOR] Compared: ${validQuotes.map(q => `${q.aggregator}=${q.buyAmount}`).join(' vs ')}`);
        }
        return best;
      }

      devWarn('[AGGREGATOR] All parallel quotes failed');
      return null;
    }

    // Sequential mode (fallback) — try each aggregator one by one
    for (const agg of aggregators) {
      if (_isCircuitOpen(agg.name)) continue;
      if (!agg.endpoints[chainId]) continue;

      try {
        const quote = await _withRetry(
          () => this[agg.method](chainId, tokenIn, tokenOut, amountInWei),
          RESILIENCE.MAX_RETRIES,
          RESILIENCE.RETRY_DELAY_MS,
          agg.name
        );
        if (quote) {
          _recordSuccess(agg.name);
          return { ...quote, aggregator: agg.name };
        }
      } catch (err) {
        _recordFailure(agg.name);
        devWarn(`[AGGREGATOR] ${agg.name} failed: ${err.message}`);
      }
    }

    return null;
  }

  // ─── 0x Protocol Quote ───
  async _quote0x(chainId, tokenIn, tokenOut, amountInWei) {
    const endpoint = AGGREGATOR_0X.endpoints[chainId];
    if (!endpoint) return null;

    const params = new URLSearchParams({
      sellToken: tokenIn,
      buyToken: tokenOut,
      sellAmount: amountInWei.toString(),
      slippagePercentage: '0.005',
      feeRecipient: KAIROS_FEE_RECIPIENT,
      buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
      enableSlippageProtection: 'true',
    });

    const response = await _fetchWithTimeout(
      `${endpoint}/swap/v1/quote?${params}`,
      { headers: { '0x-api-key': '' } },
      RESILIENCE.QUOTE_TIMEOUT_MS
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`0x quote failed (${response.status}): ${error?.reason || 'Unknown'}`);
    }

    const data = await response.json();
    const sources = (data.sources || [])
      .filter(s => parseFloat(s.proportion) > 0)
      .map(s => ({ name: s.name, pct: Math.round(parseFloat(s.proportion) * 100) }))
      .sort((a, b) => b.pct - a.pct);

    return {
      buyAmount: data.buyAmount,
      to: data.to,
      data: data.data,
      value: data.value || '0',
      gasEstimate: data.estimatedGas,
      allowanceTarget: data.allowanceTarget,
      sources,
      sourceSummary: sources.map(s => `${s.name} ${s.pct}%`).join(' + ') || 'Direct',
      price: data.price,
      guaranteedPrice: data.guaranteedPrice,
      quotedAt: Date.now(),
    };
  }

  // ─── 1inch Quote (fallback aggregator) ───
  async _quote1inch(chainId, tokenIn, tokenOut, amountInWei) {
    const endpoint = AGGREGATOR_1INCH.endpoints[chainId];
    if (!endpoint) return null;

    const params = new URLSearchParams({
      src: tokenIn,
      dst: tokenOut,
      amount: amountInWei.toString(),
      from: KAIROS_FEE_RECIPIENT, // placeholder — will be overridden on execution
      slippage: '0.5',
      fee: (KAIROS_FEE_BPS / 100).toString(), // 1inch uses % not bps
      referrerAddress: KAIROS_FEE_RECIPIENT,
      disableEstimate: 'true',
    });

    const response = await _fetchWithTimeout(
      `${endpoint}/swap?${params}`,
      { headers: { 'accept': 'application/json' } },
      RESILIENCE.QUOTE_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`1inch quote failed (${response.status})`);
    }

    const data = await response.json();

    return {
      buyAmount: data.dstAmount || data.toAmount || '0',
      to: data.tx?.to || data.to,
      data: data.tx?.data || data.data,
      value: data.tx?.value || '0',
      gasEstimate: data.tx?.gas || data.estimatedGas || '300000',
      allowanceTarget: data.tx?.to || data.to,
      sources: [{ name: '1inch Router', pct: 100 }],
      sourceSummary: '1inch Aggregation',
      price: null,
      guaranteedPrice: null,
      quotedAt: Date.now(),
    };
  }

  // ─── Paraswap Quote (second fallback) ───
  async _quoteParaswap(chainId, tokenIn, tokenOut, amountInWei) {
    const endpoint = AGGREGATOR_PARASWAP.endpoints[chainId];
    if (!endpoint) return null;

    // Step 1: Get price route
    const priceParams = new URLSearchParams({
      srcToken: tokenIn,
      destToken: tokenOut,
      amount: amountInWei.toString(),
      srcDecimals: '18',
      destDecimals: '18',
      side: 'SELL',
      network: chainId.toString(),
      partner: 'kairos',
      version: '6.2',
    });

    const priceResp = await _fetchWithTimeout(
      `${endpoint}/prices?${priceParams}`,
      { headers: { 'accept': 'application/json' } },
      RESILIENCE.QUOTE_TIMEOUT_MS
    );

    if (!priceResp.ok) {
      throw new Error(`Paraswap price failed (${priceResp.status})`);
    }

    const priceData = await priceResp.json();
    const bestRoute = priceData.priceRoute;
    if (!bestRoute) throw new Error('Paraswap: no route found');

    return {
      buyAmount: bestRoute.destAmount || '0',
      to: null, // Paraswap requires a separate /transactions call to get calldata
      data: null,
      value: '0',
      gasEstimate: bestRoute.gasCost || '300000',
      allowanceTarget: bestRoute.tokenTransferProxy,
      sources: [{ name: 'Paraswap', pct: 100 }],
      sourceSummary: `Paraswap (${bestRoute.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.map(e => e.exchange).join('+') || 'multi'})`,
      price: null,
      guaranteedPrice: null,
      priceRoute: bestRoute, // Needed for building TX later
      quotedAt: Date.now(),
      needsTxBuild: true,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  RESILIENT EXECUTION: Execute Swap with re-quote protection
  // ═══════════════════════════════════════════════════════════

  async _executeAggregatorSwap(wallet, chainId, tokenIn, amountInWei, quote) {
    const ethers = await getEthers();
    const config = CHAIN_CONFIG[chainId];
    const isNativeIn = tokenIn.toLowerCase() === config.wrapped.toLowerCase();

    // Re-quote if quote is stale (>15s old)
    let activeQuote = quote;
    if (Date.now() - (quote.quotedAt || 0) > RESILIENCE.QUOTE_MAX_AGE_MS) {
      devLog('[AGGREGATOR] Quote is stale, refreshing...');
      const freshQuote = await this._getAggregatorQuote(chainId, tokenIn, quote._tokenOut || tokenIn, amountInWei);
      if (freshQuote && freshQuote.data) {
        activeQuote = freshQuote;
        devLog('[AGGREGATOR] Using fresh quote');
      } else {
        devWarn('[AGGREGATOR] Re-quote failed, proceeding with original');
      }
    }

    // Paraswap needs a separate TX-build step
    if (activeQuote.needsTxBuild && activeQuote.priceRoute) {
      try {
        const txResp = await _fetchWithTimeout(
          `${AGGREGATOR_PARASWAP.endpoints[chainId]}/transactions/${chainId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              srcToken: tokenIn,
              destToken: activeQuote._tokenOut,
              srcAmount: amountInWei.toString(),
              destAmount: activeQuote.buyAmount,
              priceRoute: activeQuote.priceRoute,
              userAddress: wallet.address,
              partner: 'kairos',
            }),
          },
          RESILIENCE.QUOTE_TIMEOUT_MS
        );
        if (txResp.ok) {
          const txData = await txResp.json();
          activeQuote.to = txData.to;
          activeQuote.data = txData.data;
          activeQuote.value = txData.value || '0';
          activeQuote.gasEstimate = txData.gas || activeQuote.gasEstimate;
        } else {
          throw new Error('Paraswap TX build failed');
        }
      } catch (err) {
        devWarn('[PARASWAP] TX build failed:', err.message);
        throw err; // Will trigger fallback to direct DEX
      }
    }

    if (!activeQuote.to || !activeQuote.data) {
      throw new Error('Quote has no execution data');
    }

    // Approve if ERC20
    if (!isNativeIn && activeQuote.allowanceTarget) {
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, activeQuote.allowanceTarget);
      if (allowance < BigInt(amountInWei)) {
        devLog(`[AGGREGATOR] Approving token for ${activeQuote.sourceSummary}...`);
        const approveTx = await tokenContract.approve(activeQuote.allowanceTarget, ethers.MaxUint256);
        await approveTx.wait();
        devLog('[AGGREGATOR] Approval confirmed');
      }
    }

    // Execute aggregated swap with enhanced gas buffer
    const gasLimit = Math.ceil(Number(activeQuote.gasEstimate || 300000) * RESILIENCE.GAS_MULTIPLIER);
    const tx = await wallet.sendTransaction({
      to: activeQuote.to,
      data: activeQuote.data,
      value: activeQuote.value,
      gasLimit,
    });

    devLog(`[AGGREGATOR] Swap tx: ${tx.hash} via ${activeQuote.sourceSummary} (gas limit: ${gasLimit})`);
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error(`TX reverted on-chain: ${tx.hash}`);
    }

    return { tx, receipt, sources: activeQuote.sources, sourceSummary: activeQuote.sourceSummary, aggregator: activeQuote.aggregator };
  }

  // Get or create provider for chain
  async _getProvider(chainId) {
    if (this.providers[chainId]) return this.providers[chainId];
    const ethers = await getEthers();
    const config = CHAIN_CONFIG[chainId];
    if (!config) throw new Error(`Unsupported chain: ${chainId}`);

    // Try each RPC until one works
    for (const rpc of config.rpc) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc, chainId);
        await provider.getBlockNumber(); // Test connection
        this.providers[chainId] = provider;
        return provider;
      } catch {
        continue;
      }
    }
    throw new Error(`Could not connect to ${config.name} RPC`);
  }

  // Get wallet signer
  async _getWallet(privateKey, chainId) {
    const key = `${chainId}-${privateKey.slice(-6)}`;
    if (this.wallets[key]) return this.wallets[key];
    const ethers = await getEthers();
    const provider = await this._getProvider(chainId);
    const wallet = new ethers.Wallet(privateKey, provider);
    this.wallets[key] = wallet;
    return wallet;
  }

  // Resolve token symbol to address
  _resolveToken(symbolOrAddress, chainId) {
    if (symbolOrAddress?.startsWith('0x') && symbolOrAddress.length === 42) return symbolOrAddress;
    const tokens = TOKEN_ADDRESSES[chainId] || {};
    const upper = (symbolOrAddress || '').toUpperCase();
    // Handle KAIROS pairs like BTCKAIROS → map to BTC
    const cleaned = upper.replace('KAIROS', '').replace('USDT', '').replace('USDC', '');
    return tokens[upper] || tokens[cleaned] || null;
  }

  // ─── CONNECT ───
  async connect(walletAddress, privateKey, chainId = 56) {
    try {
      const ethers = await getEthers();
      const config = CHAIN_CONFIG[chainId];
      if (!config) return { success: false, message: `Red no soportada: ${chainId}` };

      // Validate address
      if (!ethers.isAddress(walletAddress)) {
        return { success: false, message: 'Dirección de wallet inválida' };
      }

      // Validate private key by deriving address
      try {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
          return { success: false, message: 'La clave privada no corresponde a la dirección' };
        }
      } catch {
        return { success: false, message: 'Clave privada inválida' };
      }

      // Test RPC connection + get balance
      const provider = await this._getProvider(chainId);
      const balance = await provider.getBalance(walletAddress);
      const nativeBalance = ethers.formatEther(balance);

      return {
        success: true,
        message: `Conectado a ${config.name} via ${this.executionMode === 'aggregator' ? 'Kairos Exchange (100+ DEXes)' : config.dexName} (${parseFloat(nativeBalance).toFixed(4)} ${config.nativeSymbol})`,
        chain: config.name,
        dex: this.executionMode === 'aggregator' ? 'Kairos Exchange' : config.dexName,
        executionMode: this.executionMode,
        nativeBalance,
      };
    } catch (err) {
      return { success: false, message: `Error: ${err.message}` };
    }
  }

  // ─── GET BALANCES ───
  async getBalances(walletAddress, chainId = 56) {
    const ethers = await getEthers();
    const provider = await this._getProvider(chainId);
    const config = CHAIN_CONFIG[chainId];
    const tokens = TOKEN_ADDRESSES[chainId] || {};
    const balances = [];

    // Native balance
    try {
      const balance = await provider.getBalance(walletAddress);
      const formatted = ethers.formatEther(balance);
      if (parseFloat(formatted) > 0) {
        balances.push({
          asset: config.nativeSymbol,
          free: formatted,
          locked: '0',
          total: formatted,
          native: true,
        });
      }
    } catch (err) {
      devWarn('Native balance error:', err.message);
    }

    // ERC20 token balances
    for (const [symbol, address] of Object.entries(tokens)) {
      if (address.toLowerCase() === config.wrapped.toLowerCase()) continue; // Skip wrapped native (already shown)
      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
        ]);
        const formatted = ethers.formatUnits(balance, decimals);
        if (parseFloat(formatted) > 0.000001) {
          balances.push({
            asset: symbol,
            free: formatted,
            locked: '0',
            total: formatted,
          });
        }
      } catch (err) {
        devWarn(`Token ${symbol} balance error:`, err.message);
      }
    }

    return balances;
  }

  // ─── GET QUOTE ───
  // Aggregator-first: gets best price across 100+ DEXes, falls back to single DEX
  async getQuote(chainId, tokenIn, tokenOut, amountIn) {
    const ethers = await getEthers();
    const provider = await this._getProvider(chainId);
    const config = CHAIN_CONFIG[chainId];

    const tokenInAddr = this._resolveToken(tokenIn, chainId);
    const tokenOutAddr = this._resolveToken(tokenOut, chainId);
    if (!tokenInAddr || !tokenOutAddr) throw new Error(`Token not found: ${tokenIn} or ${tokenOut}`);

    // Get token decimals
    let decimalsIn = 18;
    if (tokenInAddr.toLowerCase() !== config.wrapped.toLowerCase()) {
      const tokenContract = new ethers.Contract(tokenInAddr, ERC20_ABI, provider);
      decimalsIn = await tokenContract.decimals();
    }
    let decimalsOut = 18;
    if (tokenOutAddr.toLowerCase() !== config.wrapped.toLowerCase()) {
      const outContract = new ethers.Contract(tokenOutAddr, ERC20_ABI, provider);
      decimalsOut = await outContract.decimals();
    }
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimalsIn);

    // ── STRATEGY 1: Aggregator (100+ DEXes via 0x) ──
    if (this.executionMode === 'aggregator') {
      try {
        const aggQuote = await this._getAggregatorQuote(chainId, tokenInAddr, tokenOutAddr, amountInWei);
        if (aggQuote) {
          aggQuote._tokenOut = tokenOutAddr; // Store for potential re-quote
          const formattedOut = ethers.formatUnits(aggQuote.buyAmount, decimalsOut);
          const effectivePrice = parseFloat(formattedOut) / parseFloat(amountIn);
          devLog(`[QUOTE] Aggregator → ${formattedOut} via ${aggQuote.sourceSummary}`);

          // Also get direct DEX quote for comparison (non-blocking)
          let directQuote = null;
          try { directQuote = await this._getDirectQuote(chainId, tokenInAddr, tokenOutAddr, amountInWei, decimalsOut, config); } catch {}
          const savings = directQuote
            ? ((parseFloat(formattedOut) - directQuote.amountOutNum) / directQuote.amountOutNum * 100).toFixed(2)
            : null;

          return {
            amountIn: amountIn.toString(),
            amountOut: formattedOut,
            effectivePrice,
            dex: 'Kairos Exchange',
            mode: 'aggregator',
            sources: aggQuote.sources,
            sourceSummary: aggQuote.sourceSummary,
            priceImpact: 'optimized',
            savingsVsDirect: savings ? `${savings > 0 ? '+' : ''}${savings}%` : null,
            directDex: directQuote?.dex || null,
            _aggQuoteData: aggQuote, // Internal: used by placeOrder
          };
        }
      } catch (err) {
        devWarn('[QUOTE] Aggregator failed, falling back to direct DEX:', err.message);
      }
    }

    // ── STRATEGY 2: Direct DEX (single router, fallback) ──
    const directResult = await this._getDirectQuote(chainId, tokenInAddr, tokenOutAddr, amountInWei, decimalsOut, config);
    return {
      amountIn: amountIn.toString(),
      amountOut: directResult.formattedOut,
      effectivePrice: directResult.effectivePrice,
      path: directResult.path,
      dex: config.dexName,
      mode: 'direct',
      sources: [{ name: config.dexName, pct: 100 }],
      sourceSummary: config.dexName,
      priceImpact: directResult.path.length > 2 ? 'multi-hop' : 'direct',
      savingsVsDirect: null,
    };
  }

  // ── Internal: Direct DEX quote via single router ──
  async _getDirectQuote(chainId, tokenInAddr, tokenOutAddr, amountInWei, decimalsOut, config) {
    const ethers = await getEthers();
    const provider = await this._getProvider(chainId);
    const router = new ethers.Contract(config.router, ROUTER_ABI, provider);

    const paths = [
      [tokenInAddr, tokenOutAddr],
      [tokenInAddr, config.wrapped, tokenOutAddr],
    ];

    for (const path of paths) {
      try {
        const amounts = await router.getAmountsOut(amountInWei, path);
        const amountOut = amounts[amounts.length - 1];
        const formattedOut = ethers.formatUnits(amountOut, decimalsOut);
        const amountOutNum = parseFloat(formattedOut);
        const effectivePrice = amountOutNum / parseFloat(ethers.formatUnits(amountInWei, 18));

        return { formattedOut, effectivePrice, amountOutNum, path, dex: config.dexName };
      } catch {
        continue;
      }
    }
    throw new Error(`No liquidity found on ${config.dexName}`);
  }

  // ─── PLACE ORDER (DEX SWAP) ───
  // Aggregator-first: routes through best DEXes, falls back to single router
  async placeOrder(privateKey, chainId, order) {
    const ethers = await getEthers();
    const config = CHAIN_CONFIG[chainId];
    if (!config) throw new Error(`Unsupported chain: ${chainId}`);

    const { symbol, side, quantity, price } = order;

    // Parse trading pair: BTCUSDT → buy BTC with USDT (buy side) or sell BTC for USDT (sell side)
    let baseToken, quoteToken;
    const pairMatch = symbol.match(/^([A-Z]+)(USDT|USDC|BUSD|KAIROS|BNB|ETH|WETH|WBNB|MATIC|AVAX)$/i);
    if (pairMatch) {
      baseToken = pairMatch[1].toUpperCase();
      quoteToken = pairMatch[2].toUpperCase();
      if (quoteToken === 'KAIROS') quoteToken = 'USDT';
    } else {
      throw new Error(`Invalid pair format: ${symbol}. Expected e.g. BTCUSDT`);
    }

    // Resolve addresses
    const baseAddr = this._resolveToken(baseToken, chainId);
    const quoteAddr = this._resolveToken(quoteToken, chainId);
    if (!baseAddr) throw new Error(`Token ${baseToken} not found on chain ${chainId}`);
    if (!quoteAddr) throw new Error(`Token ${quoteToken} not found on chain ${chainId}`);

    const wallet = await this._getWallet(privateKey, chainId);

    // Determine swap direction
    let tokenIn, tokenOut, amountInRaw;
    if (side.toLowerCase() === 'buy') {
      tokenIn = quoteAddr;
      tokenOut = baseAddr;
      amountInRaw = (parseFloat(quantity) * parseFloat(price || 1)).toString();
    } else {
      tokenIn = baseAddr;
      tokenOut = quoteAddr;
      amountInRaw = quantity.toString();
    }

    // Get decimals
    const isNativeIn = tokenIn.toLowerCase() === config.wrapped.toLowerCase();
    const isNativeOut = tokenOut.toLowerCase() === config.wrapped.toLowerCase();

    let decimalsIn = 18;
    if (!isNativeIn) {
      const inContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet.provider);
      decimalsIn = await inContract.decimals();
    }
    let decimalsOut = 18;
    if (!isNativeOut) {
      const outContract = new ethers.Contract(tokenOut, ERC20_ABI, wallet.provider);
      decimalsOut = await outContract.decimals();
    }

    const amountIn = ethers.parseUnits(amountInRaw, decimalsIn);

    // ── STRATEGY 1: Aggregator (100+ DEXes) ──
    if (this.executionMode === 'aggregator') {
      try {
        const aggQuote = await this._getAggregatorQuote(chainId, tokenIn, tokenOut, amountIn);
        if (aggQuote) {
          aggQuote._tokenOut = tokenOut; // Store for potential re-quote
          devLog(`[ORDER] Executing via ${aggQuote.aggregator || 'Aggregator'} → ${aggQuote.sourceSummary}`);
          const result = await this._executeAggregatorSwap(wallet, chainId, tokenIn, amountIn, aggQuote);
          const formattedOut = ethers.formatUnits(aggQuote.buyAmount, decimalsOut);

          return {
            success: true,
            txHash: result.tx.hash,
            symbol,
            side: side.toLowerCase(),
            amountIn: amountInRaw,
            amountOut: formattedOut,
            effectivePrice: side.toLowerCase() === 'buy'
              ? (parseFloat(amountInRaw) / parseFloat(formattedOut))
              : (parseFloat(formattedOut) / parseFloat(amountInRaw)),
            chain: config.name,
            dex: 'Kairos Exchange',
            mode: 'aggregator',
            aggregator: result.aggregator || aggQuote.aggregator || '0x',
            sources: result.sources,
            sourceSummary: result.sourceSummary,
            explorer: `${config.explorer}/tx/${result.tx.hash}`,
            gasUsed: result.receipt.gasUsed?.toString(),
            blockNumber: result.receipt.blockNumber,
          };
        }
      } catch (err) {
        devWarn('[ORDER] Aggregator execution failed, falling back to direct DEX:', err.message);
      }
    }

    // ── STRATEGY 2: Direct DEX (single router, fallback) ──
    devLog(`[ORDER] Executing via Direct → ${config.dexName}`);
    const router = new ethers.Contract(config.router, ROUTER_ABI, wallet);

    // Build path
    let path;
    try {
      await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
      path = [tokenIn, tokenOut];
    } catch {
      path = [tokenIn, config.wrapped, tokenOut];
      try {
        await router.getAmountsOut(amountIn, path);
      } catch {
        throw new Error(`No liquidity for ${baseToken}/${quoteToken} on ${config.dexName}`);
      }
    }

    // Get expected output
    const amounts = await router.getAmountsOut(amountIn, path);
    const expectedOut = amounts[amounts.length - 1];
    const slippage = 0.5;
    const minOut = expectedOut * BigInt(Math.floor((1 - slippage / 100) * 10000)) / 10000n;
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // Approve token if needed
    if (!isNativeIn) {
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, config.router);
      if (allowance < amountIn) {
        devLog(`[WALLET] Approving ${baseToken} for ${config.dexName}...`);
        const approveTx = await tokenContract.approve(config.router, ethers.MaxUint256);
        await approveTx.wait();
        devLog('[WALLET] Approval confirmed');
      }
    }

    // Execute swap
    let tx;
    if (isNativeIn) {
      tx = await router.swapExactETHForTokens(minOut, path, wallet.address, deadline, { value: amountIn });
    } else if (isNativeOut) {
      tx = await router.swapExactTokensForETH(amountIn, minOut, path, wallet.address, deadline);
    } else {
      try {
        tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn, minOut, path, wallet.address, deadline
        );
      } catch {
        tx = await router.swapExactTokensForTokens(amountIn, minOut, path, wallet.address, deadline);
      }
    }

    devLog(`[WALLET] Swap tx: ${tx.hash}`);
    const receipt = await tx.wait();

    const formattedOut = ethers.formatUnits(expectedOut, decimalsOut);
    const effectivePrice = parseFloat(formattedOut) / parseFloat(amountInRaw);

    return {
      success: true,
      txHash: tx.hash,
      symbol,
      side: side.toLowerCase(),
      amountIn: amountInRaw,
      amountOut: formattedOut,
      effectivePrice: side.toLowerCase() === 'buy' 
        ? (parseFloat(amountInRaw) / parseFloat(formattedOut))
        : effectivePrice,
      chain: config.name,
      dex: config.dexName,
      mode: 'direct',
      sources: [{ name: config.dexName, pct: 100 }],
      sourceSummary: config.dexName,
      explorer: `${config.explorer}/tx/${tx.hash}`,
      gasUsed: receipt.gasUsed?.toString(),
      blockNumber: receipt.blockNumber,
    };
  }

  // ─── CANCEL ORDER ───
  async cancelOrder() {
    return { success: false, message: 'DEX swaps are instant and cannot be cancelled' };
  }

  // ─── WALLETCONNECT: Send transaction via external wallet ───
  async sendViaWalletConnect(chainId, txParams) {
    try {
      const { sendTransaction } = await import('./walletConnectDApp');
      const txHash = await sendTransaction(chainId, txParams);
      const config = CHAIN_CONFIG[chainId];
      return {
        success: true,
        txHash,
        explorer: config ? `${config.explorer}/tx/${txHash}` : null,
        chain: config?.name || `Chain ${chainId}`,
        method: 'WalletConnect',
      };
    } catch (err) {
      return { success: false, message: `WalletConnect: ${err.message}` };
    }
  }

  // ─── WALLETCONNECT: Check if WC is available for signing ───
  async isWCAvailable() {
    try {
      const { isConnected } = await import('./walletConnectDApp');
      return isConnected();
    } catch {
      return false;
    }
  }

  // ─── WALLETCONNECT: Get connected account ───
  async getWCAccount() {
    try {
      const { getConnectedAccount } = await import('./walletConnectDApp');
      return getConnectedAccount();
    } catch {
      return null;
    }
  }

  // ─── DIAGNOSTICS: Get aggregator health status ───
  getAggregatorStatus() {
    return {
      mode: this.executionMode,
      aggregators: Object.entries(_circuitState).map(([name, state]) => ({
        name,
        status: state.open ? 'DOWN' : 'HEALTHY',
        consecutiveFailures: state.failures,
        lastFailure: state.lastFail ? new Date(state.lastFail).toISOString() : null,
        willResetAt: state.open ? new Date(state.lastFail + RESILIENCE.CIRCUIT_BREAKER_RESET_MS).toISOString() : null,
      })),
      config: { ...RESILIENCE },
    };
  }
}

export const walletBroker = new WalletBrokerService();
