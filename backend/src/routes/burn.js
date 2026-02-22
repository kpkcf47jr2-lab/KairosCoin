// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Burn Routes
//  POST /api/burn — Automated burning when USD is withdrawn from reserves
//
//  Flow: Validate → Authenticate → Log → Burn on-chain → Update log → Respond
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const logger = require("../utils/logger");
const { requireMasterKey } = require("../middleware/auth");
const { mintBurnLimiter } = require("../middleware/rateLimiter");
const { validateBurnRequest } = require("../middleware/validator");

const router = express.Router();

// ── POST /api/burn ───────────────────────────────────────────────────────────
// Burn KAIROS tokens (when user redeems for USD)
router.post(
  "/",
  mintBurnLimiter,
  requireMasterKey,
  validateBurnRequest,
  async (req, res) => {
    const { from, amount, reference, note } = req.validatedData;
    const txId = uuidv4();
    const startTime = Date.now();

    logger.info("Burn request received", { txId, from, amount, reference });

    try {
      // 1. Check balance before burning
      const holderInfo = await blockchain.getHolderBalance(from);
      const holderBalance = holderInfo.balance;
      const numAmount = parseFloat(amount);
      if (parseFloat(holderBalance) < numAmount) {
        db.createTransaction({
          id: txId,
          type: "BURN",
          status: "FAILED",
          amount,
          from_address: from,
          to_address: null,
          reference,
          note,
          initiated_by: req.ip,
          error_message: `Insufficient balance: ${holderBalance} KAIROS < ${amount} KAIROS`,
        });

        return res.status(400).json({
          success: false,
          error: "Insufficient balance",
          message: `Address ${from} has ${holderBalance} KAIROS, cannot burn ${amount} KAIROS`,
        });
      }

      // 2. Create pending transaction record
      db.createTransaction({
        id: txId,
        type: "BURN",
        status: "PENDING",
        amount,
        from_address: from,
        to_address: null,
        reference,
        note,
        initiated_by: req.ip,
      });

      // 3. Execute on-chain burn
      const result = await blockchain.burn(from, amount);

      // 4. Update transaction with blockchain data
      db.updateTransaction(txId, {
        status: "CONFIRMED",
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        gas_used: result.gasUsed,
        effective_gas_price: result.effectiveGasPrice,
      });

      const elapsed = Date.now() - startTime;

      logger.info("Burn successful", {
        txId,
        txHash: result.txHash,
        amount,
        from,
        elapsed: `${elapsed}ms`,
      });

      db.logApiCall({
        method: "POST",
        path: "/api/burn",
        status_code: 200,
        response_time: elapsed,
        api_key_type: "master",
        ip_address: req.ip,
      });

      res.json({
        success: true,
        transaction: {
          id: txId,
          type: "BURN",
          status: "CONFIRMED",
          amount: `${amount} KAIROS`,
          from,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          explorer: `https://bscscan.com/tx/${result.txHash}`,
          timestamp: new Date().toISOString(),
          elapsed: `${elapsed}ms`,
        },
      });
    } catch (error) {
      db.updateTransaction(txId, {
        status: "FAILED",
        error_message: error.message,
      });

      logger.error("Burn failed", {
        txId,
        error: error.message,
        amount,
        from,
      });

      db.logApiCall({
        method: "POST",
        path: "/api/burn",
        status_code: 500,
        response_time: Date.now() - startTime,
        api_key_type: "master",
        ip_address: req.ip,
      });

      res.status(500).json({
        success: false,
        error: "Burn operation failed",
        message: error.message,
        transactionId: txId,
      });
    }
  }
);

// ── GET /api/burn/history ────────────────────────────────────────────────────
router.get("/history", requireMasterKey, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const transactions = db.getTransactions({ type: "BURN", limit, offset });
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
    logger.error("Fetch burn history failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
