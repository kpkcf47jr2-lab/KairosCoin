// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Limit Orders API
//  Stores limit orders and monitors prices for execution
//  Kairos 777 Inc. — "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

let db = null;

// ── Initialize ──────────────────────────────────────────────────────────────
function initialize(database) {
  db = database;

  // Create limit_orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS limit_orders (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      chain_id INTEGER NOT NULL DEFAULT 56,
      sell_token TEXT NOT NULL,
      sell_symbol TEXT NOT NULL,
      sell_amount TEXT NOT NULL,
      sell_decimals INTEGER NOT NULL DEFAULT 18,
      buy_token TEXT NOT NULL,
      buy_symbol TEXT NOT NULL,
      buy_amount TEXT NOT NULL,
      buy_decimals INTEGER NOT NULL DEFAULT 18,
      limit_price TEXT NOT NULL,
      current_price TEXT,
      expiry TEXT NOT NULL,
      expiry_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'filled', 'cancelled', 'expired')),
      fill_tx TEXT,
      filled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_limit_orders_wallet ON limit_orders(wallet);
    CREATE INDEX IF NOT EXISTS idx_limit_orders_status ON limit_orders(status);
    CREATE INDEX IF NOT EXISTS idx_limit_orders_chain ON limit_orders(chain_id, status);
  `);

  logger.info("Limit Orders table initialized ✓");
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/limit-orders — Create a new limit order
// ══════════════════════════════════════════════════════════════════════════════
router.post("/", (req, res) => {
  try {
    const {
      wallet, chainId, sellToken, sellSymbol, sellAmount, sellDecimals,
      buyToken, buySymbol, buyAmount, buyDecimals, limitPrice, expiry,
    } = req.body;

    // Validate required fields
    if (!wallet || !sellToken || !buyToken || !sellAmount || !limitPrice || !expiry) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Calculate expiry timestamp
    const expiryMs = {
      "1h": 3600000,
      "24h": 86400000,
      "7d": 604800000,
      "30d": 2592000000,
    };
    const expiryDuration = expiryMs[expiry] || 86400000; // default 24h
    const expiryAt = new Date(Date.now() + expiryDuration).toISOString();

    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO limit_orders (id, wallet, chain_id, sell_token, sell_symbol, sell_amount, sell_decimals,
        buy_token, buy_symbol, buy_amount, buy_decimals, limit_price, expiry, expiry_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, wallet.toLowerCase(), chainId || 56,
      sellToken, sellSymbol || "?", sellAmount, sellDecimals || 18,
      buyToken, buySymbol || "?", buyAmount || "0", buyDecimals || 18,
      limitPrice, expiry, expiryAt
    );

    logger.info(`Limit order created: ${id} — ${sellSymbol} → ${buySymbol} @ ${limitPrice}`, {
      wallet, chainId, sellToken, buyToken, limitPrice,
    });

    res.json({
      success: true,
      order: {
        id,
        wallet: wallet.toLowerCase(),
        chainId: chainId || 56,
        sellToken, sellSymbol, sellAmount, sellDecimals: sellDecimals || 18,
        buyToken, buySymbol, buyAmount: buyAmount || "0", buyDecimals: buyDecimals || 18,
        limitPrice, expiry, expiryAt,
        status: "open",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error("Failed to create limit order", { error: err.message });
    res.status(500).json({ error: "Failed to create limit order" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/limit-orders?wallet=0x...&status=open — Get orders for a wallet
// ══════════════════════════════════════════════════════════════════════════════
router.get("/", (req, res) => {
  try {
    const { wallet, status, chainId } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet parameter required" });
    }

    let query = "SELECT * FROM limit_orders WHERE wallet = ?";
    const params = [wallet.toLowerCase()];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (chainId) {
      query += " AND chain_id = ?";
      params.push(parseInt(chainId));
    }

    query += " ORDER BY created_at DESC LIMIT 100";

    const orders = db.prepare(query).all(...params);

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(formatOrder),
    });
  } catch (err) {
    logger.error("Failed to fetch limit orders", { error: err.message });
    res.status(500).json({ error: "Failed to fetch limit orders" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/limit-orders/:id — Get a specific order
// ══════════════════════════════════════════════════════════════════════════════
router.get("/:id", (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM limit_orders WHERE id = ?").get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, order: formatOrder(order) });
  } catch (err) {
    logger.error("Failed to fetch limit order", { error: err.message });
    res.status(500).json({ error: "Failed to fetch limit order" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/limit-orders/:id — Cancel an order
// ══════════════════════════════════════════════════════════════════════════════
router.delete("/:id", (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) {
      return res.status(400).json({ error: "wallet parameter required" });
    }

    const order = db.prepare("SELECT * FROM limit_orders WHERE id = ? AND wallet = ?")
      .get(req.params.id, wallet.toLowerCase());

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "open") {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    db.prepare("UPDATE limit_orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
      .run(req.params.id);

    logger.info(`Limit order cancelled: ${req.params.id}`, { wallet });

    res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    logger.error("Failed to cancel limit order", { error: err.message });
    res.status(500).json({ error: "Failed to cancel limit order" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/limit-orders/stats/summary — Aggregated stats
// ══════════════════════════════════════════════════════════════════════════════
router.get("/stats/summary", (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM limit_orders
      GROUP BY status
    `).all();

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const open = stats.find(s => s.status === "open")?.count || 0;
    const filled = stats.find(s => s.status === "filled")?.count || 0;
    const cancelled = stats.find(s => s.status === "cancelled")?.count || 0;
    const expired = stats.find(s => s.status === "expired")?.count || 0;

    res.json({
      success: true,
      stats: { total, open, filled, cancelled, expired },
    });
  } catch (err) {
    logger.error("Failed to fetch limit order stats", { error: err.message });
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatOrder(row) {
  return {
    id: row.id,
    wallet: row.wallet,
    chainId: row.chain_id,
    sellToken: { address: row.sell_token, symbol: row.sell_symbol, decimals: row.sell_decimals },
    buyToken: { address: row.buy_token, symbol: row.buy_symbol, decimals: row.buy_decimals },
    sellAmount: row.sell_amount,
    buyAmount: row.buy_amount,
    limitPrice: row.limit_price,
    currentPrice: row.current_price,
    expiry: row.expiry,
    expiryAt: row.expiry_at,
    status: row.status,
    fillTx: row.fill_tx,
    filledAt: row.filled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = { router, initialize };
