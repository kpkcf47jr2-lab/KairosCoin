// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Mint Routes
//  POST /api/mint — Automated minting backed by verified USD reserves
//
//  Flow: Validate → Authenticate → Log → Mint on-chain → Update log → Respond
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const logger = require("../utils/logger");
const { requireMasterKey } = require("../middleware/auth");
const { mintBurnLimiter } = require("../middleware/rateLimiter");
const { validateMintRequest } = require("../middleware/validator");

const router = express.Router();

// ── POST /api/mint ───────────────────────────────────────────────────────────
// Mint new KAIROS tokens (1:1 with USD reserve deposit)
router.post(
  "/",
  mintBurnLimiter,
  requireMasterKey,
  validateMintRequest,
  async (req, res) => {
    const { to, amount, reference, note } = req.validatedData;
    const txId = uuidv4();
    const startTime = Date.now();

    logger.info("Mint request received", { txId, to, amount, reference });

    try {
      // 1. Create pending transaction record
      db.createTransaction({
        id: txId,
        type: "MINT",
        status: "PENDING",
        amount,
        to_address: to,
        from_address: null,
        reference,
        note,
        initiated_by: req.ip,
      });

      // 2. Execute on-chain mint
      const result = await blockchain.mint(to, amount);

      // 3. Update transaction with blockchain data
      db.updateTransaction(txId, {
        status: "CONFIRMED",
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        gas_used: result.gasUsed,
        effective_gas_price: result.effectiveGasPrice,
      });

      const elapsed = Date.now() - startTime;

      logger.info("Mint successful", {
        txId,
        txHash: result.txHash,
        amount,
        to,
        elapsed: `${elapsed}ms`,
      });

      // 4. Log API call
      db.logApiCall({
        method: "POST",
        path: "/api/mint",
        status_code: 200,
        response_time: elapsed,
        api_key_type: "master",
        ip_address: req.ip,
      });

      res.json({
        success: true,
        transaction: {
          id: txId,
          type: "MINT",
          status: "CONFIRMED",
          amount: `${amount} KAIROS`,
          to,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          explorer: `https://bscscan.com/tx/${result.txHash}`,
          timestamp: new Date().toISOString(),
          elapsed: `${elapsed}ms`,
        },
      });
    } catch (error) {
      // Update transaction as failed
      db.updateTransaction(txId, {
        status: "FAILED",
        error_message: error.message,
      });

      logger.error("Mint failed", {
        txId,
        error: error.message,
        amount,
        to,
      });

      db.logApiCall({
        method: "POST",
        path: "/api/mint",
        status_code: 500,
        response_time: Date.now() - startTime,
        api_key_type: "master",
        ip_address: req.ip,
      });

      res.status(500).json({
        success: false,
        error: "Mint operation failed",
        message: error.message,
        transactionId: txId,
      });
    }
  }
);

// ── GET /api/mint/history ────────────────────────────────────────────────────
// Get mint transaction history
router.get("/history", requireMasterKey, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const transactions = db.getTransactions({ type: "MINT", limit, offset });
    const stats = db.getTransactionStats();

    res.json({
      success: true,
      data: {
        transactions,
        pagination: { page, limit },
        stats: stats.totals,
      },
    });
  } catch (error) {
    logger.error("Fetch mint history failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
