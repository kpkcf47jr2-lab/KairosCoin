// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Stripe Webhook Handler
//
//  POST /api/webhook/stripe — Receives Stripe events (checkout.session.completed)
//
//  Flow: User pays via Stripe Checkout → Stripe fires webhook →
//        Verify signature → Update fiat order → Auto-mint KAIROS to wallet
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const config = require("../config");
const logger = require("../utils/logger");
const db = require("../services/database");
const blockchain = require("../services/blockchain");

const router = express.Router();

// Stripe webhook needs raw body for signature verification
// This route must be mounted BEFORE express.json() middleware,
// or use express.raw() specifically here.
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const startTime = Date.now();

    try {
      let event;

      // ── 1. Verify webhook signature ──────────────────────────────────────
      if (config.stripeWebhookSecret) {
        const stripe = require("stripe")(config.stripeSecretKey);
        const sig = req.headers["stripe-signature"];

        try {
          event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            config.stripeWebhookSecret
          );
        } catch (err) {
          logger.warn("Stripe webhook signature verification failed", {
            error: err.message,
            ip: req.ip,
          });
          return res.status(400).json({ error: "Invalid webhook signature" });
        }
      } else {
        // No webhook secret configured — parse body directly (dev mode)
        event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        logger.warn("Stripe webhook received WITHOUT signature verification");
      }

      logger.info("Stripe webhook received", {
        type: event.type,
        id: event.id,
      });

      // ── 2. Handle checkout.session.completed ─────────────────────────────
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { orderId, walletAddress, kairosAmount } = session.metadata || {};

        if (!orderId || !walletAddress || !kairosAmount) {
          logger.warn("Stripe checkout completed but missing metadata", {
            sessionId: session.id,
            metadata: session.metadata,
          });
          return res.json({ received: true, action: "skipped_missing_metadata" });
        }

        // ── 3. Update fiat order status ──────────────────────────────────
        const fiatOrder = db.getFiatOrder(orderId);
        if (!fiatOrder) {
          logger.warn("Stripe order not found in database", { orderId });
          return res.json({ received: true, action: "order_not_found" });
        }

        if (fiatOrder.status === "COMPLETED") {
          logger.info("Stripe order already processed", { orderId });
          return res.json({ received: true, action: "already_processed" });
        }

        db.updateFiatOrder(orderId, {
          status: "MINTING",
          providerOrderId: session.id,
        });

        // ── 4. Auto-mint KAIROS to user wallet ──────────────────────────
        const mintAmount = parseFloat(kairosAmount);
        logger.info("Auto-minting KAIROS from Stripe payment", {
          orderId,
          walletAddress,
          amount: mintAmount,
        });

        try {
          const result = await blockchain.mint(walletAddress, mintAmount);

          db.updateFiatOrder(orderId, {
            status: "COMPLETED",
            kairosAmount: String(mintAmount),
            txHash: result.txHash,
          });

          // Record reserve increase
          db.recordReserveChange({
            type: "deposit",
            amount: String(mintAmount),
            asset: "USD",
            source: "stripe",
            reference: session.id,
            notes: `Stripe payment $${mintAmount} → ${mintAmount} KAIROS to ${walletAddress}`,
          });

          logger.info("Stripe auto-mint SUCCESS", {
            orderId,
            walletAddress,
            amount: mintAmount,
            txHash: result.txHash,
            elapsed: Date.now() - startTime,
          });
        } catch (mintErr) {
          db.updateFiatOrder(orderId, {
            status: "MINT_FAILED",
            notes: mintErr.message,
          });

          logger.error("Stripe auto-mint FAILED", {
            orderId,
            walletAddress,
            amount: mintAmount,
            error: mintErr.message,
          });
        }
      }

      // ── Handle other events (optional) ─────────────────────────────────
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const { orderId } = session.metadata || {};
        if (orderId) {
          db.updateFiatOrder(orderId, { status: "EXPIRED" });
          logger.info("Stripe checkout expired", { orderId });
        }
      }

      res.json({ received: true });
    } catch (err) {
      logger.error("Stripe webhook processing error", {
        error: err.message,
        stack: err.stack,
        elapsed: Date.now() - startTime,
      });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

module.exports = router;
