// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Stripe Webhook Handler
//
//  POST /api/webhook/stripe — Receives Stripe events
//
//  Handles:
//    • checkout.session.completed → Auto-mint KAIROS to wallet  (BUY)
//    • checkout.session.expired   → Mark order expired
//    • account.updated            → Stripe Connect onboarding status
//    • payout.paid                → Redemption payout completed  (SELL)
//    • payout.failed              → Redemption payout failed
//    • transfer.created           → Transfer to connected account logged
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

      // ── Handle checkout expired ────────────────────────────────────────
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const { orderId } = session.metadata || {};
        if (orderId) {
          db.updateFiatOrder(orderId, { status: "EXPIRED" });
          logger.info("Stripe checkout expired", { orderId });
        }
      }

      // ══════════════════════════════════════════════════════════════════
      //  STRIPE CONNECT EVENTS — Redemption payouts (SELL flow)
      // ══════════════════════════════════════════════════════════════════

      // ── account.updated — User completed or updated Connect onboarding ──
      if (event.type === "account.updated") {
        const account = event.data.object;
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        logger.info("Stripe Connect account updated", {
          accountId: account.id,
          payoutsEnabled,
          detailsSubmitted,
        });

        // Update redemption account status if payouts just got enabled
        if (payoutsEnabled) {
          try {
            const dbAccount = db.getDb().prepare(
              "SELECT * FROM redemption_accounts WHERE stripe_account_id = ?"
            ).get(account.id);
            if (dbAccount) {
              db.updateRedemptionAccountStatus(dbAccount.wallet_address, "ACTIVE");
              logger.info("Redemption account activated", {
                wallet: dbAccount.wallet_address,
                stripeAccountId: account.id,
              });
            }
          } catch (err) {
            logger.error("Error updating redemption account status", { error: err.message });
          }
        }
      }

      // ── payout.paid — Payout successfully delivered to user's bank ──
      if (event.type === "payout.paid") {
        const payout = event.data.object;
        logger.info("Stripe payout PAID", {
          payoutId: payout.id,
          amount: payout.amount / 100,
          currency: payout.currency,
          arrival: payout.arrival_date,
          method: payout.method,
        });

        // Find and update the redemption linked to this payout
        try {
          const redemption = db.getDb().prepare(
            "SELECT * FROM redemptions WHERE payout_id = ?"
          ).get(payout.id);
          if (redemption) {
            db.updateRedemption(redemption.id, { status: "COMPLETED" });
            logger.info("Redemption marked COMPLETED via webhook", {
              redemptionId: redemption.id,
              payoutId: payout.id,
            });
          }
        } catch (err) {
          logger.error("Error updating redemption from payout.paid", { error: err.message });
        }
      }

      // ── payout.failed — Payout failed (insufficient funds, bad account, etc.) ──
      if (event.type === "payout.failed") {
        const payout = event.data.object;
        logger.error("Stripe payout FAILED", {
          payoutId: payout.id,
          amount: payout.amount / 100,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        });

        try {
          const redemption = db.getDb().prepare(
            "SELECT * FROM redemptions WHERE payout_id = ?"
          ).get(payout.id);
          if (redemption) {
            db.updateRedemption(redemption.id, {
              status: "PAYOUT_FAILED",
              error: `${payout.failure_code}: ${payout.failure_message}`,
            });
            logger.error("Redemption marked PAYOUT_FAILED", {
              redemptionId: redemption.id,
              payoutId: payout.id,
              failureCode: payout.failure_code,
            });
          }
        } catch (err) {
          logger.error("Error updating redemption from payout.failed", { error: err.message });
        }
      }

      // ── transfer.created — Transfer sent to connected account ──
      if (event.type === "transfer.created") {
        const transfer = event.data.object;
        logger.info("Stripe transfer created", {
          transferId: transfer.id,
          amount: transfer.amount / 100,
          destination: transfer.destination,
        });
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
