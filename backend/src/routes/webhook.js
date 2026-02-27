// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Transak Webhook Handler
//
//  Receives real-time order status updates from Transak.
//  Flow: Transak payment complete → Webhook fires → Verify signature →
//        Update fiat order → Auto-mint KAIROS to user wallet
//
//  Transak Webhook Events:
//    ORDER_CREATED          → Payment initiated
//    ORDER_PAYMENT_VERIFYING → Payment being verified
//    ORDER_PROCESSING       → Crypto being purchased
//    ORDER_COMPLETED        → Crypto sent to deposit address
//    ORDER_FAILED           → Payment or processing failed
//    ORDER_EXPIRED          → Order timed out
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const logger = require("../utils/logger");
const db = require("../services/database");
const blockchain = require("../services/blockchain");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/webhook/transak — Receive Transak order updates
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/transak", async (req, res) => {
  const startTime = Date.now();

  try {
    const webhookData = req.body;

    // ── 1. Verify webhook signature (MANDATORY) ────────────────────────────
    if (!config.transakWebhookSecret) {
      logger.error("TRANSAK_WEBHOOK_SECRET not configured — rejecting webhook for security");
      return res.status(503).json({ error: "Webhook verification not configured" });
    }

    const signature = req.headers["x-transak-signature"] || req.headers["webhook-secret"];
    if (!signature) {
      logger.warn("Transak webhook missing signature", { ip: req.ip });
      return res.status(401).json({ error: "Missing webhook signature" });
    }
    if (!verifyWebhookSignature(webhookData, signature)) {
      logger.warn("Webhook signature verification failed", {
        ip: req.ip,
        orderId: webhookData?.data?.id,
      });
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // ── 2. Extract order data ──────────────────────────────────────────────
    const event = webhookData.eventID || webhookData.status;
    const orderData = webhookData.data || webhookData;

    const {
      id: transakOrderId,
      status: transakStatus,
      walletAddress,
      fiatAmount,
      fiatCurrency,
      cryptoAmount,
      cryptocurrency,
      paymentOptionId,
      partnerOrderId,
    } = orderData;

    logger.info("Transak webhook received", {
      event,
      transakOrderId,
      transakStatus,
      walletAddress,
      fiatAmount,
      cryptoAmount,
    });

    // ── 3. Find or create fiat order ───────────────────────────────────────
    let fiatOrder = db.getFiatOrderByProviderId(transakOrderId);

    if (!fiatOrder && partnerOrderId) {
      fiatOrder = db.getFiatOrder(partnerOrderId);
    }

    if (!fiatOrder) {
      // Order was created directly on Transak (not via our API) — create record
      const orderId = partnerOrderId || uuidv4();
      db.createFiatOrder({
        id: orderId,
        provider: "transak",
        walletAddress: walletAddress || "unknown",
        fiatAmount: String(fiatAmount || "0"),
        fiatCurrency: fiatCurrency || "USD",
        paymentMethod: paymentOptionId || null,
      });
      db.updateFiatOrder(orderId, { providerOrderId: transakOrderId });
      fiatOrder = db.getFiatOrder(orderId);
    }

    // ── 4. Map Transak status → Internal status ───────────────────────────
    const statusMap = {
      AWAITING_PAYMENT_FROM_USER: "PAYMENT_PENDING",
      PAYMENT_DONE_MARKED_BY_USER: "PAYMENT_RECEIVED",
      PROCESSING: "PROCESSING",
      PENDING_DELIVERY_FROM_TRANSAK: "PROCESSING",
      ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK: "PROCESSING",
      COMPLETED: "CRYPTO_SENT",
      CANCELLED: "FAILED",
      FAILED: "FAILED",
      REFUNDED: "REFUNDED",
      EXPIRED: "EXPIRED",
    };

    const internalStatus = statusMap[transakStatus] || fiatOrder.status;

    // ── 5. Update fiat order ──────────────────────────────────────────────
    const updateData = {
      status: internalStatus,
      transakStatus,
      providerOrderId: transakOrderId,
      webhookData: orderData,
    };

    if (cryptoAmount) updateData.cryptoAmount = String(cryptoAmount);
    if (paymentOptionId) updateData.paymentMethod = paymentOptionId;

    db.updateFiatOrder(fiatOrder.id, updateData);

    // ── 6. Auto-mint KAIROS when crypto is delivered ──────────────────────
    if (transakStatus === "COMPLETED" && walletAddress && cryptoAmount) {
      await handleAutoMint(fiatOrder.id, walletAddress, cryptoAmount, transakOrderId);
    }

    // ── 7. Log and respond ────────────────────────────────────────────────
    const elapsed = Date.now() - startTime;
    db.logApiCall({
      method: "POST",
      path: "/api/webhook/transak",
      status_code: 200,
      response_time: elapsed,
      api_key_type: "webhook",
      ip_address: req.ip,
    });

    logger.info("Transak webhook processed", {
      orderId: fiatOrder.id,
      transakOrderId,
      status: internalStatus,
      elapsed: `${elapsed}ms`,
    });

    res.json({ success: true, orderId: fiatOrder.id, status: internalStatus });

  } catch (error) {
    logger.error("Transak webhook error", {
      error: error.message,
      stack: error.stack,
      body: JSON.stringify(req.body).slice(0, 500),
    });
    // Always return 200 to Transak so they don't retry indefinitely
    res.status(200).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO-MINT — Mint KAIROS 1:1 when Transak delivers stablecoins
// ═══════════════════════════════════════════════════════════════════════════════

async function handleAutoMint(fiatOrderId, walletAddress, amount, transakOrderId) {
  try {
    logger.info("Fiat auto-mint initiated", {
      fiatOrderId,
      walletAddress,
      amount,
      transakOrderId,
    });

    // Update order to MINTING status
    db.updateFiatOrder(fiatOrderId, { status: "MINTING" });

    // Create a transaction record for the mint
    const mintTxId = db.createTransaction({
      type: "AUTO_MINT",
      status: "PENDING",
      to_address: walletAddress,
      amount: String(amount),
      amount_usd: String(amount),
      reference: `TRANSAK:${transakOrderId}`,
      note: `Auto-mint from fiat purchase via Transak (Order: ${transakOrderId})`,
      initiated_by: "transak-webhook",
    });

    // Execute on-chain mint
    const result = await blockchain.mint(walletAddress, String(amount));

    // Update transaction record
    db.updateTransaction(mintTxId, {
      status: "CONFIRMED",
      tx_hash: result.txHash,
      block_number: result.blockNumber,
      gas_used: result.gasUsed,
    });

    // Record reserve deposit (fiat received = new reserve backing)
    db.recordReserveChange({
      type: "DEPOSIT",
      amount: String(amount),
      reference: `TRANSAK:${transakOrderId}`,
      note: `Fiat purchase via Transak — $${amount} USD`,
      recorded_by: "transak-webhook",
    });

    // Update fiat order as completed
    db.updateFiatOrder(fiatOrderId, {
      status: "COMPLETED",
      mintTxId,
      mintTxHash: result.txHash,
    });

    logger.info("Fiat auto-mint COMPLETED", {
      fiatOrderId,
      mintTxId,
      txHash: result.txHash,
      walletAddress,
      amount,
      explorer: `https://bscscan.com/tx/${result.txHash}`,
    });

  } catch (error) {
    logger.error("Fiat auto-mint FAILED", {
      fiatOrderId,
      walletAddress,
      amount,
      error: error.message,
    });

    db.updateFiatOrder(fiatOrderId, {
      status: "FAILED",
      error: `Mint failed: ${error.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBHOOK SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function verifyWebhookSignature(data, signature) {
  if (!config.transakWebhookSecret || !signature) return false;

  try {
    const payload = JSON.stringify(data);
    const expectedSignature = crypto
      .createHmac("sha256", config.transakWebhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    logger.warn("Webhook signature comparison failed", { error: err.message });
    return false;
  }
}

module.exports = router;
