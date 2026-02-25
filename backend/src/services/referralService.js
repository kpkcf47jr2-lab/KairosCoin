// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Referral Service
//  Sign-up bonus: 100 KAIROS  •  Referral reward: 20 KAIROS per invite
//  Tracked in SQLite  •  Rewards credited to margin/vault balance
// ═══════════════════════════════════════════════════════════════════════════════

const Database = require('libsql');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

// ── Constants ────────────────────────────────────────────────────────────────
const SIGNUP_BONUS = 100;        // 100 KAIROS for new sign-ups
const REFERRAL_REWARD = 20;      // 20 KAIROS per successful referral
const MAX_REFERRALS = 0;         // 0 = unlimited
const CODE_LENGTH = 8;           // Referral code length

let db = null;

// ═════════════════════════════════════════════════════════════════════════════
//                           INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize() {
  if (config.tursoAuthUrl && config.tursoAuthToken) {
    db = new Database(config.tursoAuthUrl, { authToken: config.tursoAuthToken });
    logger.info(`Referral DB connected to Turso cloud`);
  } else {
    const dbDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(path.join(dbDir, 'kairos_auth.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }

  db.exec(`
    -- ═══════════════════════════════════════════════════════════════════════
    --  REFERRAL CODES — One code per user
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS referral_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      total_referrals INTEGER NOT NULL DEFAULT 0,
      total_earned TEXT NOT NULL DEFAULT '0',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  REFERRALS — Track who referred whom
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL UNIQUE,
      referred_email TEXT NOT NULL,
      referral_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'rejected')),
      reward_amount TEXT NOT NULL DEFAULT '20',
      reward_paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  REWARD LOG — All bonus/referral reward credits
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS reward_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('signup_bonus', 'referral_reward', 'promo', 'manual')),
      amount TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
    CREATE INDEX IF NOT EXISTS idx_reward_log_user ON reward_log(user_id);
  `);

  logger.info('🎁 Referral service initialized');
}

// ═════════════════════════════════════════════════════════════════════════════
//                     GENERATE REFERRAL CODE
// ═════════════════════════════════════════════════════════════════════════════

function generateCode() {
  // Generate a short, memorable code like "KAI-A7B3F2"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return `KAI-${code}`;
}

function getOrCreateCode(userId) {
  let existing = db.prepare('SELECT * FROM referral_codes WHERE user_id = ?').get(userId);
  if (existing) return existing;

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while (
    db.prepare('SELECT id FROM referral_codes WHERE code = ?').get(code) && attempts < 10
  );

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO referral_codes (id, user_id, code) VALUES (?, ?, ?)
  `).run(id, userId, code);

  return db.prepare('SELECT * FROM referral_codes WHERE id = ?').get(id);
}

// ═════════════════════════════════════════════════════════════════════════════
//                     PROCESS SIGNUP BONUS
// ═════════════════════════════════════════════════════════════════════════════

function processSignupBonus(userId, email) {
  // Check if already received
  const existing = db.prepare(
    "SELECT id FROM reward_log WHERE user_id = ? AND type = 'signup_bonus'"
  ).get(userId);
  if (existing) return null;

  const rewardId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO reward_log (id, user_id, type, amount, description)
    VALUES (?, ?, 'signup_bonus', ?, ?)
  `).run(rewardId, userId, String(SIGNUP_BONUS), `Welcome bonus for ${email}`);

  logger.info(`🎁 Signup bonus: ${SIGNUP_BONUS} KAIROS credited to ${email}`);
  return { amount: SIGNUP_BONUS, rewardId };
}

// ═════════════════════════════════════════════════════════════════════════════
//                     PROCESS REFERRAL
// ═════════════════════════════════════════════════════════════════════════════

function processReferral(referredUserId, referredEmail, referralCode) {
  if (!referralCode) return null;

  // Find the referral code owner
  const codeRecord = db.prepare(
    'SELECT * FROM referral_codes WHERE code = ? AND is_active = 1'
  ).get(referralCode.toUpperCase());

  if (!codeRecord) {
    logger.warn(`Invalid referral code: ${referralCode}`);
    return null;
  }

  // Don't allow self-referral
  if (codeRecord.user_id === referredUserId) {
    logger.warn(`Self-referral attempt blocked for ${referredEmail}`);
    return null;
  }

  // Check if already referred
  const existing = db.prepare(
    'SELECT id FROM referrals WHERE referred_id = ?'
  ).get(referredUserId);
  if (existing) return null;

  // Check max referrals
  if (MAX_REFERRALS > 0 && codeRecord.total_referrals >= MAX_REFERRALS) {
    logger.warn(`Referral limit reached for code ${referralCode}`);
    return null;
  }

  const referralId = crypto.randomUUID();
  const rewardId = crypto.randomUUID();

  // Record the referral
  db.prepare(`
    INSERT INTO referrals (id, referrer_id, referred_id, referred_email, referral_code, reward_amount, reward_paid)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(referralId, codeRecord.user_id, referredUserId, referredEmail, referralCode.toUpperCase(), String(REFERRAL_REWARD));

  // Credit reward to referrer
  db.prepare(`
    INSERT INTO reward_log (id, user_id, type, amount, description, reference_id)
    VALUES (?, ?, 'referral_reward', ?, ?, ?)
  `).run(rewardId, codeRecord.user_id, String(REFERRAL_REWARD), `Referral reward: ${referredEmail} joined`, referralId);

  // Update referral code stats
  db.prepare(`
    UPDATE referral_codes
    SET total_referrals = total_referrals + 1,
        total_earned = CAST(CAST(total_earned AS REAL) + ? AS TEXT)
    WHERE id = ?
  `).run(REFERRAL_REWARD, codeRecord.id);

  logger.info(`🤝 Referral processed: ${referredEmail} via code ${referralCode} → ${REFERRAL_REWARD} KAIROS to referrer`);
  return { referrerId: codeRecord.user_id, amount: REFERRAL_REWARD, referralId };
}

// ═════════════════════════════════════════════════════════════════════════════
//                     QUERY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function getUserRewards(userId) {
  const rewards = db.prepare(
    'SELECT * FROM reward_log WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  const totalEarned = rewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return { rewards, totalEarned };
}

function getUserReferrals(userId) {
  const code = db.prepare('SELECT * FROM referral_codes WHERE user_id = ?').get(userId);
  const referrals = db.prepare(
    'SELECT id, referred_email, reward_amount, reward_paid, created_at FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC'
  ).all(userId);

  return {
    code: code?.code || null,
    totalReferrals: code?.total_referrals || 0,
    totalEarned: code?.total_earned || '0',
    referrals,
  };
}

function getGlobalStats() {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM reward_log WHERE type = 'signup_bonus'").get().c;
  const totalReferrals = db.prepare('SELECT COUNT(*) as c FROM referrals').get().c;
  const totalRewardsDistributed = db.prepare(
    'SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM reward_log'
  ).get().total;

  return {
    totalUsersRewarded: totalUsers,
    totalReferrals,
    totalRewardsDistributed: parseFloat(totalRewardsDistributed).toFixed(2),
    signupBonus: SIGNUP_BONUS,
    referralReward: REFERRAL_REWARD,
  };
}

function getLeaderboard(limit = 10) {
  return db.prepare(`
    SELECT rc.code, rc.total_referrals, rc.total_earned, u.name, u.email
    FROM referral_codes rc
    JOIN users u ON u.id = rc.user_id
    WHERE rc.total_referrals > 0
    ORDER BY rc.total_referrals DESC
    LIMIT ?
  `).all(limit);
}

// ═════════════════════════════════════════════════════════════════════════════
//                     VALIDATE CODE (public)
// ═════════════════════════════════════════════════════════════════════════════

function validateCode(code) {
  if (!code) return { valid: false };
  const record = db.prepare(
    'SELECT rc.code, rc.is_active, u.name FROM referral_codes rc JOIN users u ON u.id = rc.user_id WHERE rc.code = ?'
  ).get(code.toUpperCase());

  if (!record || !record.is_active) return { valid: false };
  return { valid: true, code: record.code, referrerName: record.name };
}

module.exports = {
  initialize,
  getOrCreateCode,
  processSignupBonus,
  processReferral,
  getUserRewards,
  getUserReferrals,
  getGlobalStats,
  getLeaderboard,
  validateCode,
  SIGNUP_BONUS,
  REFERRAL_REWARD,
};
