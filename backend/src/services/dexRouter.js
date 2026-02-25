// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — DEX Router Service (HYBRID MODE)
//  SQLite position tracking with real market prices + optional GMX V2 mirroring
//
//  Architecture:
//  1. User submits order via API → Backend validates & records in SQLite
//  2. Positions tracked locally with real prices from priceOracle
//  3. If relayer has enough USDC + ETH → mirror on GMX V2 (optional)
//  4. KairosPerps contract used optionally for on-chain transparency
//  5. Liquidation monitor checks every 10s against real prices
//
//  HYBRID flow:
//  - SQLite is the source of truth for all positions
//  - Each new user gets 10,000 KAIROS demo balance (virtual)
//  - GMX V2 mirroring attempted when relayer has funds — failures don't block trades
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

// ── GMX V2 Contract Addresses on Arbitrum ────────────────────────────────────
const GMX_CONTRACTS = {
  exchangeRouter: "0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8",
  orderVault:     "0x31eF83a530Fde1B38deDA89C0A6660c6E3143B3c",
  dataStore:      "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
  reader:         "0xf60becbba223EEA9495Da3f606753867eC10d139",
  orderHandler:   "0x352f684ab9e97a6321a13CF03A61316B681D9fD2",
  router:         "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",
};

// ── GMX V2 Market Addresses (Arbitrum) ───────────────────────────────────────
const GMX_MARKETS = {
  "BTC/USD":  "0x47c031236e19d024b42f8AE6DA7A02043e22CF03", // BTC/USD [WBTC-USDC]
  "ETH/USD":  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336", // ETH/USD [WETH-USDC]
  "ARB/USD":  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407", // ARB/USD
  "SOL/USD":  "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9", // SOL/USD
  "DOGE/USD": "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4", // DOGE/USD
  "LINK/USD": "0x7f1fa204bb700853D36994DA19F830b6Ad18455C", // LINK/USD
  "AVAX/USD": "0xD9535bB5f58A1a75032416F2dFe7880C30575a41", // AVAX/USD
  "MATIC/USD":"0x2b3a5F8a2b8B6bDB5c0F3B2f5C1A8a8e7b8D6f9c", // MATIC/USD (if available)
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
};

// ── Tokens on Arbitrum ───────────────────────────────────────────────────────
const TOKENS = {
  USDC:   "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // native USDC on Arbitrum
  USDC_E: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // bridged USDC.e
  WETH:   "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  WBTC:   "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  ARB:    "0x912CE59144191C1204E64559FE8253a0e49E6548",
  KAIROS: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3", // KairosCoin on Arbitrum
};

// ── KairosPerps Contract (optional, for on-chain transparency) ───────────────
let KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9";

// ── Minimal ABIs ─────────────────────────────────────────────────────────────

const EXCHANGE_ROUTER_ABI = [
  "function createOrder(tuple(tuple(address receiver, address cancellationReceiver, address callbackContract, address uiFeeReceiver, address market, address initialCollateralToken, address[] swapPath) addresses, tuple(uint256 sizeDeltaUsd, uint256 initialCollateralDeltaAmount, uint256 triggerPrice, uint256 acceptablePrice, uint256 executionFee, uint256 callbackGasLimit, uint256 minOutputAmount) numbers, uint256 orderType, uint256 decreasePositionSwapType, bool isLong, bool shouldUnwrapNativeToken, bool autoCancel, bytes32 referralCode) createOrderParams) external payable returns (bytes32 key)",
  "function sendWnt(address receiver, uint256 amount) external payable",
  "function sendTokens(address token, address receiver, uint256 amount) external",
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
];

