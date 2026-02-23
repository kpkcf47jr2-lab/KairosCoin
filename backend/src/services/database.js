// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Database Service (SQLite)
//  Immutable audit trail for all mint/burn operations
//  USDT/USDC don't offer this level of off-chain transparency
// ═══════════════════════════════════════════════════════════════════════════════

const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const logger = require("../utils/logger");

let db = null;

// ═════════════════════════════════════════════════════════════════════════════
//                           INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize() {
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath, { verbose: config.isDev ? logger.debug.bind(logger) : null });

  // WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  createTables();
  runMigrations();
  logger.info(`Database initialized at ${config.dbPath}`);
}

function createTables() {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════════════
    --  TRANSACTIONS — Every mint/burn is recorded forever
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('MINT', 'BURN', 'AUTO_MINT', 'AUTO_BURN')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUBMITTED', 'CONFIRMED', 'FAILED')),
      address TEXT NOT NULL,
      amount TEXT NOT NULL,
      amount_usd TEXT,
      tx_hash TEXT,
      block_number INTEGER,
      gas_used TEXT,
      error TEXT,
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_at TEXT
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  RESERVES — USD reserve tracking for Proof of Reserves
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS reserves (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'INTEREST', 'FEE')),
      amount_usd TEXT NOT NULL,
      description TEXT,
      reference TEXT,
      bank_reference TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  RESERVE SNAPSHOTS — Periodic proof of reserves snapshots
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS reserve_snapshots (
      id TEXT PRIMARY KEY,
      total_usd_reserves TEXT NOT NULL,
      total_kairos_circulating TEXT NOT NULL,
      total_kairos_supply TEXT NOT NULL,
      reserve_ratio TEXT NOT NULL,
      on_chain_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  FEE LOG — Every fee collected on-chain
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS fee_log (
      id TEXT PRIMARY KEY,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      fee_amount TEXT NOT NULL,
      tx_hash TEXT,
      block_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  API AUDIT LOG — Every API call is logged
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS api_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      ip TEXT,
      api_key_type TEXT,
      status_code INTEGER,
      response_time_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  FIAT ORDERS — Track fiat-to-KAIROS purchases via Stripe, Transak, etc.
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS fiat_orders (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'stripe' CHECK(provider IN ('stripe', 'transak', 'moonpay', 'changelly')),
      provider_order_id TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN (
        'CREATED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'PROCESSING',
        'CRYPTO_SENT', 'MINTING', 'COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED', 'MINT_FAILED'
      )),
      wallet_address TEXT NOT NULL,
      fiat_amount TEXT NOT NULL,
      fiat_currency TEXT NOT NULL DEFAULT 'USD',
      crypto_amount TEXT,
      payment_method TEXT,
      transak_status TEXT,
      mint_tx_id TEXT,
      mint_tx_hash TEXT,
      webhook_data TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_tx_address ON transactions(address);
    CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_reserves_type ON reserves(type);
    CREATE INDEX IF NOT EXISTS idx_fee_log_created ON fee_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_fiat_provider_order ON fiat_orders(provider_order_id);
    CREATE INDEX IF NOT EXISTS idx_fiat_wallet ON fiat_orders(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_fiat_status ON fiat_orders(status);
    CREATE INDEX IF NOT EXISTS idx_fiat_created ON fiat_orders(created_at);
  `);
}

// ═════════════════════════════════════════════════════════════════════════════
//                           MIGRATIONS
// ═════════════════════════════════════════════════════════════════════════════

function runMigrations() {
  // Migration: Add 'stripe' to fiat_orders provider CHECK and 'MINT_FAILED' to status CHECK
  // SQLite doesn't support ALTER CHECK, so we recreate the table preserving data
  try {
    const tableInfo = db.pragma("table_info(fiat_orders)");
    const providerCol = tableInfo.find(c => c.name === 'provider');
    
    // Check if migration is needed by trying a test insert
    const testNeeded = (() => {
      try {
        const stmt = db.prepare("INSERT INTO fiat_orders (id, provider, wallet_address, fiat_amount) VALUES (?, ?, ?, ?)");
        stmt.run('__migration_test__', 'stripe', '0x0', '0');
        db.prepare("DELETE FROM fiat_orders WHERE id = '__migration_test__'").run();
        return false; // Migration not needed, stripe already works
      } catch (e) {
        return true; // CHECK constraint failed, migration needed
      }
    })();

    if (testNeeded) {
      logger.info("Running migration: adding 'stripe' provider to fiat_orders...");
      db.exec(`
        CREATE TABLE IF NOT EXISTS fiat_orders_new (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL DEFAULT 'stripe' CHECK(provider IN ('stripe', 'transak', 'moonpay', 'changelly')),
          provider_order_id TEXT,
          status TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN (
            'CREATED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'PROCESSING',
            'CRYPTO_SENT', 'MINTING', 'COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED', 'MINT_FAILED'
          )),
          wallet_address TEXT NOT NULL,
          fiat_amount TEXT NOT NULL,
          fiat_currency TEXT NOT NULL DEFAULT 'USD',
          crypto_amount TEXT,
          payment_method TEXT,
          transak_status TEXT,
          mint_tx_id TEXT,
          mint_tx_hash TEXT,
          webhook_data TEXT,
          error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
        INSERT OR IGNORE INTO fiat_orders_new SELECT * FROM fiat_orders;
        DROP TABLE fiat_orders;
        ALTER TABLE fiat_orders_new RENAME TO fiat_orders;
        CREATE INDEX IF NOT EXISTS idx_fiat_provider_order ON fiat_orders(provider_order_id);
        CREATE INDEX IF NOT EXISTS idx_fiat_wallet ON fiat_orders(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_fiat_status ON fiat_orders(status);
        CREATE INDEX IF NOT EXISTS idx_fiat_created ON fiat_orders(created_at);
      `);
      logger.info("Migration complete: fiat_orders now supports 'stripe' provider");
    }
  } catch (e) {
    logger.warn("Migration check skipped or failed (non-critical):", e.message);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                      TRANSACTION OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a new mint/burn transaction record.
 */
function createTransaction(typeOrOpts, address, amount, opts = {}) {
  let id, type, addr, amt, reference, notes, amountUsd, status, initiatedBy, errorMessage;

  if (typeof typeOrOpts === 'object' && typeOrOpts !== null) {
    // Called with object: { id, type, status, amount, to_address, from_address, reference, note, initiated_by, error_message }
    const o = typeOrOpts;
    id = o.id || uuidv4();
    type = o.type;
    status = o.status || "PENDING";
    addr = o.to_address || o.from_address || o.address;
    amt = o.amount;
    reference = o.reference || null;
    notes = o.note || o.notes || null;
    amountUsd = o.amount_usd || o.amount;
    initiatedBy = o.initiated_by || null;
    errorMessage = o.error_message || null;
  } else {
    // Called positionally: createTransaction(type, address, amount, { ...opts })
    id = uuidv4();
    type = typeOrOpts;
    status = "PENDING";
    addr = address;
    amt = amount;
    reference = opts.reference || null;
    notes = opts.notes || null;
    amountUsd = opts.amountUsd || amount;
    initiatedBy = null;
    errorMessage = null;
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (id, type, status, address, amount, amount_usd, reference, notes, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, type, status, addr, amt, amountUsd || amt, reference, notes, errorMessage);
  logger.info("Transaction record created", { id, type, address: addr, amount: amt, status });
  return id;
}

/**
 * Update transaction status after blockchain confirmation.
 */
function updateTransaction(id, { status, txHash, tx_hash, blockNumber, block_number, gasUsed, gas_used, effective_gas_price, error, error_message }) {
  const stmt = db.prepare(`
    UPDATE transactions
    SET status = ?, tx_hash = ?, block_number = ?, gas_used = ?, error = ?,
        updated_at = datetime('now'),
        confirmed_at = CASE WHEN ? = 'CONFIRMED' THEN datetime('now') ELSE confirmed_at END
    WHERE id = ?
  `);
  const txHash_ = txHash || tx_hash || null;
  const blockNum = blockNumber || block_number || null;
  const gas = gasUsed || gas_used || null;
  const err = error || error_message || null;
  stmt.run(status, txHash_, blockNum, gas, err, status, id);
  logger.info("Transaction updated", { id, status, txHash: txHash_ });
}

/**
 * Get a transaction by ID.
 */
function getTransaction(id) {
  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
}

/**
 * Get transactions with filters.
 */
function getTransactions({ type, status, address, limit = 50, offset = 0 } = {}) {
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params = [];

  if (type) { sql += " AND type = ?"; params.push(type); }
  if (status) { sql += " AND status = ?"; params.push(status); }
  if (address) { sql += " AND address = ?"; params.push(address); }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

/**
 * Get transaction statistics.
 */
function getTransactionStats() {
  const stats = db.prepare(`
    SELECT
      type,
      status,
      COUNT(*) as count,
      COALESCE(SUM(CAST(amount AS REAL)), 0) as total_amount
    FROM transactions
    GROUP BY type, status
  `).all();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'MINT' AND status = 'CONFIRMED' THEN CAST(amount AS REAL) ELSE 0 END), 0) as total_minted,
      COALESCE(SUM(CASE WHEN type = 'BURN' AND status = 'CONFIRMED' THEN CAST(amount AS REAL) ELSE 0 END), 0) as total_burned,
      COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_count,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count
    FROM transactions
  `).get();

  return { breakdown: stats, totals };
}

// ═════════════════════════════════════════════════════════════════════════════
//                      RESERVE OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Record a USD reserve change (deposit/withdrawal).
 */
function recordReserveChange(opts = {}) {
  let id, type, amountUsd, description, reference, bankReference, createdBy;

  if (typeof opts === 'object' && opts.type) {
    // Called with object: { id, type, amount, currency, institution, reference, note, recorded_by }
    id = opts.id || uuidv4();
    type = opts.type;
    amountUsd = opts.amount || opts.amountUsd || "0";
    description = opts.note || opts.description || null;
    reference = opts.reference || null;
    bankReference = opts.institution || opts.bankReference || null;
    createdBy = opts.recorded_by || opts.createdBy || "system";
  } else {
    // Called positionally: recordReserveChange(type, amount, { ...opts })
    type = opts;
    amountUsd = arguments[1];
    const extraOpts = arguments[2] || {};
    id = uuidv4();
    description = extraOpts.description || null;
    reference = extraOpts.reference || null;
    bankReference = extraOpts.bankReference || null;
    createdBy = extraOpts.createdBy || "system";
  }

  const stmt = db.prepare(`
    INSERT INTO reserves (id, type, amount_usd, description, reference, bank_reference, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, type, amountUsd, description, reference, bankReference, createdBy);
  logger.info("Reserve change recorded", { id, type, amountUsd });
  return { id, type, amount: amountUsd };
}

/**
 * Get total USD reserves.
 */
function getTotalReserves() {
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN CAST(amount_usd AS REAL) ELSE 0 END), 0) as total_deposits,
      COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN CAST(amount_usd AS REAL) ELSE 0 END), 0) as total_withdrawals,
      COALESCE(SUM(CASE WHEN type = 'INTEREST' THEN CAST(amount_usd AS REAL) ELSE 0 END), 0) as total_interest,
      COALESCE(SUM(CASE WHEN type = 'FEE' THEN CAST(amount_usd AS REAL) ELSE 0 END), 0) as total_fees,
      COALESCE(SUM(CASE WHEN type = 'ADJUSTMENT' THEN CAST(amount_usd AS REAL) ELSE 0 END), 0) as adjustments,
      COUNT(*) as total_entries,
      MAX(created_at) as last_updated
    FROM reserves
  `).get();

  const totalUsd = result.total_deposits - result.total_withdrawals + result.total_interest - result.total_fees + result.adjustments;

  return {
    ...result,
    totalUsdReserves: totalUsd.toFixed(2),
  };
}

/**
 * Get reserve history.
 */
function getReserveHistory(limitOrOpts = 50) {
  let limit, offset;
  if (typeof limitOrOpts === 'number') {
    limit = limitOrOpts;
    offset = 0;
  } else {
    limit = limitOrOpts?.limit || 50;
    offset = limitOrOpts?.offset || 0;
  }
  return db.prepare(
    "SELECT * FROM reserves ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset);
}

/**
 * Create a Proof of Reserves snapshot.
 */
function createReserveSnapshot(opts = {}) {
  const id = uuidv4();
  let totalUsd, circulatingKairos, totalSupply, onChainData, notes;

  if (typeof opts === 'object' && opts !== null && !Array.isArray(opts)) {
    totalUsd = opts.total_reserves || opts.totalUsd || "0";
    circulatingKairos = opts.circulating_supply || opts.circulatingKairos || "0";
    totalSupply = opts.total_supply || opts.totalSupply || "0";
    onChainData = opts.on_chain_data || opts.onChainData || {};
    notes = opts.notes || null;
  } else {
    totalUsd = opts || "0";
    circulatingKairos = arguments[1] || "0";
    totalSupply = arguments[2] || "0";
    onChainData = arguments[3] || {};
  }

  const ratio = parseFloat(circulatingKairos) > 0
    ? (parseFloat(totalUsd) / parseFloat(circulatingKairos) * 100).toFixed(2) + "%"
    : "N/A";

  const stmt = db.prepare(`
    INSERT INTO reserve_snapshots (id, total_usd_reserves, total_kairos_circulating, total_kairos_supply, reserve_ratio, on_chain_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, totalUsd, circulatingKairos, totalSupply, ratio, JSON.stringify(onChainData));
  return { id, ratio, notes };
}

/**
 * Get latest reserve snapshots.
 */
function getReserveSnapshots(limitOrOpts = 10) {
  const limit = typeof limitOrOpts === 'number' ? limitOrOpts : (limitOrOpts?.limit || 10);
  return db.prepare(
    "SELECT * FROM reserve_snapshots ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
}

// ═════════════════════════════════════════════════════════════════════════════
//                         FEE LOG
// ═════════════════════════════════════════════════════════════════════════════

function logFee(fromAddress, toAddress, feeAmount, txHash, blockNumber) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO fee_log (id, from_address, to_address, fee_amount, tx_hash, block_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, fromAddress, toAddress, feeAmount, txHash || null, blockNumber || null);
}

function getFeeStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as total_fees,
      COALESCE(SUM(CAST(fee_amount AS REAL)), 0) as total_collected,
      COALESCE(AVG(CAST(fee_amount AS REAL)), 0) as avg_fee
    FROM fee_log
  `).get();
}

// ═════════════════════════════════════════════════════════════════════════════
//                         API AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════════

function logApiCall({ method, path, ip, ip_address, api_key_type, apiKeyType, status_code, statusCode, response_time, response_time_ms } = {}) {
  db.prepare(`
    INSERT INTO api_log (method, path, ip, api_key_type, status_code, response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    method || null,
    path || null,
    ip || ip_address || null,
    api_key_type || apiKeyType || null,
    status_code || statusCode || null,
    response_time || response_time_ms || null
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//                       FIAT ORDER OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a new fiat purchase order.
 */
function createFiatOrder({ id, provider = "transak", walletAddress, fiatAmount, fiatCurrency = "USD", paymentMethod = null }) {
  const orderId = id || uuidv4();
  const stmt = db.prepare(`
    INSERT INTO fiat_orders (id, provider, status, wallet_address, fiat_amount, fiat_currency, payment_method)
    VALUES (?, ?, 'CREATED', ?, ?, ?, ?)
  `);
  stmt.run(orderId, provider, walletAddress, fiatAmount, fiatCurrency, paymentMethod);
  logger.info("Fiat order created", { id: orderId, provider, walletAddress, fiatAmount, fiatCurrency });
  return orderId;
}

/**
 * Update fiat order with Transak webhook data.
 */
function updateFiatOrder(id, updates) {
  const fields = [];
  const values = [];

  if (updates.status) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.providerOrderId) { fields.push("provider_order_id = ?"); values.push(updates.providerOrderId); }
  if (updates.cryptoAmount) { fields.push("crypto_amount = ?"); values.push(updates.cryptoAmount); }
  if (updates.transakStatus) { fields.push("transak_status = ?"); values.push(updates.transakStatus); }
  if (updates.mintTxId) { fields.push("mint_tx_id = ?"); values.push(updates.mintTxId); }
  if (updates.mintTxHash) { fields.push("mint_tx_hash = ?"); values.push(updates.mintTxHash); }
  if (updates.webhookData) { fields.push("webhook_data = ?"); values.push(JSON.stringify(updates.webhookData)); }
  if (updates.error) { fields.push("error = ?"); values.push(updates.error); }
  if (updates.paymentMethod) { fields.push("payment_method = ?"); values.push(updates.paymentMethod); }

  fields.push("updated_at = datetime('now')");
  if (updates.status === "COMPLETED") {
    fields.push("completed_at = datetime('now')");
  }

  values.push(id);
  db.prepare(`UPDATE fiat_orders SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  logger.info("Fiat order updated", { id, status: updates.status });
}

/**
 * Find fiat order by provider order ID (e.g., Transak order ID).
 */
function getFiatOrderByProviderId(providerOrderId) {
  return db.prepare("SELECT * FROM fiat_orders WHERE provider_order_id = ?").get(providerOrderId);
}

/**
 * Get a fiat order by internal ID.
 */
function getFiatOrder(id) {
  return db.prepare("SELECT * FROM fiat_orders WHERE id = ?").get(id);
}

/**
 * Get fiat orders with optional filters.
 */
function getFiatOrders({ status, walletAddress, provider, limit = 50, offset = 0 } = {}) {
  let sql = "SELECT * FROM fiat_orders WHERE 1=1";
  const params = [];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (walletAddress) { sql += " AND wallet_address = ?"; params.push(walletAddress); }
  if (provider) { sql += " AND provider = ?"; params.push(provider); }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

/**
 * Get fiat order statistics.
 */
function getFiatOrderStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
      COUNT(CASE WHEN status IN ('CREATED','PAYMENT_PENDING','PAYMENT_RECEIVED','PROCESSING','CRYPTO_SENT','MINTING') THEN 1 END) as pending_orders,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN CAST(fiat_amount AS REAL) ELSE 0 END), 0) as total_fiat_volume,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN CAST(crypto_amount AS REAL) ELSE 0 END), 0) as total_kairos_minted
    FROM fiat_orders
  `).get();
}

// ═════════════════════════════════════════════════════════════════════════════
//                           EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  // Transactions
  createTransaction,
  updateTransaction,
  getTransaction,
  getTransactions,
  getTransactionStats,
  // Reserves
  recordReserveChange,
  getTotalReserves,
  getReserveHistory,
  createReserveSnapshot,
  getReserveSnapshots,
  // Fees
  logFee,
  getFeeStats,
  // Fiat Orders
  createFiatOrder,
  updateFiatOrder,
  getFiatOrder,
  getFiatOrderByProviderId,
  getFiatOrders,
  getFiatOrderStats,
  // API Log
  logApiCall,
  // Direct DB access (for advanced queries)
  getDb: () => db,
};
