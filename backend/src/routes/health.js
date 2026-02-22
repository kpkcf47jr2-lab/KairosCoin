// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Health Check Routes
//  System status, blockchain connectivity, database health
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const { healthLimiter } = require("../middleware/rateLimiter");
const os = require("os");

const router = express.Router();
const startedAt = new Date();

// ── GET /api/health — Full system health ─────────────────────────────────────
router.get("/", healthLimiter, async (req, res) => {
  const checks = {
    server: "OK",
    database: "UNKNOWN",
    blockchain: "UNKNOWN",
    ownerGas: "UNKNOWN",
  };

  let overallStatus = "HEALTHY";

  // Check database
  try {
    const testDb = db.getDb();
    if (testDb) {
      testDb.prepare("SELECT 1").get();
      checks.database = "OK";
    } else {
      checks.database = "NOT_INITIALIZED";
      overallStatus = "DEGRADED";
    }
  } catch (err) {
    checks.database = `ERROR: ${err.message}`;
    overallStatus = "UNHEALTHY";
  }

  // Check blockchain
  try {
    const provider = blockchain.getProvider();
    if (provider) {
      const blockNumber = await provider.getBlockNumber();
      checks.blockchain = `OK (block ${blockNumber})`;
    } else {
      checks.blockchain = "NOT_INITIALIZED";
      overallStatus = "DEGRADED";
    }
  } catch (err) {
    checks.blockchain = `ERROR: ${err.message}`;
    overallStatus = "UNHEALTHY";
  }

  // Check owner gas balance
  try {
    const gasInfo = await blockchain.getOwnerGasBalance();
    const gasFloat = parseFloat(gasInfo.balanceBNB || "0");
    if (gasFloat < 0.01) {
      checks.ownerGas = `CRITICAL: ${gasInfo.balanceBNB} BNB — refill immediately!`;
      overallStatus = "UNHEALTHY";
    } else if (gasFloat < 0.05) {
      checks.ownerGas = `LOW: ${gasInfo.balanceBNB} BNB — consider refilling`;
      if (overallStatus === "HEALTHY") overallStatus = "DEGRADED";
    } else {
      checks.ownerGas = `OK: ${gasInfo.balanceBNB} BNB`;
    }
  } catch (err) {
    checks.ownerGas = `ERROR: ${err.message}`;
  }

  const uptimeSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

  const health = {
    status: overallStatus,
    version: "1.0.0",
    service: "KairosCoin Stablecoin Backend",
    checks,
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
      startedAt: startedAt.toISOString(),
    },
    system: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      },
      cpuLoad: os.loadavg(),
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = overallStatus === "HEALTHY" ? 200 : overallStatus === "DEGRADED" ? 200 : 503;
  res.status(statusCode).json({ success: statusCode < 500, data: health });
});

// ── GET /api/health/ping — Simple ping ──────────────────────────────────────
router.get("/ping", healthLimiter, (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

// ── GET /api/health/stats — Operation statistics ────────────────────────────
router.get("/stats", healthLimiter, (req, res) => {
  try {
    const stats = db.getTransactionStats();
    const feeStats = db.getFeeStats();

    res.json({
      success: true,
      data: {
        transactions: stats,
        fees: feeStats,
        uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

module.exports = router;
