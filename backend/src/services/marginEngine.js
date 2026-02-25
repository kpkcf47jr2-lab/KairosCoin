// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Margin Engine
//  Real margin trading engine with position management, P&L, and liquidation
//
//  Architecture:
//  - Users deposit KAIROS as collateral → locked in margin account
//  - Kairos reserve provides leverage (2x-10x)
//  - Positions are tracked in DB with real entry prices from Binance
//  - Liquidation engine runs continuously, checking margin levels
//  - P&L is calculated in real-time from live prices
//  - No simulation — every position is persisted and auditable
// ═══════════════════════════════════════════════════════════════════════════════

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const priceOracle = require("./priceOracle");

// Lazy-loaded to avoid circular dependency
let vaultEngine = null;
function getVaultEngine() {
  if (!vaultEngine) {
    try { vaultEngine = require("./vaultEngine"); } catch (e) { /* not available yet */ }
  }
  return vaultEngine;
}

let db = null;
let liquidationInterval = null;
const LIQUIDATION_CHECK_MS = 5000; // Check every 5 seconds

// ── Leverage Tiers ───────────────────────────────────────────────────────────
const LEVERAGE_TIERS = {
  2:  { maintenanceMarginPct: 25,  initialMarginPct: 50,    maxPositionUsd: 100000, liquidationFee: 0.5 },
  3:  { maintenanceMarginPct: 20,  initialMarginPct: 33.33, maxPositionUsd: 75000,  liquidationFee: 0.75 },
  5:  { maintenanceMarginPct: 15,  initialMarginPct: 20,    maxPositionUsd: 50000,  liquidationFee: 1 },
  10: { maintenanceMarginPct: 10,  initialMarginPct: 10,    maxPositionUsd: 25000,  liquidationFee: 1.5 },
};

// ── Trading Fees ─────────────────────────────────────────────────────────────
const MAKER_FEE_PCT = 0.02; // 0.02%
const TAKER_FEE_PCT = 0.05; // 0.05%
const FUNDING_RATE_PCT = 0.01; // 0.01% per 8 hours

// ═════════════════════════════════════════════════════════════════════════════
//                       DATABASE INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize(database) {
  db = database.getDb();
  createMarginTables();
  logger.info("Margin Engine database tables initialized");
}

