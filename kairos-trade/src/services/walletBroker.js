// Kairos Trade — Wallet/DEX Broker Service
// Enables on-chain trading via DEX Aggregator (100+ DEXes) or direct router
// Powered by Kairos Exchange aggregation engine
// Uses ethers.js for blockchain interaction

// ═══════════════════════════════════════════════════════════
//  AGGREGATOR CONFIG — 0x Protocol (100+ DEXes per chain)
// ═══════════════════════════════════════════════════════════
const AGGREGATOR_ENDPOINTS = {
  56:    'https://bsc.api.0x.org',
  1:     'https://api.0x.org',
  137:   'https://polygon.api.0x.org',
  42161: 'https://arbitrum.api.0x.org',
  8453:  'https://base.api.0x.org',
};

// Kairos fee recipient (treasury)
const KAIROS_FEE_RECIPIENT = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
const KAIROS_FEE_BPS = 15; // 0.15%

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
    console.log(`[BROKER] Execution mode → ${mode === 'aggregator' ? '🔄 Aggregator (100+ DEXes)' : '📍 Direct (single DEX)'}`);
  }

  getExecutionMode() {
    return this.executionMode;
  }

  // ═══════════════════════════════════════════════════════════
  //  AGGREGATOR: Get Quote from 0x (scans 100+ DEXes)
  // ═══════════════════════════════════════════════════════════

  async _getAggregatorQuote(chainId, tokenIn, tokenOut, amountInWei) {
    const endpoint = AGGREGATOR_ENDPOINTS[chainId];
    if (!endpoint) return null; // Fallback to direct if chain not supported

    const config = CHAIN_CONFIG[chainId];
    const params = new URLSearchParams({
      sellToken: tokenIn,
      buyToken: tokenOut,
      sellAmount: amountInWei.toString(),
      slippagePercentage: '0.005', // 0.5%
      feeRecipient: KAIROS_FEE_RECIPIENT,
      buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
      enableSlippageProtection: 'true',
    });

    try {
      const response = await fetch(`${endpoint}/swap/v1/quote?${params}`, {
        headers: { '0x-api-key': '' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.warn(`[AGGREGATOR] Quote failed (${response.status}):`, error?.reason || 'Unknown');
        return null;
      }

      const data = await response.json();

      // Parse sources (which DEXes are being used)
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
      };
    } catch (err) {
      console.warn('[AGGREGATOR] Error:', err.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  AGGREGATOR: Execute Swap via 0x quote
  // ═══════════════════════════════════════════════════════════

  async _executeAggregatorSwap(wallet, chainId, tokenIn, amountInWei, quote) {
    const ethers = await getEthers();
    const config = CHAIN_CONFIG[chainId];
    const isNativeIn = tokenIn.toLowerCase() === config.wrapped.toLowerCase();

    // Approve if ERC20
    if (!isNativeIn && quote.allowanceTarget) {
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, quote.allowanceTarget);
      if (allowance < BigInt(amountInWei)) {
        console.log(`[AGGREGATOR] Approving token for ${quote.sourceSummary}...`);
        const approveTx = await tokenContract.approve(quote.allowanceTarget, ethers.MaxUint256);
        await approveTx.wait();
        console.log('[AGGREGATOR] Approval confirmed');
      }
    }

    // Execute aggregated swap
    const tx = await wallet.sendTransaction({
      to: quote.to,
      data: quote.data,
      value: quote.value,
      gasLimit: Math.ceil(Number(quote.gasEstimate || 300000) * 1.3),
    });

    console.log(`[AGGREGATOR] Swap tx: ${tx.hash} via ${quote.sourceSummary}`);
    const receipt = await tx.wait();

    return { tx, receipt, sources: quote.sources, sourceSummary: quote.sourceSummary };
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
      console.warn('Native balance error:', err.message);
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
        console.warn(`Token ${symbol} balance error:`, err.message);
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
          const formattedOut = ethers.formatUnits(aggQuote.buyAmount, decimalsOut);
          const effectivePrice = parseFloat(formattedOut) / parseFloat(amountIn);
          console.log(`[QUOTE] Aggregator → ${formattedOut} via ${aggQuote.sourceSummary}`);

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
        console.warn('[QUOTE] Aggregator failed, falling back to direct DEX:', err.message);
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
          console.log(`[ORDER] Executing via Aggregator → ${aggQuote.sourceSummary}`);
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
            sources: result.sources,
            sourceSummary: result.sourceSummary,
            explorer: `${config.explorer}/tx/${result.tx.hash}`,
            gasUsed: result.receipt.gasUsed?.toString(),
            blockNumber: result.receipt.blockNumber,
          };
        }
      } catch (err) {
        console.warn('[ORDER] Aggregator execution failed, falling back to direct DEX:', err.message);
      }
    }

    // ── STRATEGY 2: Direct DEX (single router, fallback) ──
    console.log(`[ORDER] Executing via Direct → ${config.dexName}`);
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
        console.log(`[WALLET] Approving ${baseToken} for ${config.dexName}...`);
        const approveTx = await tokenContract.approve(config.router, ethers.MaxUint256);
        await approveTx.wait();
        console.log('[WALLET] Approval confirmed');
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

    console.log(`[WALLET] Swap tx: ${tx.hash}`);
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
}

export const walletBroker = new WalletBrokerService();
