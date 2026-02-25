// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Referral Routes
//  Public + Auth-protected endpoints for referral program
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const referralService = require("../services/referralService");
const { requireAuth } = require("../middleware/jwtAuth");
const { requireMasterKey } = require("../middleware/auth");
const logger = require("../utils/logger");

// ═════════════════════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/referral/validate/:code — Check if a referral code is valid
router.get("/validate/:code", (req, res) => {
  try {
    const result = referralService.validateCode(req.params.code);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Validate referral code error", { error: err.message });
    res.status(500).json({ error: "Failed to validate code" });
  }
});

// GET /api/referral/stats — Global referral program stats
router.get("/stats", (req, res) => {
  try {
    const stats = referralService.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error("Referral stats error", { error: err.message });
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /api/referral/leaderboard — Top referrers
router.get("/leaderboard", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const leaderboard = referralService.getLeaderboard(limit);
    // Mask emails for privacy
    const masked = leaderboard.map((entry) => ({
      code: entry.code,
      name: entry.name,
      totalReferrals: entry.total_referrals,
      totalEarned: entry.total_earned,
    }));
    res.json({ success: true, data: masked });
  } catch (err) {
    logger.error("Leaderboard error", { error: err.message });
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH-PROTECTED ENDPOINTS (logged-in users)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/referral/my-code — Get or create user's referral code
router.get("/my-code", requireAuth, (req, res) => {
  try {
    const codeData = referralService.getOrCreateCode(req.user.userId);
    res.json({
      success: true,
      data: {
        code: codeData.code,
        totalReferrals: codeData.total_referrals,
        totalEarned: codeData.total_earned,
        shareUrl: `https://kairos-trade.netlify.app/?ref=${codeData.code}`,
      },
    });
  } catch (err) {
    logger.error("Get referral code error", { error: err.message });
    res.status(500).json({ error: "Failed to get referral code" });
  }
});

// GET /api/referral/my-referrals — List of people you've referred
router.get("/my-referrals", requireAuth, (req, res) => {
  try {
    const data = referralService.getUserReferrals(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("Get user referrals error", { error: err.message });
    res.status(500).json({ error: "Failed to get referrals" });
  }
});

// GET /api/referral/my-rewards — All rewards earned (signup + referral)
router.get("/my-rewards", requireAuth, (req, res) => {
  try {
    const data = referralService.getUserRewards(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("Get user rewards error", { error: err.message });
    res.status(500).json({ error: "Failed to get rewards" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/referral/admin/stats — Detailed admin stats (master key)
router.get("/admin/stats", requireMasterKey, (req, res) => {
  try {
    const stats = referralService.getGlobalStats();
    const leaderboard = referralService.getLeaderboard(20);
    res.json({ success: true, data: { ...stats, leaderboard } });
  } catch (err) {
    logger.error("Admin referral stats error", { error: err.message });
    res.status(500).json({ error: "Failed to get admin stats" });
  }
});

module.exports = router;
