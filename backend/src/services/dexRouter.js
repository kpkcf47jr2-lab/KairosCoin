// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — DEX Router Service (Kairos Exchange Engine)
//  SQLite position tracking with real market prices + optional on-chain mirroring
//
//  Architecture:
//  1. User submits order via API → Backend validates & records in SQLite
//  2. Positions tracked locally with real prices from priceOracle
//  3. If relayer has enough funds → mirror on-chain (optional)
//  4. KairosPerps contract used optionally for on-chain transparency
//  5. Liquidation monitor checks every 10s against real prices
//
//  Kairos Exchange flow:
//  - SQLite is the source of truth for all positions
//  - Each new user gets 10,000 KAIROS demo balance (virtual)
//  - On-chain mirroring attempted when relayer has funds — failures don't block trades
//  - On-chain KairosPerps recording is best-effort (try/catch)
//
//  "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// ── SQLite Database ──────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "../../data/kairos.db");
let db = null;

// ── Kairos Exchange — Multi-chain DEX Aggregator Config ───────────────────────
// Uses 0x Protocol API for optimal routing across 100+ DEXes,
// with on-chain fallback via KairosSwap / PancakeSwap.
// Primary execution chain: BSC (best liquidity + lowest fees)

const ZERO_X_API_KEY = process.env.ZERO_X_API_KEY || '';
const KAIROS_FEE_BPS = 15; // 0.15% Kairos platform fee
const KAIROS_FEE_RECIPIENT = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';

// 0x Protocol API endpoints per chain
const ZERO_X_ENDPOINTS = {
  56:    'https://bsc.api.0x.org',
  1:     'https://api.0x.org',
  8453:  'https://base.api.0x.org',
  42161: 'https://arbitrum.api.0x.org',
  137:   'https://polygon.api.0x.org',
};

// KairosSwap native AMM (BSC)
const KAIROS_SWAP = {
  router:  '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6',
  factory: '0xB5891c54199d539CB8afd37BFA9E17370095b9D9',
};

// Primary DEX routers per chain (fallback when 0x unavailable)
const PRIMARY_ROUTERS = {
  56:    '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2
  1:     '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
  42161: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
  8453:  '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24', // Aerodrome
  137:   '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
};

const DEX_NAMES = {
  56: 'PancakeSwap', 1: 'Uniswap V2', 42161: 'SushiSwap',
  8453: 'BaseSwap', 137: 'QuickSwap',
};

// Execution chain config (BSC primary)
const EXECUTION_CHAIN_ID = 56;
const EXECUTION_CHAIN = {
  name: 'BSC',
  rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
  wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  stablecoin: '0x55d398326f99059fF775485246999027B3197955',    // USDT (BSC)
  stablecoinDecimals: 18,
  kairos: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
};

