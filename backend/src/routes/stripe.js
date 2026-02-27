// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Stripe Routes
//
//  POST /api/stripe/create-checkout  — Create a Stripe Checkout Session
//  GET  /api/stripe/config           — Return Stripe publishable key
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const config = require("../config");
const logger = require("../utils/logger");
const db = require("../services/database");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Lazy-init Stripe SDK
let stripe;
function getStripe() {
  if (!stripe) {
    if (!config.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = require("stripe")(config.stripeSecretKey);
  }
  return stripe;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/stripe/config — Publishable key for frontend
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/config", (req, res) => {
  if (!config.stripePublishableKey || !config.stripeSecretKey) {
    return res.json({ configured: false, message: "Stripe payments coming soon" });
  }
  res.json({ configured: true, publishableKey: config.stripePublishableKey });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/stripe/create-checkout — Create Checkout Session for KAIROS purchase
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/create-checkout", async (req, res) => {
  try {
    const { walletAddress, amount, currency = "usd" } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    const errors = [];

    if (!walletAddress) {
      errors.push("'walletAddress' is required");
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.push("'amount' must be a positive number (USD)");
    } else if (numAmount < 10) {
      errors.push("Minimum purchase is $10 USD");
    } else if (numAmount > 50000) {
      errors.push("Maximum single purchase is $50,000 USD");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // ── Create internal fiat order ────────────────────────────────────────
    const orderId = uuidv4();
    db.createFiatOrder({
      id: orderId,
      provider: "stripe",
      walletAddress,
      fiatAmount: String(numAmount),
      fiatCurrency: currency.toUpperCase(),
      paymentMethod: "card",
    });

    // ── Create Stripe Checkout Session ────────────────────────────────────
    const s = getStripe();
    const session = await s.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${numAmount} KAIROS`,
              description: `Purchase ${numAmount} KairosCoin (1 KAIROS = 1 USD)`,
            },
            unit_amount: Math.round(numAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId,
        walletAddress,
        kairosAmount: String(numAmount),
      },
      success_url: `https://kairos-777.com/buy.html?success=true&order=${orderId}`,
      cancel_url: `https://kairos-777.com/buy.html?canceled=true`,
    });

    // Update order with Stripe session ID
    db.updateFiatOrder(orderId, { providerOrderId: session.id });

    logger.info("Stripe checkout session created", {
      orderId,
      sessionId: session.id,
      walletAddress,
      amount: numAmount,
    });

    res.json({
      success: true,
      order: {
        id: orderId,
        amount: numAmount,
        currency: currency.toUpperCase(),
      },
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    logger.error("Failed to create Stripe checkout", { error: err.message });
    res.status(500).json({ error: "Failed to create checkout session", message: err.message });
  }
});

module.exports = router;
