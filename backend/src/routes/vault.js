// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Vault Routes
//  REST API for the KAIROS Liquidity Vault
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const vaultEngine = require("../services/vaultEngine");
const logger = require("../utils/logger");

// ── Middleware: require wallet address ────────────────────────────────────────
function requireWallet(req, res, next) {
  const wallet = req.body?.wallet || req.query?.wallet;
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: "Valid wallet address required" });
  }
  req.wallet = wallet.toLowerCase();
  next();
}

// ═════════════════════════════════════════════════════════════════════════════
//                           PUBLIC ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/vault/info
 * Global vault metrics: TVL, APY, price per share, etc.
 */
router.get("/info", (req, res) => {
  try {
    const info = vaultEngine.getVaultInfo();
    res.json(info);
  } catch (err) {
    logger.error("Vault info error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vault/leaderboard
 * Top vault depositors (liquidity providers)
 */
router.get("/leaderboard", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const leaderboard = vaultEngine.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (err) {
    logger.error("Leaderboard error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vault/epochs
 * Fee distribution epoch history
 */
router.get("/epochs", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const epochs = vaultEngine.getEpochHistory(limit);
    res.json(epochs);
  } catch (err) {
    logger.error("Epochs error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//                        WALLET-AUTHENTICATED ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/vault/account?wallet=0x...
 * User's vault position: shares, value, earned, cooldown
 */
router.get("/account", requireWallet, (req, res) => {
  try {
    const userInfo = vaultEngine.getUserVaultInfo(req.wallet);
    res.json(userInfo);
  } catch (err) {
    logger.error("Vault account error", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vault/deposit
 * Body: { wallet, amount }
 * Deposit KAIROS into the vault and receive kKAIROS shares
 */
router.post("/deposit", requireWallet, (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const result = vaultEngine.deposit(req.wallet, amount);
    res.json(result);
  } catch (err) {
    logger.error("Vault deposit error", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/vault/withdraw
 * Body: { wallet, shares }
 * Burn kKAIROS shares and receive KAIROS + yield
 */
router.post("/withdraw", requireWallet, (req, res) => {
  try {
    const shares = parseFloat(req.body.shares);
    if (!shares || shares <= 0 || isNaN(shares)) {
      return res.status(400).json({ error: "Valid shares amount required" });
    }

    const result = vaultEngine.withdraw(req.wallet, shares);
    res.json(result);
  } catch (err) {
    logger.error("Vault withdraw error", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/vault/distribute-fees
 * Body: { totalFees }
 * Called by margin engine or admin to distribute trading fees
 */
router.post("/distribute-fees", (req, res) => {
  try {
    const totalFees = parseFloat(req.body.totalFees);
    if (!totalFees || totalFees <= 0 || isNaN(totalFees)) {
      return res.status(400).json({ error: "Valid totalFees required" });
    }

    const result = vaultEngine.distributeFees(totalFees);
    res.json(result);
  } catch (err) {
    logger.error("Fee distribution error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