// Supported trading pairs + BSC token mapping for hedging swaps
const SUPPORTED_PAIRS = {
  "BTC/USD":   { token: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, name: 'BTCB' },
  "ETH/USD":   { token: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, name: 'ETH' },
  "BNB/USD":   { token: EXECUTION_CHAIN.wrappedNative,                decimals: 18, name: 'WBNB' },
  "SOL/USD":   { token: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', decimals: 18, name: 'SOL' },
  "DOGE/USD":  { token: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals: 8,  name: 'DOGE' },
  "LINK/USD":  { token: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals: 18, name: 'LINK' },
  "AVAX/USD":  { token: '0x1CE0c2827e2eF14D5C4f29a091d735A204794041', decimals: 18, name: 'AVAX' },
  "MATIC/USD": { token: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', decimals: 18, name: 'MATIC' },
  "ARB/USD":   { token: null, decimals: 0, name: 'ARB' }, // Not on BSC — virtual only
};

// Map trading pair → Binance symbol for price lookup
const PAIR_TO_SYMBOL = {
  "BTC/USD":   "BTCUSDT",
  "ETH/USD":   "ETHUSDT",
  "ARB/USD":   "ARBUSDT",
  "SOL/USD":   "SOLUSDT",
  "DOGE/USD":  "DOGEUSDT",
  "LINK/USD":  "LINKUSDT",
  "AVAX/USD":  "AVAXUSDT",
  "MATIC/USD": "MATICUSDT",
  "BNB/USD":   "BNBUSDT",
};

// ── KairosPerps Contract (optional, for on-chain transparency) ───────────────
let KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9";

// ── ABIs ─────────────────────────────────────────────────────────────────────

// Uniswap V2 fork ABI (PancakeSwap, SushiSwap, QuickSwap, KairosSwap, etc.)
const DEX_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  "function WETH() external view returns (address)",
];

const KAIROS_PERPS_ABI = [
  "function openPosition(address trader, string pair, uint8 side, uint256 leverage, uint256 collateralAmount, uint256 entryPrice, bytes32 gmxOrderKey) external returns (uint256)",
  "function closePosition(uint256 positionId, uint256 exitPrice, bytes32 gmxCloseOrderKey) external returns (int256)",
  "function liquidatePosition(uint256 positionId, uint256 currentPrice) external",
  "function getPosition(uint256 positionId) external view returns (tuple(uint256 id, address trader, string pair, uint8 side, uint256 leverage, uint256 collateralAmount, uint256 sizeUsd, uint256 entryPrice, uint256 exitPrice, int256 realizedPnl, uint256 openFee, uint256 closeFee, bytes32 gmxOrderKey, uint8 status, uint256 openedAt, uint256 closedAt, uint256 liquidationPrice))",
  "function getAccount(address trader) external view returns (uint256 totalCollateral, uint256 lockedCollateral, uint256 availableCollateral, uint256 openPositionCount)",
  "function getUserPositionIds(address trader) external view returns (uint256[])",
  "function isLiquidatable(uint256 positionId, uint256 currentPrice) external view returns (bool)",
  "function getUnrealizedPnl(uint256 positionId, uint256 currentPrice) external view returns (int256)",
  "function globalStats() external view returns (uint256 openInterestLong, uint256 openInterestShort, uint256 totalFees, uint256 volume, uint256 positionsOpened, uint256 liquidations, uint256 contractBalance)",
  "function collateral(address) external view returns (uint256)",
  "function lockedCollateral(address) external view returns (uint256)",
  "function availableCollateral(address) external view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// ═════════════════════════════════════════════════════════════════════════════
//  STATE
// ═════════════════════════════════════════════════════════════════════════════

let provider = null;
let relayerWallet = null;
let dexRouter = null; // PancakeSwap / primary DEX router contract
let kairosPerps = null;
let isInitialized = false;

// Fee constants
const OPEN_FEE_RATE  = 0.001; // 0.10%
const CLOSE_FEE_RATE = 0.001; // 0.10%
const LIQUIDATION_FEE_RATE = 0.005; // 0.50% — liquidation penalty that goes to Kairos
const DEFAULT_BALANCE = 10000; // 10,000 KAIROS demo balance for new users

// Kairos 777 Treasury — ALL trading fees go here
const KAIROS_TREASURY_WALLET = "kairos777_treasury";

// ═════════════════════════════════════════════════════════════════════════════
//  SQLITE INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initializeDatabase() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS dex_accounts (
      wallet TEXT PRIMARY KEY,
      balance REAL DEFAULT ${DEFAULT_BALANCE},
      locked REAL DEFAULT 0,
      total_deposited REAL DEFAULT ${DEFAULT_BALANCE},
      total_pnl REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dex_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trader TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      leverage INTEGER NOT NULL,
      collateral REAL NOT NULL,
      size_usd REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL DEFAULT 0,
      pnl REAL DEFAULT 0,
      open_fee REAL DEFAULT 0,
      close_fee REAL DEFAULT 0,
      liquidation_price REAL NOT NULL,
      gmx_order_key TEXT DEFAULT '',
      status TEXT DEFAULT 'OPEN',
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dex_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position_id INTEGER NOT NULL,
      trader TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      action TEXT NOT NULL,
      price REAL NOT NULL,
      size_usd REAL NOT NULL,
      fee REAL DEFAULT 0,
      pnl REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dex_treasury (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      position_id INTEGER,
      trader TEXT,
      pair TEXT,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_dex_positions_trader ON dex_positions(trader);
    CREATE INDEX IF NOT EXISTS idx_dex_positions_status ON dex_positions(status);
    CREATE INDEX IF NOT EXISTS idx_dex_trades_trader ON dex_trades(trader);
    CREATE INDEX IF NOT EXISTS idx_dex_treasury_source ON dex_treasury(source);
  `);

  logger.info(`DEX Router: SQLite database initialized at ${DB_PATH}`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize() {
  try {
    // 1. Initialize SQLite (always — this is the primary data store)
    initializeDatabase();

    // 2. Initialize BSC connection + DEX router for on-chain execution
    const rpcUrl = EXECUTION_CHAIN.rpc;
    const relayerKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY;
    KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || KAIROS_PERPS_ADDRESS || "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9";

    if (!relayerKey) {
      logger.warn("DEX Router: No relayer private key configured — on-chain execution disabled");
      try { provider = new ethers.JsonRpcProvider(rpcUrl); } catch { /* ignore */ }
    } else {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        relayerWallet = new ethers.Wallet(relayerKey, provider);

        // Connect to PancakeSwap router (primary DEX for on-chain fallback)
        dexRouter = new ethers.Contract(PRIMARY_ROUTERS[EXECUTION_CHAIN_ID], DEX_ROUTER_ABI, relayerWallet);

        // Connect to KairosPerps if deployed (Arbitrum — optional transparency)
        if (KAIROS_PERPS_ADDRESS) {
          try {
            const arbProvider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
            const arbWallet = new ethers.Wallet(relayerKey, arbProvider);
            kairosPerps = new ethers.Contract(KAIROS_PERPS_ADDRESS, KAIROS_PERPS_ABI, arbWallet);
            logger.info(`DEX Router: Connected to KairosPerps at ${KAIROS_PERPS_ADDRESS}`);
          } catch (err) {
            logger.warn(`DEX Router: KairosPerps connection failed (non-fatal): ${err.message}`);
          }
        }

        logger.info(`DEX Router: Relayer wallet: ${relayerWallet.address}`);
        logger.info(`DEX Router: Execution chain: ${EXECUTION_CHAIN.name} (chainId ${EXECUTION_CHAIN_ID})`);
        logger.info(`DEX Router: Primary DEX: ${DEX_NAMES[EXECUTION_CHAIN_ID]} (${PRIMARY_ROUTERS[EXECUTION_CHAIN_ID]})`);
        logger.info(`DEX Router: 0x API: ${ZERO_X_API_KEY ? 'configured ✓' : 'not configured — using on-chain routing'}`);
      } catch (err) {
        logger.warn(`DEX Router: BSC router setup failed (non-fatal): ${err.message}`);
      }
    }

    isInitialized = true;
    logger.info("DEX Router: Initialized — Kairos Exchange Engine (0x Aggregator + DEX routing)");

    // Start liquidation monitor
    startLiquidationMonitor();

  } catch (err) {
    logger.error("DEX Router: Initialization failed:", err.message);
    isInitialized = false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PRICE FEEDS — Real prices from priceOracle (Binance/CoinGecko)
// ═════════════════════════════════════════════════════════════════════════════

const priceOracle = require("./priceOracle");

/**
 * Get current price for a trading pair (e.g. "BTC/USD")
 * Maps pair → Binance symbol (BTCUSDT) for lookup
 */
function getPrice(pair) {
  const prices = priceOracle.getAllPrices();
  // Try direct Binance symbol mapping first
  const symbol = PAIR_TO_SYMBOL[pair];
  if (symbol && prices[symbol]) {
    return prices[symbol].price;
  }
  // Fallback: try stripping "/" and appending "T"
  const pairKey = pair.replace("/", "") + "T";
  if (prices[pairKey]) {
    return prices[pairKey].price;
  }
  // Fallback: try without T
  const pairKeyNoT = pair.replace("/", "");
  if (prices[pairKeyNoT]) {
    return prices[pairKeyNoT].price;
  }
  return null;
}

/**
 * Get all current prices from the oracle
 */
function getAllPrices() {
  return priceOracle.getAllPrices();
}

// ═════════════════════════════════════════════════════════════════════════════
//  ACCOUNT HELPERS — SQLite
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ensure account exists in dex_accounts. Create with default balance if new.
 */
function ensureAccount(wallet) {
  const normalized = wallet.toLowerCase();
  const existing = db.prepare("SELECT * FROM dex_accounts WHERE wallet = ?").get(normalized);
  if (existing) return existing;

  db.prepare(
    "INSERT INTO dex_accounts (wallet, balance, locked, total_deposited, total_pnl) VALUES (?, ?, 0, ?, 0)"
  ).run(normalized, DEFAULT_BALANCE, DEFAULT_BALANCE);

  logger.info(`DEX Router: New account created for ${wallet} with ${DEFAULT_BALANCE} KAIROS demo balance`);
  return db.prepare("SELECT * FROM dex_accounts WHERE wallet = ?").get(normalized);
}

// ═════════════════════════════════════════════════════════════════════════════
//  ORDER EXECUTION — SQLite primary + optional on-chain mirroring
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Open a leveraged position
 *
 * Flow:
 * 1. Validate inputs (pair, leverage, collateral)
 * 2. Get real price from priceOracle (Binance live feed)
 * 3. Ensure account exists, check balance
 * 4. Calculate position size, fees, liquidation price
 * 5. Insert position into SQLite (CFD source of truth)
 * 6. [Optional] On-chain hedge via 0x API / PancakeSwap if relayer funded
 * 7. [Optional] KairosPerps on-chain recording
 * 8. Return position object
 *
 * Execution Model:
 *   - CFD (default): Positions tracked in SQLite at real Binance prices.
 *     P&L settled in KAIROS. No on-chain execution needed.
 *   - On-chain (bonus): If relayer wallet is funded with USDT+BNB on BSC,
 *     actual DEX swaps are executed as hedging. Fully transparent on BscScan.
 *
 * @param {string} trader - Trader's wallet address
 * @param {string} pair - Trading pair (e.g., "BTC/USD")
 * @param {string} side - "LONG" or "SHORT"
 * @param {number} leverage - 2-50x
 * @param {number} collateralKairos - Collateral in KAIROS tokens
 * @returns {Object} Position details
 */
async function openPosition(trader, pair, side, leverage, collateralKairos) {
  if (!isInitialized) throw new Error("DEX Router not initialized");

  logger.info(`DEX Router: Opening ${side} ${pair} ${leverage}x — ${collateralKairos} KAIROS — ${trader}`);

  // 1. Validate inputs
  const pairConfig = SUPPORTED_PAIRS[pair];
  if (!pairConfig) throw new Error(`Unsupported pair: ${pair}. Available: ${Object.keys(SUPPORTED_PAIRS).join(", ")}`);
  if (leverage < 2 || leverage > 50) throw new Error("Leverage must be 2-50x");
  if (collateralKairos < 10) throw new Error("Minimum collateral: 10 KAIROS");

  // 2. Get real-time price
  const currentPrice = getPrice(pair);
  if (!currentPrice) throw new Error(`Price unavailable for ${pair}`);

  const isLong = side === "LONG";
  const sizeUsd = collateralKairos * leverage;
  const openFee = sizeUsd * OPEN_FEE_RATE;
  const liquidationPrice = calculateLiquidationPrice(isLong, currentPrice, leverage);

  // 3. Ensure account + check balance
  const account = ensureAccount(trader);
  const availableBalance = account.balance - account.locked;
  const totalCost = collateralKairos + openFee;
  if (availableBalance < totalCost) {
    throw new Error(`Insufficient balance: available ${availableBalance.toFixed(2)} KAIROS, need ${totalCost.toFixed(2)} (${collateralKairos} collateral + ${openFee.toFixed(2)} fee)`);
  }

  // 4. Lock collateral + deduct open fee
  const traderNorm = trader.toLowerCase();
  db.prepare(
    "UPDATE dex_accounts SET balance = balance - ?, locked = locked + ? WHERE wallet = ?"
  ).run(openFee, collateralKairos, traderNorm);

  // 4b. Credit open fee to Kairos 777 Treasury
  creditTreasury("open_fee", null, traderNorm, pair, openFee);

  // 5. Insert position into SQLite
  const insertResult = db.prepare(`
    INSERT INTO dex_positions (trader, pair, side, leverage, collateral, size_usd, entry_price, open_fee, liquidation_price, gmx_order_key, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'OPEN')
  `).run(traderNorm, pair, side, leverage, collateralKairos, sizeUsd, currentPrice, openFee, liquidationPrice);

  const positionId = insertResult.lastInsertRowid;

  // 6. Record trade log
  db.prepare(`
    INSERT INTO dex_trades (position_id, trader, pair, side, action, price, size_usd, fee)
    VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?)
  `).run(positionId, traderNorm, pair, side, currentPrice, sizeUsd, openFee);

  logger.info(`DEX Router: Position #${positionId} inserted — ${side} ${pair} ${leverage}x, size $${sizeUsd.toFixed(2)}, entry $${currentPrice}`);

  // 7. Try on-chain execution via Kairos Exchange (0x API / PancakeSwap — non-blocking)
  let exchangeOrderKey = "";
  if (relayerWallet && pairConfig.token) {
    try {
      const stableBalance = await getRelayerBalance(EXECUTION_CHAIN.stablecoin, EXECUTION_CHAIN.stablecoinDecimals);
      const gasBalance = await provider.getBalance(relayerWallet.address);
      const minGas = ethers.parseEther("0.005"); // 0.005 BNB for gas

      if (stableBalance >= collateralKairos && gasBalance >= minGas) {
        const sellAmount = ethers.parseUnits(collateralKairos.toFixed(6), EXECUTION_CHAIN.stablecoinDecimals);
        const txHash = await executeKairosSwap(
          EXECUTION_CHAIN.stablecoin, // sell USDT
          pairConfig.token,            // buy asset (BTCB, ETH, etc.)
          sellAmount,
          isLong ? 'BUY' : 'SELL',
          pair
        );
        exchangeOrderKey = txHash;
        // Update position with exchange tx hash
        db.prepare("UPDATE dex_positions SET gmx_order_key = ? WHERE id = ?").run(txHash, positionId);
        logger.info(`DEX Router: Kairos Exchange swap executed — tx: ${txHash}`);
      } else {
        logger.info(`DEX Router: CFD mode — position tracked at real prices (relayer USDT: ${stableBalance.toFixed(2)}, BNB: ${ethers.formatEther(gasBalance)})`);
      }
    } catch (err) {
      logger.warn(`DEX Router: Kairos Exchange execution failed (non-fatal): ${err.message}`);
    }
  }

  // 8. Try on-chain KairosPerps recording (non-blocking)
  if (kairosPerps) {
    try {
      const entryPrice18 = ethers.parseUnits(currentPrice.toString(), 18);
      const tx = await kairosPerps.openPosition(
        trader,
        pair,
        isLong ? 0 : 1,
        leverage,
        ethers.parseUnits(collateralKairos.toString(), 18),
        entryPrice18,
        exchangeOrderKey || ethers.ZeroHash
      );
      await tx.wait();
      logger.info(`DEX Router: Position #${positionId} recorded on-chain (KairosPerps)`);
    } catch (err) {
      logger.warn(`DEX Router: On-chain recording failed (non-fatal): ${err.message}`);
    }
  }

  // 9. Return position
  return {
    id: Number(positionId),
    trader: traderNorm,
    pair,
    side,
    leverage,
    collateral: collateralKairos,
    sizeUsd,
    entryPrice: currentPrice,
    openFee,
    liquidationPrice,
    exchangeOrderKey,
    status: "OPEN",
    openedAt: new Date().toISOString(),
    executionEngine: "kairos-exchange",
    executionMode: exchangeOrderKey ? "on-chain" : "cfd",
    source: "sqlite",
  };
}

/**
 * Close an existing position
 *
 * @param {number} positionId - Position ID from dex_positions table
 * @returns {Object} Closed position with P&L
 */
async function closePosition(positionId) {
  if (!isInitialized) throw new Error("DEX Router not initialized");

  logger.info(`DEX Router: Closing position #${positionId}`);

  // 1. Get position from SQLite
  const position = db.prepare("SELECT * FROM dex_positions WHERE id = ?").get(positionId);
  if (!position) throw new Error(`Position #${positionId} not found`);
  if (position.status !== "OPEN") throw new Error(`Position #${positionId} is already ${position.status}`);

  // 2. Get current exit price
  const exitPrice = getPrice(position.pair);
  if (!exitPrice) throw new Error(`Price unavailable for ${position.pair}`);

  // 3. Calculate P&L
  const isLong = position.side === "LONG";
  let pnl;
  if (isLong) {
    pnl = ((exitPrice - position.entry_price) / position.entry_price) * position.size_usd;
  } else {
    pnl = ((position.entry_price - exitPrice) / position.entry_price) * position.size_usd;
  }

  // 4. Deduct close fee
  const closeFee = position.size_usd * CLOSE_FEE_RATE;
  const netPnl = pnl - closeFee;

  // 5. Update position in SQLite
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE dex_positions SET status = 'CLOSED', exit_price = ?, pnl = ?, close_fee = ?, closed_at = ?
    WHERE id = ?
  `).run(exitPrice, netPnl, closeFee, now, positionId);

  // 6. Unlock collateral + apply P&L to account balance
  const returnAmount = position.collateral + netPnl;
  db.prepare(
    "UPDATE dex_accounts SET balance = balance + ?, locked = locked - ?, total_pnl = total_pnl + ? WHERE wallet = ?"
  ).run(returnAmount > 0 ? returnAmount : 0, position.collateral, netPnl, position.trader);

  // 6b. Credit close fee to Kairos 777 Treasury
  creditTreasury("close_fee", positionId, position.trader, position.pair, closeFee);

  // 7. Record close trade
  db.prepare(`
    INSERT INTO dex_trades (position_id, trader, pair, side, action, price, size_usd, fee, pnl)
    VALUES (?, ?, ?, ?, 'CLOSE', ?, ?, ?, ?)
  `).run(positionId, position.trader, position.pair, position.side, exitPrice, position.size_usd, closeFee, netPnl);

  logger.info(`DEX Router: Position #${positionId} closed — exit $${exitPrice}, P&L: ${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)} KAIROS`);

  // 8. Try on-chain close via Kairos Exchange (0x API / PancakeSwap — non-blocking)
  let exchangeCloseKey = "";
  if (position.gmx_order_key && position.gmx_order_key !== "" && relayerWallet) {
    try {
      const pairConfig = SUPPORTED_PAIRS[position.pair];
      if (pairConfig && pairConfig.token) {
        // Reverse swap: sell asset → buy USDT
        const assetBalance = await getRelayerBalance(pairConfig.token, pairConfig.decimals);
        if (assetBalance > 0) {
          const sellAmount = ethers.parseUnits(
            Math.min(assetBalance, position.collateral).toFixed(6),
            pairConfig.decimals
          );
          exchangeCloseKey = await executeKairosSwap(
            pairConfig.token,            // sell asset
            EXECUTION_CHAIN.stablecoin,  // buy USDT
            sellAmount,
            isLong ? 'SELL' : 'BUY',
            position.pair
          );
          logger.info(`DEX Router: Kairos Exchange close swap — tx: ${exchangeCloseKey}`);
        }
      }
    } catch (err) {
      logger.warn(`DEX Router: Kairos Exchange close failed (non-fatal): ${err.message}`);
    }
  }

  // 9. Try on-chain close (non-blocking)
  if (kairosPerps) {
    try {
      const exitPrice18 = ethers.parseUnits(exitPrice.toString(), 18);
      const tx = await kairosPerps.closePosition(positionId, exitPrice18, exchangeCloseKey || ethers.ZeroHash);
      await tx.wait();
      logger.info(`DEX Router: Position #${positionId} closed on-chain (KairosPerps)`);
    } catch (err) {
      logger.warn(`DEX Router: On-chain close failed (non-fatal): ${err.message}`);
    }
  }

  // 10. Return closed position
  return {
    id: Number(positionId),
    trader: position.trader,
    pair: position.pair,
    side: position.side,
    leverage: position.leverage,
    collateral: position.collateral,
    sizeUsd: position.size_usd,
    entryPrice: position.entry_price,
    exitPrice,
    pnl: netPnl,
    openFee: position.open_fee,
    closeFee,
    liquidationPrice: position.liquidation_price,
    gmxOrderKey: position.gmx_order_key,
    exchangeCloseKey,
    status: "CLOSED",
    openedAt: position.opened_at,
    closedAt: now,
    executionEngine: "kairos-exchange",
    executionMode: (position.gmx_order_key && position.gmx_order_key !== "") ? "on-chain" : "cfd",
    source: "sqlite",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  KAIROS EXCHANGE EXECUTION ENGINE (0x Protocol API + On-chain DEX fallback)
//  Routes swaps through 100+ DEXes via 0x aggregator, with PancakeSwap fallback
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Execute a swap through Kairos Exchange
 * Strategy: Try 0x API first (optimal routing), fallback to PancakeSwap direct
 *
 * @param {string} sellToken - Token to sell address
 * @param {string} buyToken - Token to buy address
 * @param {BigInt} sellAmount - Amount to sell (in token wei)
 * @param {string} direction - 'BUY' or 'SELL' (for logging)
 * @param {string} pair - Trading pair name (for logging)
 * @returns {string} Transaction hash
 */
async function executeKairosSwap(sellToken, buyToken, sellAmount, direction, pair) {
  logger.info(`Kairos Exchange: ${direction} ${pair} — ${sellToken} → ${buyToken}`);

  // Strategy 1: Try 0x Protocol API (aggregates 100+ DEXes)
  if (ZERO_X_API_KEY) {
    try {
      const txHash = await executeVia0xAPI(sellToken, buyToken, sellAmount);
      logger.info(`Kairos Exchange: 0x API swap success — tx: ${txHash}`);
      return txHash;
    } catch (err) {
      logger.warn(`Kairos Exchange: 0x API failed, falling back to on-chain DEX: ${err.message}`);
    }
  }

  // Strategy 2: Direct on-chain DEX routing (PancakeSwap on BSC)
  const txHash = await executeViaOnChainDex(sellToken, buyToken, sellAmount);
  logger.info(`Kairos Exchange: On-chain DEX swap success — tx: ${txHash}`);
  return txHash;
}

/**
 * Execute swap via 0x Protocol Swap API
 * Gets a quote with optimal routing across all available DEXes,
 * then executes the returned calldata with our relayer wallet.
 */
async function executeVia0xAPI(sellToken, buyToken, sellAmount) {
  const endpoint = ZERO_X_ENDPOINTS[EXECUTION_CHAIN_ID];
  if (!endpoint) throw new Error(`0x API: chain ${EXECUTION_CHAIN_ID} not supported`);

  // 1. Get swap quote from 0x
  const params = new URLSearchParams({
    sellToken,
    buyToken,
    sellAmount: sellAmount.toString(),
    slippagePercentage: '0.01', // 1% slippage for backend execution
    feeRecipient: KAIROS_FEE_RECIPIENT,
    buyTokenPercentageFee: (KAIROS_FEE_BPS / 10000).toString(),
    enableSlippageProtection: 'true',
    takerAddress: relayerWallet.address,
  });

  const response = await fetch(`${endpoint}/swap/v1/quote?${params}`, {
    headers: { '0x-api-key': ZERO_X_API_KEY },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.reason || `0x quote failed (HTTP ${response.status})`);
  }

  const quoteData = await response.json();
  const sources = (quoteData.sources || [])
    .filter(s => parseFloat(s.proportion) > 0)
    .map(s => `${s.name} ${Math.round(parseFloat(s.proportion) * 100)}%`)
    .join(' + ');
  logger.info(`Kairos Exchange: 0x routing → ${sources || 'Direct'}`);

  // 2. Approve token spending if needed
  if (sellToken !== EXECUTION_CHAIN.wrappedNative) {
    const erc20 = new ethers.Contract(sellToken, ERC20_ABI, relayerWallet);
    const allowanceTarget = quoteData.allowanceTarget;
    const currentAllowance = await erc20.allowance(relayerWallet.address, allowanceTarget);
    if (currentAllowance < sellAmount) {
      const approveTx = await erc20.approve(allowanceTarget, ethers.MaxUint256);
      await approveTx.wait();
      logger.info(`Kairos Exchange: Token approved for 0x allowance target`);
    }
  }

  // 3. Execute the swap transaction
  const tx = await relayerWallet.sendTransaction({
    to: quoteData.to,
    data: quoteData.data,
    value: quoteData.value || '0',
    gasLimit: Math.ceil(Number(quoteData.estimatedGas || 500000) * 1.3),
  });

  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('Swap transaction reverted');

  return tx.hash;
}

/**
 * Execute swap via on-chain DEX router (PancakeSwap / KairosSwap)
 * Used as fallback when 0x API is unavailable.
 * Routes token→token through WBNB if needed.
 */
async function executeViaOnChainDex(sellToken, buyToken, sellAmount) {
  if (!dexRouter) throw new Error('DEX router not initialized');

  const isNativeSell = sellToken.toLowerCase() === EXECUTION_CHAIN.wrappedNative.toLowerCase();
  const isNativeBuy = buyToken.toLowerCase() === EXECUTION_CHAIN.wrappedNative.toLowerCase();

  // Build path: direct or via WBNB
  let path;
  if (isNativeSell || isNativeBuy) {
    path = [sellToken, buyToken];
  } else {
    // Try direct first, then via WBNB
    try {
      const directAmounts = await dexRouter.getAmountsOut(sellAmount, [sellToken, buyToken]);
      if (directAmounts && directAmounts[1] > 0n) {
        path = [sellToken, buyToken];
      }
    } catch {
      // No direct pair — route via WBNB
    }
    if (!path) {
      path = [sellToken, EXECUTION_CHAIN.wrappedNative, buyToken];
    }
  }

  // Get expected output for slippage calculation
  const amounts = await dexRouter.getAmountsOut(sellAmount, path);
  const expectedOut = amounts[amounts.length - 1];
  const amountOutMin = (expectedOut * 99n) / 100n; // 1% slippage
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 min

  logger.info(`Kairos Exchange: On-chain swap path [${path.length} hops], expected out: ${expectedOut}`);

  let tx;
  if (isNativeSell) {
    // BNB → Token
    tx = await dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
      amountOutMin, path, relayerWallet.address, deadline,
      { value: sellAmount }
    );
  } else if (isNativeBuy) {
    // Token → BNB
    const erc20 = new ethers.Contract(sellToken, ERC20_ABI, relayerWallet);
    const allowance = await erc20.allowance(relayerWallet.address, PRIMARY_ROUTERS[EXECUTION_CHAIN_ID]);
    if (allowance < sellAmount) {
      const approveTx = await erc20.approve(PRIMARY_ROUTERS[EXECUTION_CHAIN_ID], ethers.MaxUint256);
      await approveTx.wait();
    }
    tx = await dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
      sellAmount, amountOutMin, path, relayerWallet.address, deadline
    );
  } else {
    // Token → Token
    const erc20 = new ethers.Contract(sellToken, ERC20_ABI, relayerWallet);
    const allowance = await erc20.allowance(relayerWallet.address, PRIMARY_ROUTERS[EXECUTION_CHAIN_ID]);
    if (allowance < sellAmount) {
      const approveTx = await erc20.approve(PRIMARY_ROUTERS[EXECUTION_CHAIN_ID], ethers.MaxUint256);
      await approveTx.wait();
    }
    tx = await dexRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      sellAmount, amountOutMin, path, relayerWallet.address, deadline
    );
  }

  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('On-chain swap reverted');

  return tx.hash;
}