function createMarginTables() {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════════════
    --  MARGIN ACCOUNTS — One per wallet, tracks collateral & equity
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS margin_accounts (
      wallet_address TEXT PRIMARY KEY,
      total_collateral REAL NOT NULL DEFAULT 0,
      locked_collateral REAL NOT NULL DEFAULT 0,
      available_collateral REAL NOT NULL DEFAULT 0,
      unrealized_pnl REAL NOT NULL DEFAULT 0,
      realized_pnl REAL NOT NULL DEFAULT 0,
      total_deposited REAL NOT NULL DEFAULT 0,
      total_withdrawn REAL NOT NULL DEFAULT 0,
      liquidation_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LIQUIDATED', 'FROZEN')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  MARGIN POSITIONS — Every open/closed position
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS margin_positions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('LONG', 'SHORT')),
      leverage INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED', 'LIQUIDATED')),
      
      -- Size & Pricing
      collateral REAL NOT NULL,
      position_size REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      current_price REAL,
      liquidation_price REAL NOT NULL,
      
      -- Stop Loss / Take Profit
      stop_loss REAL,
      take_profit REAL,
      
      -- P&L
      unrealized_pnl REAL NOT NULL DEFAULT 0,
      realized_pnl REAL,
      pnl_percent REAL NOT NULL DEFAULT 0,
      
      -- Fees
      entry_fee REAL NOT NULL DEFAULT 0,
      exit_fee REAL,
      funding_fees REAL NOT NULL DEFAULT 0,
      
      -- Margin
      margin_ratio REAL NOT NULL DEFAULT 100,
      
      -- Timestamps
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      last_funding_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  MARGIN TRADES — Audit trail: every open, close, liquidation event
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS margin_trades (
      id TEXT PRIMARY KEY,
      position_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('OPEN', 'CLOSE', 'LIQUIDATION', 'STOP_LOSS', 'TAKE_PROFIT')),
      leverage INTEGER NOT NULL,
      
      collateral REAL NOT NULL,
      position_size REAL NOT NULL,
      price REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      pnl REAL,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  MARGIN DEPOSITS/WITHDRAWALS — Collateral movement history
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS margin_transfers (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL')),
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  LIQUIDATION LOG — Every liquidation event for transparency
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS margin_liquidations (
      id TEXT PRIMARY KEY,
      position_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      leverage INTEGER NOT NULL,
      
      collateral_lost REAL NOT NULL,
      position_size REAL NOT NULL,
      entry_price REAL NOT NULL,
      liquidation_price REAL NOT NULL,
      market_price REAL NOT NULL,
      liquidation_fee REAL NOT NULL DEFAULT 0,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_margin_pos_wallet ON margin_positions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_margin_pos_status ON margin_positions(status);
    CREATE INDEX IF NOT EXISTS idx_margin_pos_pair ON margin_positions(pair);
    CREATE INDEX IF NOT EXISTS idx_margin_trades_wallet ON margin_trades(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_margin_trades_pos ON margin_trades(position_id);
    CREATE INDEX IF NOT EXISTS idx_margin_transfers_wallet ON margin_transfers(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_margin_liq_wallet ON margin_liquidations(wallet_address);
  `);
}

// ═════════════════════════════════════════════════════════════════════════════
//                       ACCOUNT OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get or create a margin account for a wallet
 */
function getOrCreateAccount(walletAddress) {
  const addr = walletAddress.toLowerCase();
  let account = db.prepare("SELECT * FROM margin_accounts WHERE wallet_address = ?").get(addr);

  if (!account) {
    db.prepare(`
      INSERT INTO margin_accounts (wallet_address) VALUES (?)
    `).run(addr);
    account = db.prepare("SELECT * FROM margin_accounts WHERE wallet_address = ?").get(addr);
    logger.info("Margin account created", { wallet: addr });
  }

  return account;
}

/**
 * Deposit collateral (KAIROS) into margin account
 */
function depositCollateral(walletAddress, amount) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);

  if (amount <= 0) throw new Error("Amount must be positive");

  const transferId = uuidv4();

  db.prepare(`
    UPDATE margin_accounts
    SET total_collateral = total_collateral + ?,
        available_collateral = available_collateral + ?,
        total_deposited = total_deposited + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(amount, amount, amount, addr);

  db.prepare(`
    INSERT INTO margin_transfers (id, wallet_address, type, amount, status) VALUES (?, ?, 'DEPOSIT', ?, 'COMPLETED')
  `).run(transferId, addr, amount);

  logger.info("Collateral deposited", { wallet: addr, amount, transferId });
  return { transferId, newBalance: account.total_collateral + amount };
}

/**
 * Withdraw collateral from margin account (only available collateral)
 */
function withdrawCollateral(walletAddress, amount) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);

  if (amount <= 0) throw new Error("Amount must be positive");
  if (amount > account.available_collateral) {
    throw new Error(`Insufficient available collateral. Available: ${account.available_collateral.toFixed(2)}, Requested: ${amount.toFixed(2)}`);
  }

  const transferId = uuidv4();

  db.prepare(`
    UPDATE margin_accounts
    SET total_collateral = total_collateral - ?,
        available_collateral = available_collateral - ?,
        total_withdrawn = total_withdrawn + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(amount, amount, amount, addr);

  db.prepare(`
    INSERT INTO margin_transfers (id, wallet_address, type, amount, status) VALUES (?, ?, 'WITHDRAWAL', ?, 'COMPLETED')
  `).run(transferId, addr, amount);

  logger.info("Collateral withdrawn", { wallet: addr, amount, transferId });
  return { transferId, newBalance: account.total_collateral - amount };
}

// ═════════════════════════════════════════════════════════════════════════════
//                       POSITION MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calculate liquidation price for a position
 */
function calculateLiquidationPrice(entryPrice, leverage, side, maintenanceMarginPct) {
  const mmr = maintenanceMarginPct / 100;
  if (side === 'LONG') {
    // Liquidation when price drops enough to eat through collateral minus maintenance margin
    return entryPrice * (1 - (1 / leverage) + mmr);
  } else {
    // SHORT: liquidation when price rises
    return entryPrice * (1 + (1 / leverage) - mmr);
  }
}

/**
 * Calculate unrealized P&L
 */
function calculatePnL(entryPrice, currentPrice, positionSize, side) {
  if (side === 'LONG') {
    return ((currentPrice - entryPrice) / entryPrice) * positionSize;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * positionSize;
  }
}

/**
 * Open a new margin position
 */
function openPosition(walletAddress, { pair, side, leverage, collateral, orderType = 'MARKET', limitPrice = null, stopLoss = null, takeProfit = null }) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);

  // ── Validation ─────────────────────────────────────────────────────────
  const tier = LEVERAGE_TIERS[leverage];
  if (!tier) throw new Error(`Invalid leverage: ${leverage}x. Supported: ${Object.keys(LEVERAGE_TIERS).join(', ')}`);

  if (collateral <= 0) throw new Error("Collateral must be positive");
  if (collateral < 1) throw new Error("Minimum collateral: 1 KAIROS");
  if (collateral > account.available_collateral) {
    throw new Error(`Insufficient collateral. Available: ${account.available_collateral.toFixed(2)} KAIROS, Required: ${collateral.toFixed(2)} KAIROS`);
  }

  const positionSize = collateral * leverage;
  if (positionSize > tier.maxPositionUsd) {
    throw new Error(`Position size $${positionSize.toLocaleString()} exceeds max $${tier.maxPositionUsd.toLocaleString()} for ${leverage}x leverage`);
  }

  // ── Get entry price ────────────────────────────────────────────────────
  const sideUpper = side.toUpperCase();
  const binanceSymbol = pair.replace('/', '');
  let entryPrice;

  if (orderType === 'LIMIT' && limitPrice) {
    entryPrice = limitPrice;
  } else {
    const priceData = priceOracle.getPrice(binanceSymbol);
    if (!priceData || !priceData.price) {
      throw new Error(`No price data available for ${pair}. Cannot open position.`);
    }
    if (!priceOracle.isPriceFresh(binanceSymbol)) {
      throw new Error(`Price data for ${pair} is stale. Please wait for fresh prices.`);
    }
    entryPrice = priceData.price;
  }

  // ── Calculate liquidation price ────────────────────────────────────────
  const liquidationPrice = calculateLiquidationPrice(entryPrice, leverage, sideUpper, tier.maintenanceMarginPct);

  // ── Calculate entry fee ────────────────────────────────────────────────
  const feeRate = orderType === 'LIMIT' ? MAKER_FEE_PCT : TAKER_FEE_PCT;
  const entryFee = positionSize * (feeRate / 100);

  // ── Create position ────────────────────────────────────────────────────
  const positionId = uuidv4();
  const tradeId = uuidv4();

  // Lock collateral
  db.prepare(`
    UPDATE margin_accounts
    SET available_collateral = available_collateral - ?,
        locked_collateral = locked_collateral + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(collateral, collateral, addr);

  // Insert position
  db.prepare(`
    INSERT INTO margin_positions (
      id, wallet_address, pair, side, leverage, status,
      collateral, position_size, entry_price, current_price, liquidation_price,
      stop_loss, take_profit, entry_fee, margin_ratio
    ) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, 100)
  `).run(
    positionId, addr, pair, sideUpper, leverage,
    collateral, positionSize, entryPrice, entryPrice, liquidationPrice,
    stopLoss || null, takeProfit || null, entryFee
  );

  // Record trade
  db.prepare(`
    INSERT INTO margin_trades (id, position_id, wallet_address, pair, side, type, leverage, collateral, position_size, price, fee)
    VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)
  `).run(tradeId, positionId, addr, pair, sideUpper, leverage, collateral, positionSize, entryPrice, entryFee);

  logger.info("Position opened", {
    positionId, wallet: addr, pair, side: sideUpper, leverage,
    collateral, positionSize, entryPrice, liquidationPrice,
  });

  return {
    id: positionId,
    pair,
    side: sideUpper,
    leverage,
    collateral,
    positionSize,
    entryPrice,
    liquidationPrice,
    stopLoss,
    takeProfit,
    entryFee,
    status: 'OPEN',
    openedAt: new Date().toISOString(),
  };
}

/**
 * Close an open position
 */
function closePosition(walletAddress, positionId) {
  const addr = walletAddress.toLowerCase();
  const position = db.prepare(
    "SELECT * FROM margin_positions WHERE id = ? AND wallet_address = ? AND status = 'OPEN'"
  ).get(positionId, addr);

  if (!position) throw new Error("Position not found or already closed");

  // Get current price
  const binanceSymbol = position.pair.replace('/', '');
  const priceData = priceOracle.getPrice(binanceSymbol);
  if (!priceData || !priceData.price) {
    throw new Error(`No price data for ${position.pair}. Cannot close position.`);
  }
  const exitPrice = priceData.price;

  // Calculate P&L
  const realizedPnl = calculatePnL(position.entry_price, exitPrice, position.position_size, position.side);
  const exitFee = position.position_size * (TAKER_FEE_PCT / 100);
  const netPnl = realizedPnl - position.entry_fee - exitFee - position.funding_fees;
  const pnlPercent = (netPnl / position.collateral) * 100;

  // Calculate collateral return: original collateral + net P&L
  const collateralReturn = Math.max(0, position.collateral + netPnl);

  const tradeId = uuidv4();

  // Update position
  db.prepare(`
    UPDATE margin_positions
    SET status = 'CLOSED', exit_price = ?, realized_pnl = ?, unrealized_pnl = 0,
        pnl_percent = ?, exit_fee = ?, current_price = ?, margin_ratio = 0,
        closed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(exitPrice, netPnl, pnlPercent, exitFee, exitPrice, positionId);

  // Update margin account: unlock collateral, apply P&L
  db.prepare(`
    UPDATE margin_accounts
    SET locked_collateral = locked_collateral - ?,
        available_collateral = available_collateral + ?,
        total_collateral = total_collateral + ?,
        realized_pnl = realized_pnl + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(position.collateral, collateralReturn, netPnl, netPnl, addr);

  // Record trade
  db.prepare(`
    INSERT INTO margin_trades (id, position_id, wallet_address, pair, side, type, leverage, collateral, position_size, price, fee, pnl)
    VALUES (?, ?, ?, ?, ?, 'CLOSE', ?, ?, ?, ?, ?, ?)
  `).run(tradeId, positionId, addr, position.pair, position.side, position.leverage, position.collateral, position.position_size, exitPrice, exitFee, netPnl);

  logger.info("Position closed", {
    positionId, wallet: addr, pair: position.pair, side: position.side,
    entryPrice: position.entry_price, exitPrice, pnl: netPnl.toFixed(2),
  });

  // Auto-distribute trading fees to the vault
  const totalFees = position.entry_fee + exitFee;
  if (totalFees > 0) {
    try {
      const ve = getVaultEngine();
      if (ve) ve.distributeFees(totalFees);
    } catch (err) {
      logger.warn("Fee distribution to vault failed", { error: err.message });
    }
  }

  return {
    positionId,
    pair: position.pair,
    side: position.side,
    entryPrice: position.entry_price,
    exitPrice,
    realizedPnl: netPnl,
    pnlPercent,
    collateralReturn,
    fees: { entry: position.entry_fee, exit: exitFee, funding: position.funding_fees },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                       LIQUIDATION ENGINE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Check all open positions and liquidate those below maintenance margin
 */
function checkLiquidations() {
  const openPositions = db.prepare("SELECT * FROM margin_positions WHERE status = 'OPEN'").all();

  for (const pos of openPositions) {
    try {
      const binanceSymbol = pos.pair.replace('/', '');
      const priceData = priceOracle.getPrice(binanceSymbol);
      if (!priceData || !priceData.price) continue; // Skip if no price

      const currentPrice = priceData.price;
      const pnl = calculatePnL(pos.entry_price, currentPrice, pos.position_size, pos.side);
      const equity = pos.collateral + pnl;
      const marginRatio = (equity / pos.position_size) * 100;

      // Update position with current price and P&L
      const pnlPercent = (pnl / pos.collateral) * 100;
      db.prepare(`
        UPDATE margin_positions
        SET current_price = ?, unrealized_pnl = ?, pnl_percent = ?, margin_ratio = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(currentPrice, pnl, pnlPercent, marginRatio, pos.id);

      // Check Stop Loss
      if (pos.stop_loss) {
        const slTriggered = pos.side === 'LONG'
          ? currentPrice <= pos.stop_loss
          : currentPrice >= pos.stop_loss;

        if (slTriggered) {
          _executeStopLoss(pos, currentPrice, pnl);
          continue;
        }
      }

      // Check Take Profit
      if (pos.take_profit) {
        const tpTriggered = pos.side === 'LONG'
          ? currentPrice >= pos.take_profit
          : currentPrice <= pos.take_profit;

        if (tpTriggered) {
          _executeTakeProfit(pos, currentPrice, pnl);
          continue;
        }
      }

      // Check Liquidation
      const tier = LEVERAGE_TIERS[pos.leverage] || LEVERAGE_TIERS[2];
      const maintenanceMargin = pos.position_size * (tier.maintenanceMarginPct / 100);

      if (equity <= maintenanceMargin) {
        _liquidatePosition(pos, currentPrice, pnl, tier);
      }
    } catch (err) {
      logger.error("Liquidation check error for position", { positionId: pos.id, error: err.message });
    }
  }
}

function _executeStopLoss(pos, currentPrice, pnl) {
  const exitFee = pos.position_size * (TAKER_FEE_PCT / 100);
  const netPnl = pnl - pos.entry_fee - exitFee - pos.funding_fees;
  const pnlPercent = (netPnl / pos.collateral) * 100;
  const collateralReturn = Math.max(0, pos.collateral + netPnl);
  const tradeId = uuidv4();

  db.prepare(`
    UPDATE margin_positions
    SET status = 'CLOSED', exit_price = ?, realized_pnl = ?, unrealized_pnl = 0,
        pnl_percent = ?, exit_fee = ?, current_price = ?, margin_ratio = 0,
        closed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(currentPrice, netPnl, pnlPercent, exitFee, currentPrice, pos.id);

  db.prepare(`
    UPDATE margin_accounts
    SET locked_collateral = locked_collateral - ?,
        available_collateral = available_collateral + ?,
        total_collateral = total_collateral + ?,
        realized_pnl = realized_pnl + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(pos.collateral, collateralReturn, netPnl, netPnl, pos.wallet_address);

  db.prepare(`
    INSERT INTO margin_trades (id, position_id, wallet_address, pair, side, type, leverage, collateral, position_size, price, fee, pnl)
    VALUES (?, ?, ?, ?, ?, 'STOP_LOSS', ?, ?, ?, ?, ?, ?)
  `).run(tradeId, pos.id, pos.wallet_address, pos.pair, pos.side, pos.leverage, pos.collateral, pos.position_size, currentPrice, exitFee, netPnl);

  logger.info("Stop Loss triggered", { positionId: pos.id, pair: pos.pair, price: currentPrice, pnl: netPnl.toFixed(2) });
}

function _executeTakeProfit(pos, currentPrice, pnl) {
  const exitFee = pos.position_size * (TAKER_FEE_PCT / 100);
  const netPnl = pnl - pos.entry_fee - exitFee - pos.funding_fees;
  const pnlPercent = (netPnl / pos.collateral) * 100;
  const collateralReturn = Math.max(0, pos.collateral + netPnl);
  const tradeId = uuidv4();

  db.prepare(`
    UPDATE margin_positions
    SET status = 'CLOSED', exit_price = ?, realized_pnl = ?, unrealized_pnl = 0,
        pnl_percent = ?, exit_fee = ?, current_price = ?, margin_ratio = 0,
        closed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(currentPrice, netPnl, pnlPercent, exitFee, currentPrice, pos.id);

  db.prepare(`
    UPDATE margin_accounts
    SET locked_collateral = locked_collateral - ?,
        available_collateral = available_collateral + ?,
        total_collateral = total_collateral + ?,
        realized_pnl = realized_pnl + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(pos.collateral, collateralReturn, netPnl, netPnl, pos.wallet_address);

  db.prepare(`
    INSERT INTO margin_trades (id, position_id, wallet_address, pair, side, type, leverage, collateral, position_size, price, fee, pnl)
    VALUES (?, ?, ?, ?, ?, 'TAKE_PROFIT', ?, ?, ?, ?, ?, ?)
  `).run(tradeId, pos.id, pos.wallet_address, pos.pair, pos.side, pos.leverage, pos.collateral, pos.position_size, currentPrice, exitFee, netPnl);

  logger.info("Take Profit triggered", { positionId: pos.id, pair: pos.pair, price: currentPrice, pnl: netPnl.toFixed(2) });
}

function _liquidatePosition(pos, currentPrice, pnl, tier) {
  const liquidationFee = pos.collateral * (tier.liquidationFee / 100);
  const tradeId = uuidv4();
  const liqId = uuidv4();

  // Position is liquidated — user loses all collateral
  db.prepare(`
    UPDATE margin_positions
    SET status = 'LIQUIDATED', exit_price = ?, realized_pnl = ?, unrealized_pnl = 0,
        pnl_percent = -100, exit_fee = 0, current_price = ?, margin_ratio = 0,
        closed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(currentPrice, -pos.collateral, currentPrice, pos.id);

  // Collateral is lost
  db.prepare(`
    UPDATE margin_accounts
    SET locked_collateral = locked_collateral - ?,
        total_collateral = total_collateral - ?,
        realized_pnl = realized_pnl - ?,
        liquidation_count = liquidation_count + 1,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(pos.collateral, pos.collateral, pos.collateral, pos.wallet_address);

  // Record trade
  db.prepare(`
    INSERT INTO margin_trades (id, position_id, wallet_address, pair, side, type, leverage, collateral, position_size, price, fee, pnl)
    VALUES (?, ?, ?, ?, ?, 'LIQUIDATION', ?, ?, ?, ?, ?, ?)
  `).run(tradeId, pos.id, pos.wallet_address, pos.pair, pos.side, pos.leverage, pos.collateral, pos.position_size, currentPrice, liquidationFee, -pos.collateral);

  // Record liquidation event
  db.prepare(`
    INSERT INTO margin_liquidations (id, position_id, wallet_address, pair, side, leverage, collateral_lost, position_size, entry_price, liquidation_price, market_price, liquidation_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(liqId, pos.id, pos.wallet_address, pos.pair, pos.side, pos.leverage, pos.collateral, pos.position_size, pos.entry_price, pos.liquidation_price, currentPrice, liquidationFee);

  logger.warn("POSITION LIQUIDATED", {
    positionId: pos.id, wallet: pos.wallet_address, pair: pos.pair,
    side: pos.side, leverage: pos.leverage, collateralLost: pos.collateral,
    entryPrice: pos.entry_price, liquidationPrice: pos.liquidation_price, marketPrice: currentPrice,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//                       QUERY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get account summary with live P&L
 */
function getAccountSummary(walletAddress) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);

  // Get open positions and calculate live unrealized P&L
  const openPositions = db.prepare(
    "SELECT * FROM margin_positions WHERE wallet_address = ? AND status = 'OPEN'"
  ).all(addr);

  let totalUnrealizedPnl = 0;
  for (const pos of openPositions) {
    const binanceSymbol = pos.pair.replace('/', '');
    const priceData = priceOracle.getPrice(binanceSymbol);
    if (priceData && priceData.price) {
      totalUnrealizedPnl += calculatePnL(pos.entry_price, priceData.price, pos.position_size, pos.side);
    }
  }

  // Update account unrealized P&L
  db.prepare(
    "UPDATE margin_accounts SET unrealized_pnl = ?, updated_at = datetime('now') WHERE wallet_address = ?"
  ).run(totalUnrealizedPnl, addr);

  const equity = account.total_collateral + totalUnrealizedPnl;
  const marginLevel = account.locked_collateral > 0
    ? (equity / account.locked_collateral) * 100
    : 100;

  return {
    walletAddress: addr,
    totalCollateral: account.total_collateral,
    lockedCollateral: account.locked_collateral,
    availableCollateral: account.available_collateral,
    unrealizedPnl: totalUnrealizedPnl,
    realizedPnl: account.realized_pnl,
    equity,
    marginLevel,
    openPositionCount: openPositions.length,
    liquidationCount: account.liquidation_count,
    totalDeposited: account.total_deposited,
    totalWithdrawn: account.total_withdrawn,
    status: account.status,
  };
}

/**
 * Get open positions with live P&L
 */
function getOpenPositions(walletAddress) {
  const addr = walletAddress.toLowerCase();
  const positions = db.prepare(
    "SELECT * FROM margin_positions WHERE wallet_address = ? AND status = 'OPEN' ORDER BY opened_at DESC"
  ).all(addr);

  return positions.map(pos => {
    const binanceSymbol = pos.pair.replace('/', '');
    const priceData = priceOracle.getPrice(binanceSymbol);
    const currentPrice = priceData?.price || pos.current_price;
    const pnl = calculatePnL(pos.entry_price, currentPrice, pos.position_size, pos.side);
    const pnlPercent = (pnl / pos.collateral) * 100;
    const equity = pos.collateral + pnl;
    const marginRatio = (equity / pos.position_size) * 100;

    return {
      ...pos,
      current_price: currentPrice,
      unrealized_pnl: pnl,
      pnl_percent: pnlPercent,
      margin_ratio: marginRatio,
      priceSource: priceData ? 'live' : 'cached',
    };
  });
}

/**
 * Get position history (closed + liquidated)
 */
function getPositionHistory(walletAddress, limit = 50) {
  return db.prepare(
    "SELECT * FROM margin_positions WHERE wallet_address = ? AND status IN ('CLOSED', 'LIQUIDATED') ORDER BY closed_at DESC LIMIT ?"
  ).all(walletAddress.toLowerCase(), limit);
}

/**
 * Get trade history
 */
function getTradeHistory(walletAddress, limit = 50) {
  return db.prepare(
    "SELECT * FROM margin_trades WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?"
  ).all(walletAddress.toLowerCase(), limit);
}

/**
 * Get liquidation history
 */
function getLiquidationHistory(walletAddress, limit = 20) {
  return db.prepare(
    "SELECT * FROM margin_liquidations WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?"
  ).all(walletAddress.toLowerCase(), limit);
}

/**
 * Get global margin stats (admin)
 */
function getGlobalStats() {
  const positions = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_positions,
      COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_positions,
      COUNT(CASE WHEN status = 'LIQUIDATED' THEN 1 END) as liquidated_positions,
      COALESCE(SUM(CASE WHEN status = 'OPEN' THEN collateral ELSE 0 END), 0) as total_locked_collateral,
      COALESCE(SUM(CASE WHEN status = 'OPEN' THEN position_size ELSE 0 END), 0) as total_open_interest,
      COALESCE(SUM(CASE WHEN status = 'CLOSED' THEN realized_pnl ELSE 0 END), 0) as total_realized_pnl
    FROM margin_positions
  `).get();

  const accounts = db.prepare(`
    SELECT
      COUNT(*) as total_accounts,
      COALESCE(SUM(total_collateral), 0) as total_collateral,
      COALESCE(SUM(total_deposited), 0) as total_deposited,
      COALESCE(SUM(total_withdrawn), 0) as total_withdrawn
    FROM margin_accounts
  `).get();

  const liquidations = db.prepare(`
    SELECT
      COUNT(*) as total_liquidations,
      COALESCE(SUM(collateral_lost), 0) as total_collateral_lost,
      COALESCE(SUM(liquidation_fee), 0) as total_liquidation_fees
    FROM margin_liquidations
  `).get();

  return { positions, accounts, liquidations };
}

// ═════════════════════════════════════════════════════════════════════════════
//                       LIQUIDATION LOOP
// ═════════════════════════════════════════════════════════════════════════════

function startLiquidationEngine() {
  logger.info("Starting Liquidation Engine...");
  liquidationInterval = setInterval(checkLiquidations, LIQUIDATION_CHECK_MS);
  logger.info(`Liquidation Engine running — checking every ${LIQUIDATION_CHECK_MS}ms`);
}

function stopLiquidationEngine() {
  if (liquidationInterval) {
    clearInterval(liquidationInterval);
    liquidationInterval = null;
  }
  logger.info("Liquidation Engine stopped");
}

// ═════════════════════════════════════════════════════════════════════════════
//                           EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  // Account
  getOrCreateAccount,
  depositCollateral,
  withdrawCollateral,
  getAccountSummary,
  // Positions
  openPosition,
  closePosition,
  getOpenPositions,
  getPositionHistory,
  // Trades & History
  getTradeHistory,
  getLiquidationHistory,
  getGlobalStats,
  // Engine
  startLiquidationEngine,
  stopLiquidationEngine,
  checkLiquidations,
  // Constants
  LEVERAGE_TIERS,
  MAKER_FEE_PCT,
  TAKER_FEE_PCT,
};
