// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Supply & Fee Routes
//  Public endpoints for real-time token supply and fee transparency
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const logger = require("../utils/logger");
const { optionalAuth } = require("../middleware/auth");
const { publicLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// ── GET /api/supply — Complete supply information ────────────────────────────
router.get("/", publicLimiter, optionalAuth, async (req, res) => {
  try {
    const supply = await blockchain.getSupplyInfo();

    res.json({
      success: true,
      data: {
        name: "KairosCoin",
        symbol: "KAIROS",
        decimals: 18,
        totalSupply: supply.totalSupply,
        circulatingSupply: supply.circulatingSupply,
        totalMinted: supply.totalMinted,
        totalBurned: supply.totalBurned,
        ownerBalance: supply.ownerBalance,
        isPaused: supply.isPaused,
        // For API consumers (CoinGecko, CoinMarketCap)
        raw: {
          totalSupply: supply.totalSupplyRaw,
          circulatingSupply: supply.circulatingSupplyRaw,
        },
        network: {
          chain: "BNB Smart Chain",
          chainId: 56,
          contract: supply.contractAddress,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Supply query failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/supply/total — Plain text total supply (for CoinGecko) ─────────
router.get("/total", publicLimiter, async (req, res) => {
  try {
    const supply = await blockchain.getSupplyInfo();
    res.type("text/plain").send(supply.totalSupply);
  } catch (error) {
    res.status(500).type("text/plain").send("Error");
  }
});

// ── GET /api/supply/circulating — Plain text circulating (for CoinGecko) ────
router.get("/circulating", publicLimiter, async (req, res) => {
  try {
    const supply = await blockchain.getSupplyInfo();
    res.type("text/plain").send(supply.circulatingSupply);
  } catch (error) {
    res.status(500).type("text/plain").send("Error");
  }
});

// ── Fees Router (mounted separately at /api/fees) ────────────────────────────
const feesRouter = express.Router();

feesRouter.get("/fees", publicLimiter, optionalAuth, async (req, res) => {
  try {
    const feeInfo = await blockchain.getFeeInfo();
    const feeStats = db.getFeeStats();

    res.json({
      success: true,
      data: {
        currentFee: {
          bps: feeInfo.currentFeeBps,
          percentage: feeInfo.currentFeePercent,
          description: `${feeInfo.currentFeeBps} basis points (${feeInfo.currentFeePercent}) per transfer`,
          maxBps: feeInfo.maxFeeBps,
        },
        reserveWallet: feeInfo.reserveWallet,
        totalFeesCollected: feeInfo.totalFeesCollected,
        stats: feeStats || {},
        comparison: feeInfo.comparison,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Fee query failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/supply/balance/:address — Check any address balance ─────────────
router.get("/balance/:address", publicLimiter, async (req, res) => {
  try {
    const { address } = req.params;
    const info = await blockchain.getHolderBalance(address);

    res.json({
      success: true,
      data: {
        address: info.address,
        balance: `${info.balance} KAIROS`,
        balanceRaw: info.balance,
        isBlacklisted: info.isBlacklisted,
        isFeeExempt: info.isFeeExempt,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Balance query failed", { error: error.message, address: req.params.address });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.feesRouter = feesRouter;
