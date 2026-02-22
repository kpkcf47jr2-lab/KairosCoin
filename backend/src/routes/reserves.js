// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Proof of Reserves Routes
//  PUBLIC: Real-time transparency — anyone can verify 1:1 USD backing
//  ADMIN: Record reserve changes (deposits/withdrawals)
//
//  SUPERIORITY: USDT publishes quarterly attestations with delays.
//  KAIROS publishes REAL-TIME on-chain + off-chain reserve proof.
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const logger = require("../utils/logger");
const { requireMasterKey, optionalAuth } = require("../middleware/auth");
const { publicLimiter } = require("../middleware/rateLimiter");
const { validateReserveUpdate } = require("../middleware/validator");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS — No auth required, full transparency
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/reserves — Full Proof of Reserves ──────────────────────────────
router.get("/", publicLimiter, optionalAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    // 1. Get on-chain data
    const onChain = await blockchain.getProofOfReserves();

    // 2. Get off-chain reserve data from database
    const totalReserves = db.getTotalReserves();
    const latestSnapshot = db.getReserveSnapshots(1);
    const txStats = db.getTransactionStats();

    // 3. Calculate backing ratio
    const circulatingSupply = parseFloat(onChain.circulatingSupply);
    const usdReserves = parseFloat(totalReserves?.totalUsdReserves || "0");
    const backingRatio =
      circulatingSupply > 0 ? ((usdReserves / circulatingSupply) * 100).toFixed(4) : "0";

    // 4. Build comprehensive response
    const proof = {
      // Header
      protocol: "KairosCoin",
      symbol: "KAIROS",
      network: "BNB Smart Chain (BSC)",
      chainId: 56,
      contract: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3",
      timestamp: new Date().toISOString(),
      generatedIn: `${Date.now() - startTime}ms`,

      // On-chain token data (verifiable by anyone)
      onChain: {
        totalSupply: onChain.totalSupply,
        circulatingSupply: onChain.circulatingSupply,
        totalMinted: onChain.totalMinted,
        totalBurned: onChain.totalBurned,
        ownerBalance: onChain.treasuryHeld,
        contractPaused: onChain.contractPaused,
        // Anyone can verify these on BscScan
        verification: onChain.verification,
      },

      // Off-chain reserves (USD in custodial accounts)
      offChain: {
        totalUsdReserves: usdReserves.toFixed(2),
        currency: "USD",
        lastUpdated: totalReserves?.last_updated || null,
        reserveBreakdown: totalReserves?.breakdown || [],
        lastAuditSnapshot: latestSnapshot[0] || null,
      },

      // Backing analysis
      backing: {
        ratio: `${backingRatio}%`,
        status:
          parseFloat(backingRatio) >= 100
            ? "FULLY_BACKED"
            : parseFloat(backingRatio) >= 95
              ? "ADEQUATELY_BACKED"
              : "UNDER_BACKED",
        surplus:
          usdReserves >= circulatingSupply
            ? (usdReserves - circulatingSupply).toFixed(2)
            : "0.00",
        deficit:
          usdReserves < circulatingSupply
            ? (circulatingSupply - usdReserves).toFixed(2)
            : "0.00",
      },

      // Operation stats
      operations: {
        totalMintOperations: txStats.totals?.confirmed_count || 0,
        totalBurnOperations: txStats.totals?.confirmed_count || 0,
        totalMintedAmount: txStats.totals?.total_minted || "0",
        totalBurnedAmount: txStats.totals?.total_burned || "0",
        failedOperations: txStats.totals?.failed_count || 0,
      },

      // Transparency commitment
      transparency: {
        realTimeProof: true,
        onChainVerifiable: true,
        openSourceBackend: true,
        publicApi: true,
        auditTrail: true,
        comparisonNote:
          "Unlike USDT (quarterly attestations) and USDC (monthly reports), " +
          "KAIROS provides real-time, on-chain verifiable proof of reserves accessible 24/7.",
      },
    };

    db.logApiCall({
      method: "GET",
      path: "/api/reserves",
      status_code: 200,
      response_time: Date.now() - startTime,
      api_key_type: req.apiKeyType || "anonymous",
      ip_address: req.ip,
    });

    res.json({ success: true, data: proof });
  } catch (error) {
    logger.error("Proof of reserves failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to generate proof of reserves",
      message: error.message,
    });
  }
});

// ── GET /api/reserves/ratio — Simple backing ratio ──────────────────────────
router.get("/ratio", publicLimiter, async (req, res) => {
  try {
    const supplyInfo = await blockchain.getSupplyInfo();
    const totalReserves = db.getTotalReserves();

    const circulating = parseFloat(supplyInfo.circulatingSupply);
    const reserves = parseFloat(totalReserves?.totalUsdReserves || "0");
    const ratio = circulating > 0 ? ((reserves / circulating) * 100).toFixed(4) : "0";

    res.json({
      success: true,
      data: {
        backingRatio: `${ratio}%`,
        usdReserves: reserves.toFixed(2),
        circulatingSupply: circulating.toFixed(2),
        status: parseFloat(ratio) >= 100 ? "FULLY_BACKED" : "UNDER_BACKED",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/reserves/snapshots — Historical reserve snapshots ──────────────
router.get("/snapshots", publicLimiter, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 365);
    const snapshots = db.getReserveSnapshots(limit);
    res.json({ success: true, data: { snapshots, count: snapshots.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS — Master key required
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /api/reserves — Record reserve change ──────────────────────────────
router.post(
  "/",
  requireMasterKey,
  validateReserveUpdate,
  async (req, res) => {
    const { type, amount, currency, institution, reference, note } = req.validatedData;

    try {
      const record = db.recordReserveChange({
        id: uuidv4(),
        type,
        amount,
        currency,
        institution,
        reference,
        note,
        recorded_by: req.ip,
      });

      const totalReserves = db.getTotalReserves();

      logger.info("Reserve change recorded", { type, amount, currency, institution });

      res.json({
        success: true,
        data: {
          record,
          totalReserves: totalReserves?.totalUsdReserves || "0",
          message: `${type} of ${amount} ${currency} recorded successfully`,
        },
      });
    } catch (error) {
      logger.error("Reserve update failed", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ── POST /api/reserves/snapshot — Create audit snapshot ─────────────────────
router.post("/snapshot", requireMasterKey, async (req, res) => {
  try {
    const supplyInfo = await blockchain.getSupplyInfo();
    const totalReserves = db.getTotalReserves();

    const snapshot = db.createReserveSnapshot({
      total_supply: supplyInfo.totalSupply,
      circulating_supply: supplyInfo.circulatingSupply,
      total_reserves: totalReserves?.totalUsdReserves || "0",
      backing_ratio:
        parseFloat(supplyInfo.circulatingSupply) > 0
          ? (
              (parseFloat(totalReserves?.totalUsdReserves || "0") /
                parseFloat(supplyInfo.circulatingSupply)) *
              100
            ).toFixed(4)
          : "0",
      notes: req.body.notes || "Manual snapshot",
    });

    logger.info("Reserve snapshot created", { snapshot });

    res.json({
      success: true,
      data: { snapshot, message: "Audit snapshot created" },
    });
  } catch (error) {
    logger.error("Snapshot creation failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/reserves/history — Reserve change history (admin) ──────────────
router.get("/history", requireMasterKey, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const history = db.getReserveHistory(limit);
    const totalReserves = db.getTotalReserves();

    res.json({
      success: true,
      data: {
        history,
        totalReserves: totalReserves?.totalUsdReserves || "0",
        count: history.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
