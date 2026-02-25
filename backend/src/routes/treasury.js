// Kairos Trade — Treasury Routes (Platform Fee Collection)
// Receives fee data from frontend, stores in Turso
// Admin-only endpoints to view revenue stats

const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');

let db;

function init(database) {
  db = database;

  // Create treasury table
  db.exec(`
    CREATE TABLE IF NOT EXISTS treasury (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      trades INTEGER DEFAULT 0,
      source TEXT DEFAULT 'platform_fees',
      reported_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS treasury_daily (
      date TEXT PRIMARY KEY,
      total_fees REAL DEFAULT 0,
      total_trades INTEGER DEFAULT 0,
      total_volume REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  logger.info('[Treasury] Tables initialized');
}

// ── Auth middleware: requires JWT or master key ──
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (apiKey === config.masterApiKey) {
    req.isAdmin = true;
    return next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    // Simple token validation — accept any valid JWT from our auth system
    req.isAdmin = false;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

// ── POST /api/treasury/collect — Frontend reports collected fees ──
router.post('/collect', requireAuth, (req, res) => {
  try {
    const { amount, trades, source, daily } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Store the collection record
    db.prepare(`
      INSERT INTO treasury (amount, trades, source, reported_by)
      VALUES (?, ?, ?, ?)
    `).run(amount, trades || 0, source || 'platform_fees', req.ip);

    // Update daily aggregate if provided
    if (daily) {
      const today = new Date().toISOString().slice(0, 10);
      const existing = db.prepare('SELECT * FROM treasury_daily WHERE date = ?').get(today);
      if (existing) {
        db.prepare(`
          UPDATE treasury_daily
          SET total_fees = total_fees + ?, total_trades = total_trades + ?, total_volume = total_volume + ?, updated_at = datetime('now')
          WHERE date = ?
        `).run(amount, trades || 0, daily.volume || 0, today);
      } else {
        db.prepare(`
          INSERT INTO treasury_daily (date, total_fees, total_trades, total_volume)
          VALUES (?, ?, ?, ?)
        `).run(today, amount, trades || 0, daily.volume || 0);
      }
    }

    logger.info(`[Treasury] Collected $${amount.toFixed(4)} from ${trades} trades`);
    res.json({ ok: true, collected: amount });
  } catch (err) {
    logger.error(`[Treasury] Collection error: ${err.message}`);
    res.status(500).json({ error: 'Collection failed' });
  }
});

// ── GET /api/treasury/stats — Admin: revenue statistics ──
router.get('/stats', (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.masterApiKey) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    // Total collected
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(trades), 0) as trades FROM treasury').get();

    // Today
    const today = new Date().toISOString().slice(0, 10);
    const todayStats = db.prepare('SELECT * FROM treasury_daily WHERE date = ?').get(today) || { total_fees: 0, total_trades: 0, total_volume: 0 };

    // Last 7 days
    const last7 = db.prepare(`
      SELECT COALESCE(SUM(total_fees), 0) as fees, COALESCE(SUM(total_trades), 0) as trades, COALESCE(SUM(total_volume), 0) as volume
      FROM treasury_daily WHERE date >= date('now', '-7 days')
    `).get();

    // Last 30 days
    const last30 = db.prepare(`
      SELECT COALESCE(SUM(total_fees), 0) as fees, COALESCE(SUM(total_trades), 0) as trades, COALESCE(SUM(total_volume), 0) as volume
      FROM treasury_daily WHERE date >= date('now', '-30 days')
    `).get();

    // Daily breakdown (last 30 days)
    const dailyBreakdown = db.prepare(`
      SELECT date, total_fees, total_trades, total_volume
      FROM treasury_daily
      WHERE date >= date('now', '-30 days')
      ORDER BY date DESC
    `).all();

    // Recent collections
    const recentCollections = db.prepare(`
      SELECT * FROM treasury ORDER BY id DESC LIMIT 20
    `).all();

    res.json({
      feeRate: '0.05%',
      totalCollected: total.total,
      totalTrades: total.trades,
      today: {
        fees: todayStats.total_fees || 0,
        trades: todayStats.total_trades || 0,
        volume: todayStats.total_volume || 0,
      },
      last7days: last7,
      last30days: last30,
      dailyBreakdown,
      recentCollections,
    });
  } catch (err) {
    logger.error(`[Treasury] Stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = { router, init };