// ═════════════════════════════════════════════════════════════════════════════
//  LIQUIDATION MONITOR — checks open positions every 10s against real prices
// ═════════════════════════════════════════════════════════════════════════════

let liquidationInterval = null;

function startLiquidationMonitor() {
  if (liquidationInterval) clearInterval(liquidationInterval);

  liquidationInterval = setInterval(async () => {
    try {
      await checkLiquidations();
    } catch (err) {
      logger.error("DEX Router: Liquidation check error:", err.message);
    }
  }, 10000); // Check every 10 seconds

  logger.info("DEX Router: Liquidation monitor started (10s interval)");
}

async function checkLiquidations() {
  if (!db) return;

  const openPositions = db.prepare("SELECT * FROM dex_positions WHERE status = 'OPEN'").all();

  for (const pos of openPositions) {
    const currentPrice = getPrice(pos.pair);
    if (!currentPrice) continue;

    const isLong = pos.side === "LONG";
    let shouldLiquidate = false;

    if (isLong && currentPrice <= pos.liquidation_price) {
      shouldLiquidate = true;
    } else if (!isLong && currentPrice >= pos.liquidation_price) {
      shouldLiquidate = true;
    }

    if (shouldLiquidate) {
      logger.warn(`DEX Router: LIQUIDATING position #${pos.id} (${pos.pair} ${pos.side}) at $${currentPrice} (liq price: $${pos.liquidation_price})`);

      try {
        // Calculate P&L at liquidation (should be near -100% of collateral)
        let pnl;
        if (isLong) {
          pnl = ((currentPrice - pos.entry_price) / pos.entry_price) * pos.size_usd;
        } else {
          pnl = ((pos.entry_price - currentPrice) / pos.entry_price) * pos.size_usd;
        }
        const netPnl = pnl; // No close fee on liquidation

        const now = new Date().toISOString();

        // Update position
        db.prepare(`
          UPDATE dex_positions SET status = 'LIQUIDATED', exit_price = ?, pnl = ?, closed_at = ?
          WHERE id = ?
        `).run(currentPrice, netPnl, now, pos.id);

        // Account: lose the locked collateral
        const liqFee = pos.size_usd * LIQUIDATION_FEE_RATE;
        db.prepare(
          "UPDATE dex_accounts SET locked = locked - ?, total_pnl = total_pnl + ? WHERE wallet = ?"
        ).run(pos.collateral, netPnl, pos.trader);

        // Credit liquidation fee to Kairos 777 Treasury
        creditTreasury("liquidation_fee", pos.id, pos.trader, pos.pair, liqFee);

        // Trade log
        db.prepare(`
          INSERT INTO dex_trades (position_id, trader, pair, side, action, price, size_usd, fee, pnl)
          VALUES (?, ?, ?, ?, 'LIQUIDATE', ?, ?, 0, ?)
        `).run(pos.id, pos.trader, pos.pair, pos.side, currentPrice, pos.size_usd, netPnl);

        logger.info(`DEX Router: Position #${pos.id} liquidated — P&L: ${netPnl.toFixed(2)} KAIROS`);

        // Try on-chain liquidation (non-blocking)
        if (kairosPerps) {
          try {
            const currentPrice18 = ethers.parseUnits(currentPrice.toString(), 18);
            const tx = await kairosPerps.liquidatePosition(pos.id, currentPrice18);
            await tx.wait();
            logger.info(`DEX Router: Position #${pos.id} liquidated on-chain`);
          } catch (err) {
            logger.warn(`DEX Router: On-chain liquidation failed (non-fatal): ${err.message}`);
          }
        }
      } catch (err) {
        logger.error(`DEX Router: Liquidation of #${pos.id} failed: ${err.message}`);
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  ACCOUNT FUNCTIONS — Read from SQLite
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get trader's account from dex_accounts table
 */
async function getAccount(traderAddress) {
  if (!db) {
    return {
      wallet: traderAddress.toLowerCase(),
      balance: 0,
      locked: 0,
      available: 0,
      totalDeposited: 0,
      totalPnl: 0,
      openPositionCount: 0,
      source: "offline",
    };
  }

  const account = ensureAccount(traderAddress);
  const openCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM dex_positions WHERE trader = ? AND status = 'OPEN'"
  ).get(traderAddress.toLowerCase());

  return {
    wallet: account.wallet,
    balance: account.balance,
    locked: account.locked,
    available: account.balance - account.locked,
    totalDeposited: account.total_deposited,
    totalPnl: account.total_pnl,
    openPositionCount: openCount.cnt,
    source: "sqlite",
  };
}

/**
 * Get all OPEN positions for a trader with live unrealizedPnl
 */
async function getPositions(traderAddress) {
  if (!db) return [];

  const traderNorm = traderAddress.toLowerCase();
  const rows = db.prepare(
    "SELECT * FROM dex_positions WHERE trader = ? AND status = 'OPEN' ORDER BY opened_at DESC"
  ).all(traderNorm);

  return rows.map((pos) => {
    const currentPrice = getPrice(pos.pair) || 0;
    let unrealizedPnl = 0;
    if (currentPrice > 0) {
      unrealizedPnl = calculatePnl(pos.side, pos.entry_price, currentPrice, pos.size_usd);
    }
    const unrealizedPnlPct = pos.collateral > 0 ? (unrealizedPnl / pos.collateral) * 100 : 0;

    return {
      id: pos.id,
      trader: pos.trader,
      pair: pos.pair,
      side: pos.side,
      leverage: pos.leverage,
      collateral: pos.collateral,
      sizeUsd: pos.size_usd,
      entryPrice: pos.entry_price,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPct,
      openFee: pos.open_fee,
      liquidationPrice: pos.liquidation_price,
      gmxOrderKey: pos.gmx_order_key,
      status: pos.status,
      openedAt: pos.opened_at,
      source: "sqlite",
    };
  });
}

/**
 * Get position history (CLOSED + LIQUIDATED)
 */
async function getHistory(traderAddress) {
  if (!db) return [];

  const traderNorm = traderAddress.toLowerCase();
  const rows = db.prepare(
    "SELECT * FROM dex_positions WHERE trader = ? AND status IN ('CLOSED', 'LIQUIDATED') ORDER BY closed_at DESC"
  ).all(traderNorm);

  return rows.map((pos) => ({
    id: pos.id,
    trader: pos.trader,
    pair: pos.pair,
    side: pos.side,
    leverage: pos.leverage,
    collateral: pos.collateral,
    sizeUsd: pos.size_usd,
    entryPrice: pos.entry_price,
    exitPrice: pos.exit_price,
    pnl: pos.pnl,
    openFee: pos.open_fee,
    closeFee: pos.close_fee,
    liquidationPrice: pos.liquidation_price,
    gmxOrderKey: pos.gmx_order_key,
    status: pos.status,
    openedAt: pos.opened_at,
    closedAt: pos.closed_at,
    source: "sqlite",
  }));
}

/**
 * Get global protocol stats (aggregated from SQLite)
 */
async function getGlobalStats() {
  if (!db) {
    return {
      openInterestLong: 0,
      openInterestShort: 0,
      totalFees: 0,
      volume: 0,
      positionsOpened: 0,
      positionsClosed: 0,
      liquidations: 0,
      totalAccounts: 0,
      source: "offline",
    };
  }

  try {
    const oiLong = db.prepare(
      "SELECT COALESCE(SUM(size_usd), 0) as total FROM dex_positions WHERE side = 'LONG' AND status = 'OPEN'"
    ).get();

    const oiShort = db.prepare(
      "SELECT COALESCE(SUM(size_usd), 0) as total FROM dex_positions WHERE side = 'SHORT' AND status = 'OPEN'"
    ).get();

    const fees = db.prepare(
      "SELECT COALESCE(SUM(open_fee), 0) + COALESCE(SUM(close_fee), 0) as total FROM dex_positions"
    ).get();

    const volume = db.prepare(
      "SELECT COALESCE(SUM(size_usd), 0) as total FROM dex_positions"
    ).get();

    const opened = db.prepare(
      "SELECT COUNT(*) as cnt FROM dex_positions"
    ).get();

    const closed = db.prepare(
      "SELECT COUNT(*) as cnt FROM dex_positions WHERE status = 'CLOSED'"
    ).get();

    const liqs = db.prepare(
      "SELECT COUNT(*) as cnt FROM dex_positions WHERE status = 'LIQUIDATED'"
    ).get();

    const accounts = db.prepare(
      "SELECT COUNT(*) as cnt FROM dex_accounts"
    ).get();

    // Treasury revenue
    const treasury = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM dex_treasury"
    ).get();

    const treasuryByType = db.prepare(
      "SELECT fee_type, COALESCE(SUM(amount), 0) as total FROM dex_treasury GROUP BY fee_type"
    ).all();

    const revenueBreakdown = {};
    for (const row of treasuryByType) {
      revenueBreakdown[row.fee_type] = row.total;
    }

    return {
      openInterestLong: oiLong.total,
      openInterestShort: oiShort.total,
      totalFees: fees.total,
      volume: volume.total,
      positionsOpened: opened.cnt,
      positionsClosed: closed.cnt,
      liquidations: liqs.cnt,
      totalAccounts: accounts.cnt,
      kairos777Revenue: treasury.total,
      revenueBreakdown,
      source: "sqlite",
    };
  } catch (err) {
    logger.error(`DEX Router: getGlobalStats error: ${err.message}`);
    return {
      openInterestLong: 0,
      openInterestShort: 0,
      totalFees: 0,
      volume: 0,
      positionsOpened: 0,
      positionsClosed: 0,
      liquidations: 0,
      totalAccounts: 0,
      source: "error",
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Credit a fee to the Kairos 777 Treasury
 */
function creditTreasury(feeType, positionId, trader, pair, amount) {
  if (!db || amount <= 0) return;
  try {
    db.prepare(
      "INSERT INTO dex_treasury (source, position_id, trader, pair, fee_type, amount) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("trading", positionId, trader, pair, feeType, amount);
    logger.info(`Treasury: +${amount.toFixed(4)} KAIROS (${feeType}) from ${trader} on ${pair}`);
  } catch (err) {
    logger.error(`Treasury credit failed: ${err.message}`);
  }
}

/**
 * Get Kairos 777 Treasury summary
 */
async function getTreasury() {
  if (!db) return { totalRevenue: 0, breakdown: {}, recentFees: [], source: "offline" };

  const total = db.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM dex_treasury").get().v;

  const byType = db.prepare(
    "SELECT fee_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM dex_treasury GROUP BY fee_type"
  ).all();

  const breakdown = {};
  for (const row of byType) {
    breakdown[row.fee_type] = { total: row.total, count: row.count };
  }

  const recent = db.prepare(
    "SELECT * FROM dex_treasury ORDER BY created_at DESC LIMIT 20"
  ).all();

  const today = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as v FROM dex_treasury WHERE created_at >= date('now')"
  ).get().v;

  return {
    totalRevenue: total,
    todayRevenue: today,
    breakdown,
    recentFees: recent,
    feeRates: {
      openFee: `${(OPEN_FEE_RATE * 100).toFixed(2)}%`,
      closeFee: `${(CLOSE_FEE_RATE * 100).toFixed(2)}%`,
      liquidationFee: `${(LIQUIDATION_FEE_RATE * 100).toFixed(2)}%`,
    },
    source: "sqlite",
  };
}

function calculatePnl(side, entryPrice, exitPrice, sizeUsd) {
  if (side === "LONG") {
    return ((exitPrice - entryPrice) / entryPrice) * sizeUsd;
  } else {
    return ((entryPrice - exitPrice) / entryPrice) * sizeUsd;
  }
}

function calculateLiquidationPrice(isLong, entryPrice, leverage) {
  const marginFraction = 1 / leverage;
  const maintenanceMargin = 0.01; // 1%

  if (isLong) {
    return entryPrice * (1 - marginFraction + maintenanceMargin);
  } else {
    return entryPrice * (1 + marginFraction - maintenanceMargin);
  }
}

async function getRelayerBalance(tokenAddress, decimals) {
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(relayerWallet.address);
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch {
    return 0;
  }
}

function getRelayerAddress() {
  return relayerWallet?.address || null;
}

function getSupportedPairs() {
  return Object.keys(SUPPORTED_PAIRS);
}

function getStatus() {
  const openCount = db ? db.prepare("SELECT COUNT(*) as cnt FROM dex_positions WHERE status = 'OPEN'").get().cnt : 0;
  const totalCount = db ? db.prepare("SELECT COUNT(*) as cnt FROM dex_positions").get().cnt : 0;

  return {
    initialized: isInitialized,
    mode: "Kairos Exchange Engine (CFD + optional on-chain hedging)",
    executionModel: {
      primary: "CFD — Real Binance prices, P&L in KAIROS",
      onchain: relayerWallet ? "Available — 0x Aggregator + PancakeSwap on BSC" : "Not funded — CFD only",
    },
    executionChain: EXECUTION_CHAIN.name,
    chainId: EXECUTION_CHAIN_ID,
    relayer: relayerWallet?.address || null,
    kairosPerps: KAIROS_PERPS_ADDRESS || null,
    primaryDex: DEX_NAMES[EXECUTION_CHAIN_ID],
    primaryRouter: PRIMARY_ROUTERS[EXECUTION_CHAIN_ID],
    kairosSwap: KAIROS_SWAP.router,
    zeroXApiConfigured: !!ZERO_X_API_KEY,
    supportedPairs: Object.keys(SUPPORTED_PAIRS),
    network: "Multi-chain (BSC primary)",
    database: db ? "connected" : "offline",
    openPositions: openCount,
    totalPositions: totalCount,
    fees: { openRate: OPEN_FEE_RATE, closeRate: CLOSE_FEE_RATE, platformFee: `${KAIROS_FEE_BPS} BPS` },
    defaultBalance: DEFAULT_BALANCE,
    aggregator: {
      sources: ['0x Protocol', 'PancakeSwap', 'KairosSwap', 'Uniswap', 'SushiSwap', 'QuickSwap', 'Aerodrome'],
      feeRecipient: KAIROS_FEE_RECIPIENT,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
//  DEPOSIT / WITHDRAW — Manage collateral balance
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Deposit KAIROS as collateral (adds to balance)
 */
function depositCollateral(walletAddress, amount) {
  const wallet = walletAddress.toLowerCase();
  const account = ensureAccount(wallet);
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) throw new Error("Amount must be positive");
  if (numAmount < 1) throw new Error("Minimum deposit: 1 KAIROS");

  db.prepare(
    "UPDATE dex_accounts SET balance = balance + ?, total_deposited = total_deposited + ? WHERE wallet = ?"
  ).run(numAmount, numAmount, wallet);

  const updated = db.prepare("SELECT * FROM dex_accounts WHERE wallet = ?").get(wallet);
  logger.info(`DEX deposit: ${wallet} +${numAmount} KAIROS → balance ${updated.balance}`);
  return {
    wallet,
    deposited: numAmount,
    balance: updated.balance,
    available: updated.balance - updated.locked,
  };
}

/**
 * Withdraw available collateral
 */
function withdrawCollateral(walletAddress, amount) {
  const wallet = walletAddress.toLowerCase();
  const account = ensureAccount(wallet);
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) throw new Error("Amount must be positive");

  const available = account.balance - account.locked;
  if (numAmount > available) {
    throw new Error(`Insufficient available balance. Available: ${available.toFixed(2)} KAIROS`);
  }

  db.prepare(
    "UPDATE dex_accounts SET balance = balance - ? WHERE wallet = ?"
  ).run(numAmount, wallet);

  const updated = db.prepare("SELECT * FROM dex_accounts WHERE wallet = ?").get(wallet);
  logger.info(`DEX withdraw: ${wallet} -${numAmount} KAIROS → balance ${updated.balance}`);
  return {
    wallet,
    withdrawn: numAmount,
    balance: updated.balance,
    available: updated.balance - updated.locked,
  };
}

module.exports = {
  initialize,
  openPosition,
  closePosition,
  getAccount,
  getPositions,
  getHistory,
  getGlobalStats,
  getTreasury,
  getPrice,
  getAllPrices,
  getSupportedPairs,
  getRelayerAddress,
  getStatus,
  depositCollateral,
  withdrawCollateral,
};