const READER_ABI = [
  "function getMarketTokenPrice(address dataStore, tuple(address marketToken, address indexToken, address longToken, address shortToken) market, tuple(uint256 min, uint256 max) indexTokenPrice, tuple(uint256 min, uint256 max) longTokenPrice, tuple(uint256 min, uint256 max) shortTokenPrice, bytes32 pnlFactorType, bool maximize) external view returns (int256, tuple(int256 poolValue, int256 longPnl, int256 shortPnl, int256 netPnl, uint256 longTokenAmount, uint256 shortTokenAmount, uint256 longTokenUsd, uint256 shortTokenUsd, uint256 totalBorrowingFees, uint256 borrowingFeePoolFactor, uint256 impactPoolAmount))",
  "function getAccountPositions(address dataStore, address account, uint256 start, uint256 end) external view returns (tuple(tuple(address account, address market, address collateralToken) addresses, tuple(uint256 sizeInUsd, uint256 sizeInTokens, uint256 collateralAmount, uint256 borrowingFactor, uint256 fundingFeeAmountPerSize, uint256 longTokenClaimableFundingAmountPerSize, uint256 shortTokenClaimableFundingAmountPerSize, uint256 increasedAtTime, uint256 decreasedAtTime, bool isLong) numbers, tuple(bytes32 key) flags)[])",
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
let exchangeRouter = null;
let reader = null;
let kairosPerps = null;
let isInitialized = false;

// GMX order type constants
const OrderType = {
  MarketSwap: 0,
  LimitSwap: 1,
  MarketIncrease: 2,
  LimitIncrease: 3,
  MarketDecrease: 4,
  LimitDecrease: 5,
  StopLossDecrease: 6,
  Liquidation: 7,
};

// Fee constants
const OPEN_FEE_RATE  = 0.001; // 0.10%
const CLOSE_FEE_RATE = 0.001; // 0.10%
const DEFAULT_BALANCE = 10000; // 10,000 KAIROS demo balance for new users

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

    CREATE INDEX IF NOT EXISTS idx_dex_positions_trader ON dex_positions(trader);
    CREATE INDEX IF NOT EXISTS idx_dex_positions_status ON dex_positions(status);
    CREATE INDEX IF NOT EXISTS idx_dex_trades_trader ON dex_trades(trader);
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

    // 2. Initialize Arbitrum connection + GMX (optional)
    const rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
    const relayerKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY;
    KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || KAIROS_PERPS_ADDRESS || "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9";

    if (!relayerKey) {
      logger.warn("DEX Router: No relayer private key configured — GMX mirroring disabled");
      try { provider = new ethers.JsonRpcProvider(rpcUrl); } catch { /* ignore */ }
    } else {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        relayerWallet = new ethers.Wallet(relayerKey, provider);

        // Connect to GMX V2 contracts
        exchangeRouter = new ethers.Contract(GMX_CONTRACTS.exchangeRouter, EXCHANGE_ROUTER_ABI, relayerWallet);
        reader = new ethers.Contract(GMX_CONTRACTS.reader, READER_ABI, provider);

        // Connect to KairosPerps if deployed
        if (KAIROS_PERPS_ADDRESS) {
          kairosPerps = new ethers.Contract(KAIROS_PERPS_ADDRESS, KAIROS_PERPS_ABI, relayerWallet);
          logger.info(`DEX Router: Connected to KairosPerps at ${KAIROS_PERPS_ADDRESS}`);
        }

        logger.info(`DEX Router: Relayer wallet: ${relayerWallet.address}`);
        logger.info(`DEX Router: GMX V2 Exchange Router: ${GMX_CONTRACTS.exchangeRouter}`);
      } catch (err) {
        logger.warn(`DEX Router: Arbitrum/GMX setup failed (non-fatal): ${err.message}`);
      }
    }

    isInitialized = true;
    logger.info("DEX Router: Initialized in HYBRID mode (SQLite + optional GMX)");

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
//  ORDER EXECUTION — SQLite primary + optional GMX V2 mirroring
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Open a leveraged position
 *
 * Flow:
 * 1. Validate inputs (pair, leverage, collateral)
 * 2. Get real price from priceOracle
 * 3. Ensure account exists, check balance
 * 4. Calculate position size, fees, liquidation price
 * 5. Insert position into SQLite
 * 6. Try GMX V2 mirror if relayer has enough funds (non-blocking)
 * 7. Try KairosPerps on-chain recording (non-blocking)
 * 8. Return position object
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
  const marketAddress = GMX_MARKETS[pair];
  if (!marketAddress) throw new Error(`Unsupported pair: ${pair}. Available: ${Object.keys(GMX_MARKETS).join(", ")}`);
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

  // 7. Try GMX V2 mirroring (non-blocking)
  let gmxOrderKey = "";
  if (relayerWallet && exchangeRouter) {
    try {
      const collateralToken = TOKENS.USDC;
      const collateralDecimals = 6;
      const collateralAmountGMX = ethers.parseUnits(collateralKairos.toFixed(6), collateralDecimals);
      const sizeDeltaUsd = ethers.parseUnits(sizeUsd.toString(), 30);
      const executionFee = ethers.parseEther("0.0012");
      const slippageBps = 50;
      const priceWith30Dec = ethers.parseUnits(currentPrice.toString(), 30);
      const acceptablePrice = isLong
        ? priceWith30Dec + (priceWith30Dec * BigInt(slippageBps) / 10000n)
        : priceWith30Dec - (priceWith30Dec * BigInt(slippageBps) / 10000n);

      const relayerUsdcBalance = await getRelayerBalance(TOKENS.USDC, collateralDecimals);
      const relayerEthBalance = await provider.getBalance(relayerWallet.address);

      if (relayerUsdcBalance >= collateralKairos && relayerEthBalance >= executionFee) {
        gmxOrderKey = await executeGMXOrder(
          marketAddress,
          collateralToken,
          collateralAmountGMX,
          sizeDeltaUsd,
          isLong,
          acceptablePrice,
          executionFee
        );
        // Update position with GMX order key
        db.prepare("UPDATE dex_positions SET gmx_order_key = ? WHERE id = ?").run(gmxOrderKey, positionId);
        logger.info(`DEX Router: GMX order submitted — key: ${gmxOrderKey}`);
      } else {
        logger.warn(`DEX Router: GMX mirror skipped — relayer USDC: ${relayerUsdcBalance.toFixed(2)}, ETH: ${ethers.formatEther(relayerEthBalance)}`);
      }
    } catch (err) {
      logger.warn(`DEX Router: GMX mirror failed (non-fatal): ${err.message}`);
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
        gmxOrderKey || ethers.ZeroHash
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
    gmxOrderKey,
    status: "OPEN",
    openedAt: new Date().toISOString(),
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

  // 7. Record close trade
  db.prepare(`
    INSERT INTO dex_trades (position_id, trader, pair, side, action, price, size_usd, fee, pnl)
    VALUES (?, ?, ?, ?, 'CLOSE', ?, ?, ?, ?)
  `).run(positionId, position.trader, position.pair, position.side, exitPrice, position.size_usd, closeFee, netPnl);

  logger.info(`DEX Router: Position #${positionId} closed — exit $${exitPrice}, P&L: ${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)} KAIROS`);

  // 8. Try GMX close if original had GMX order key (non-blocking)
  let gmxCloseKey = "";
  if (position.gmx_order_key && position.gmx_order_key !== "" && relayerWallet && exchangeRouter) {
    try {
      const marketAddress = GMX_MARKETS[position.pair];
      if (marketAddress) {
        const sizeDeltaUsd = ethers.parseUnits(position.size_usd.toString(), 30);
        const executionFee = ethers.parseEther("0.0012");
        const priceWith30Dec = ethers.parseUnits(exitPrice.toString(), 30);
        const slippageBps = 50;
        const acceptablePrice = isLong
          ? priceWith30Dec - (priceWith30Dec * BigInt(slippageBps) / 10000n)
          : priceWith30Dec + (priceWith30Dec * BigInt(slippageBps) / 10000n);

        gmxCloseKey = await executeGMXCloseOrder(
          marketAddress,
          TOKENS.USDC,
          sizeDeltaUsd,
          isLong,
          acceptablePrice,
          executionFee
        );
        logger.info(`DEX Router: GMX close order — key: ${gmxCloseKey}`);
      }
    } catch (err) {
      logger.warn(`DEX Router: GMX close mirror failed (non-fatal): ${err.message}`);
    }
  }

  // 9. Try on-chain close (non-blocking)
  if (kairosPerps) {
    try {
      const exitPrice18 = ethers.parseUnits(exitPrice.toString(), 18);
      const tx = await kairosPerps.closePosition(positionId, exitPrice18, gmxCloseKey || ethers.ZeroHash);
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
    gmxCloseOrderKey: gmxCloseKey,
    status: "CLOSED",
    openedAt: position.opened_at,
    closedAt: now,
    source: "sqlite",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  GMX V2 ORDER EXECUTION (optional mirroring)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Execute a market increase order on GMX V2
 * Uses multicall: sendWnt (execution fee) + sendTokens (collateral) + createOrder
 */
async function executeGMXOrder(market, collateralToken, collateralAmount, sizeDeltaUsd, isLong, acceptablePrice, executionFee) {
  // Approve USDC spending by GMX Router if needed
  const usdcContract = new ethers.Contract(collateralToken, ERC20_ABI, relayerWallet);
  const allowance = await usdcContract.allowance(relayerWallet.address, GMX_CONTRACTS.router);
  if (allowance < collateralAmount) {
    const approveTx = await usdcContract.approve(GMX_CONTRACTS.router, ethers.MaxUint256);
    await approveTx.wait();
    logger.info("DEX Router: USDC approved for GMX Router");
  }

  // Build multicall data
  const sendWntData = exchangeRouter.interface.encodeFunctionData("sendWnt", [
    GMX_CONTRACTS.orderVault,
    executionFee,
  ]);

  const sendTokensData = exchangeRouter.interface.encodeFunctionData("sendTokens", [
    collateralToken,
    GMX_CONTRACTS.orderVault,
    collateralAmount,
  ]);

  const createOrderParams = {
    addresses: {
      receiver: relayerWallet.address,
      cancellationReceiver: relayerWallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: market,
      initialCollateralToken: collateralToken,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralAmount,
      triggerPrice: 0,
      acceptablePrice: acceptablePrice,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0,
    },
    orderType: OrderType.MarketIncrease,
    decreasePositionSwapType: 0,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
  };

  const createOrderData = exchangeRouter.interface.encodeFunctionData("createOrder", [createOrderParams]);

  // Execute multicall
  const tx = await exchangeRouter.multicall(
    [sendWntData, sendTokensData, createOrderData],
    { value: executionFee, gasLimit: 3000000 }
  );

  const receipt = await tx.wait();

  // Extract order key from events
  const orderKey = extractOrderKey(receipt);
  return orderKey;
}

/**
 * Execute a market decrease order on GMX V2 (close position)
 */
async function executeGMXCloseOrder(market, collateralToken, sizeDeltaUsd, isLong, acceptablePrice, executionFee) {
  const sendWntData = exchangeRouter.interface.encodeFunctionData("sendWnt", [
    GMX_CONTRACTS.orderVault,
    executionFee,
  ]);

  const createOrderParams = {
    addresses: {
      receiver: relayerWallet.address,
      cancellationReceiver: relayerWallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: market,
      initialCollateralToken: collateralToken,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd,
      initialCollateralDeltaAmount: 0,
      triggerPrice: 0,
      acceptablePrice: acceptablePrice,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0,
    },
    orderType: OrderType.MarketDecrease,
    decreasePositionSwapType: 0,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
  };

  const createOrderData = exchangeRouter.interface.encodeFunctionData("createOrder", [createOrderParams]);

  const tx = await exchangeRouter.multicall(
    [sendWntData, createOrderData],
    { value: executionFee, gasLimit: 3000000 }
  );

  const receipt = await tx.wait();
  return extractOrderKey(receipt);
}

/**
 * Extract order key from GMX V2 transaction receipt
 */
function extractOrderKey(receipt) {
  for (const log of receipt.logs) {
    try {
      if (log.topics && log.topics.length > 1) {
        return log.topics[1] || ethers.ZeroHash;
      }
    } catch { /* skip */ }
  }
  return ethers.id(receipt.hash); // Fallback: use tx hash as reference
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
        db.prepare(
          "UPDATE dex_accounts SET locked = locked - ?, total_pnl = total_pnl + ? WHERE wallet = ?"
        ).run(pos.collateral, netPnl, pos.trader);

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

    return {
      openInterestLong: oiLong.total,
      openInterestShort: oiShort.total,
      totalFees: fees.total,
      volume: volume.total,
      positionsOpened: opened.cnt,
      positionsClosed: closed.cnt,
      liquidations: liqs.cnt,
      totalAccounts: accounts.cnt,
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
  return Object.keys(GMX_MARKETS);
}

function getStatus() {
  const openCount = db ? db.prepare("SELECT COUNT(*) as cnt FROM dex_positions WHERE status = 'OPEN'").get().cnt : 0;
  const totalCount = db ? db.prepare("SELECT COUNT(*) as cnt FROM dex_positions").get().cnt : 0;

  return {
    initialized: isInitialized,
    mode: "HYBRID (SQLite + optional GMX)",
    relayer: relayerWallet?.address || null,
    kairosPerps: KAIROS_PERPS_ADDRESS || null,
    gmxExchangeRouter: GMX_CONTRACTS.exchangeRouter,
    supportedPairs: Object.keys(GMX_MARKETS),
    network: "Arbitrum One (42161)",
    database: db ? "connected" : "offline",
    openPositions: openCount,
    totalPositions: totalCount,
    fees: { openRate: OPEN_FEE_RATE, closeRate: CLOSE_FEE_RATE },
    defaultBalance: DEFAULT_BALANCE,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  openPosition,
  closePosition,
  getAccount,
  getPositions,
  getHistory,
  getGlobalStats,
  getPrice,
  getAllPrices,
  getSupportedPairs,
  getRelayerAddress,
  getStatus,
};
