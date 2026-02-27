// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Redemption Routes
//  KAIROS → USD via Stripe Connect
//
//  Endpoints:
//    POST /api/redeem/onboard        — Create Stripe Connect account (first time)
//    POST /api/redeem/onboard-link   — Get new onboarding link (if expired)
//    GET  /api/redeem/account-status — Check if onboarding is complete
//    POST /api/redeem/create         — Create redemption (burn KAIROS → send USD)
//    GET  /api/redeem/status/:id     — Check redemption status
//    GET  /api/redeem/history        — User's redemption history
//    GET  /api/redeem/balance        — Platform payout balance (admin)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const payouts = require("../services/payouts");
const blockchain = require("../services/blockchain");
const db = require("../services/database");
const logger = require("../utils/logger");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireWalletSignature } = require("../middleware/walletAuth");

const router = express.Router();

// ── POST /onboard — Create Stripe Connect Express account ────────────────────
router.post("/onboard", requireWalletSignature, async (req, res) => {
  try {
    const { walletAddress, email } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Valid wallet address required" });
    }

    // Check if user already has a connected account
    const existing = db.getRedemptionAccount(walletAddress);
    if (existing && existing.stripe_account_id) {
      // Check if onboarding is complete
      const status = await payouts.getAccountStatus(existing.stripe_account_id);
      if (status.payoutsEnabled) {
        return res.json({
          message: "Account already set up and ready",
          accountId: existing.stripe_account_id,
          ready: true,
        });
      }
      // Not complete — generate new onboarding link
      const url = await payouts.createOnboardingLink(
        existing.stripe_account_id,
        "https://kairos-wallet.netlify.app"
      );
      return res.json({
        message: "Complete your onboarding",
        accountId: existing.stripe_account_id,
        onboardingUrl: url,
        ready: false,
      });
    }

    // Create new account
    const result = await payouts.createConnectedAccount(
      walletAddress,
      email,
      "https://kairos-wallet.netlify.app"
    );

    // Save to DB
    db.saveRedemptionAccount(walletAddress, result.accountId, email);

    logger.info("Redemption onboarding started", {
      walletAddress,
      accountId: result.accountId,
    });

    res.json({
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
      ready: false,
    });
  } catch (err) {
    logger.error("Onboard error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /onboard-link — Generate new onboarding link ────────────────────────
router.post("/onboard-link", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const account = db.getRedemptionAccount(walletAddress);
    if (!account) {
      return res.status(404).json({ error: "No account found. Please onboard first." });
    }

    const url = await payouts.createOnboardingLink(
      account.stripe_account_id,
      "https://kairos-wallet.netlify.app"
    );

    res.json({ onboardingUrl: url });
  } catch (err) {
    logger.error("Onboard link error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /account-status — Check onboarding status ────────────────────────────
router.get("/account-status", async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) {
      return res.status(400).json({ error: "wallet query param required" });
    }

    const account = db.getRedemptionAccount(wallet);
    if (!account) {
      return res.json({ onboarded: false, ready: false });
    }

    const status = await payouts.getAccountStatus(account.stripe_account_id);

    res.json({
      onboarded: true,
      ready: status.payoutsEnabled,
      accountId: account.stripe_account_id,
      detailsSubmitted: status.detailsSubmitted,
      requirements: status.requirements,
      country: status.country,
      instantPayoutsSupported: status.instantPayoutsSupported,
    });
  } catch (err) {
    logger.error("Account status error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /create — Create redemption: burn KAIROS → send USD ─────────────────
router.post("/create", requireWalletSignature, async (req, res) => {
  try {
    const walletAddress = req.verifiedWallet; // Use verified wallet, not user-supplied
    const { amount, method } = req.body;
    const numAmount = parseFloat(amount);

    // Validate
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Valid wallet address required" });
    }
    if (!numAmount || numAmount < 10) {
      return res.status(400).json({ error: "Minimum redemption is $10" });
    }
    if (numAmount > 50000) {
      return res.status(400).json({ error: "Maximum redemption is $50,000" });
    }

    // Check Stripe Connect account
    const account = db.getRedemptionAccount(walletAddress);
    if (!account || !account.stripe_account_id) {
      return res.status(400).json({
        error: "No payout account found. Please complete onboarding first.",
        needsOnboarding: true,
      });
    }

    // Verify account is ready for payouts
    const accountStatus = await payouts.getAccountStatus(account.stripe_account_id);
    if (!accountStatus.payoutsEnabled) {
      return res.status(400).json({
        error: "Payout account not fully set up. Complete onboarding first.",
        needsOnboarding: true,
      });
    }

    // Check KAIROS balance
    const holderInfo = await blockchain.getHolderBalance(walletAddress);
    if (parseFloat(holderInfo.balance) < numAmount) {
      return res.status(400).json({
        error: `Insufficient KAIROS balance. You have ${holderInfo.balance} KAIROS, need ${numAmount}`,
      });
    }

    // Check platform balance
    const platformBalance = await payouts.getPlatformBalance();
    if (platformBalance.availableUSD < numAmount) {
      return res.status(400).json({
        error: "Insufficient platform balance for payout. Please try again later or reduce amount.",
      });
    }

    const redemptionId = uuidv4();
    const payoutMethod = method === "instant" ? "instant" : "standard";

    // Record redemption as PENDING
    db.createRedemption({
      id: redemptionId,
      walletAddress,
      amount: numAmount,
      method: payoutMethod,
      stripeAccountId: account.stripe_account_id,
    });

    logger.info("Redemption initiated", {
      redemptionId,
      walletAddress,
      amount: numAmount,
      method: payoutMethod,
    });

    // Step 1: Burn KAIROS tokens
    let burnResult;
    try {
      burnResult = await blockchain.burn(walletAddress, numAmount.toString());
      db.updateRedemption(redemptionId, {
        status: "BURNED",
        burnTxHash: burnResult.txHash,
      });
      logger.info("KAIROS burned for redemption", {
        redemptionId,
        burnTx: burnResult.txHash,
      });
    } catch (burnErr) {
      db.updateRedemption(redemptionId, {
        status: "BURN_FAILED",
        error: burnErr.message,
      });
      return res.status(500).json({
        error: "Failed to burn KAIROS. Redemption canceled.",
        details: burnErr.message,
      });
    }

    // Step 2: Send USD via Stripe Connect
    let payoutResult;
    try {
      payoutResult = await payouts.sendPayout(
        account.stripe_account_id,
        numAmount,
        redemptionId,
        payoutMethod
      );
      db.updateRedemption(redemptionId, {
        status: "PAYOUT_SENT",
        transferId: payoutResult.transferId,
        payoutId: payoutResult.payoutId,
        payoutMethod: payoutResult.method,
        arrival: payoutResult.arrival,
      });
      logger.info("Payout sent for redemption", {
        redemptionId,
        transferId: payoutResult.transferId,
        payoutId: payoutResult.payoutId,
        method: payoutResult.method,
      });
    } catch (payoutErr) {
      // KAIROS already burned but payout failed — CRITICAL, needs manual resolution
      db.updateRedemption(redemptionId, {
        status: "PAYOUT_FAILED",
        error: payoutErr.message,
      });
      logger.error("CRITICAL: KAIROS burned but payout failed!", {
        redemptionId,
        walletAddress,
        amount: numAmount,
        burnTx: burnResult.txHash,
        error: payoutErr.message,
      });
      return res.status(500).json({
        error: "KAIROS was burned but payout failed. Our team has been notified and will resolve this manually.",
        redemptionId,
        burnTxHash: burnResult.txHash,
      });
    }

    // Success
    res.json({
      success: true,
      redemptionId,
      amount: numAmount,
      burnTxHash: burnResult.txHash,
      payout: {
        method: payoutResult.method,
        status: payoutResult.status,
        arrival: payoutResult.arrival,
        transferId: payoutResult.transferId,
      },
      message:
        payoutResult.method === "instant"
          ? `$${numAmount} USD enviado instantáneamente a tu tarjeta de débito`
          : `$${numAmount} USD será depositado en tu banco en 1-2 días hábiles`,
    });
  } catch (err) {
    logger.error("Redemption error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /status/:id — Check redemption status ───────────────────────────────
router.get("/status/:id", async (req, res) => {
  try {
    const redemption = db.getRedemption(req.params.id);
    if (!redemption) {
      return res.status(404).json({ error: "Redemption not found" });
    }

    // If payout was sent, check latest status from Stripe
    let payoutStatus = null;
    if (redemption.payout_id && redemption.stripe_account_id) {
      try {
        payoutStatus = await payouts.getPayoutStatus(
          redemption.payout_id,
          redemption.stripe_account_id
        );
      } catch (_) {
        // Non-critical
      }
    }

    res.json({
      id: redemption.id,
      status: redemption.status,
      amount: redemption.amount,
      method: redemption.payout_method,
      burnTxHash: redemption.burn_tx_hash,
      payoutStatus: payoutStatus?.status || redemption.status,
      arrival: redemption.arrival,
      createdAt: redemption.created_at,
      error: redemption.error,
    });
  } catch (err) {
    logger.error("Redemption status error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /history — User's redemption history ─────────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const { wallet, limit } = req.query;
    if (!wallet) {
      return res.status(400).json({ error: "wallet query param required" });
    }

    const redemptions = db.getRedemptions(wallet, parseInt(limit) || 20);

    res.json({
      wallet,
      count: redemptions.length,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        method: r.payout_method,
        burnTxHash: r.burn_tx_hash,
        arrival: r.arrival,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    logger.error("Redemption history error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /balance — Platform payout balance (admin) ───────────────────────────
const { requireMasterKey } = require("../middleware/auth");
router.get("/balance", requireMasterKey, async (req, res) => {
  try {
    const balance = await payouts.getPlatformBalance();
    res.json(balance);
  } catch (err) {
    logger.error("Balance check error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
