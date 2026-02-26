// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Authentication Routes
//  POST /api/auth/register    — Create account
//  POST /api/auth/login       — Login (returns JWT + 2FA challenge if enabled)
//  POST /api/auth/verify-2fa  — Complete 2FA verification
//  POST /api/auth/refresh     — Refresh access token
//  GET  /api/auth/me          — Get current user profile
//  POST /api/auth/logout      — Revoke current session
//  POST /api/auth/logout-all  — Revoke all sessions
//  ── 2FA Management ──
//  POST /api/auth/2fa/setup   — Generate 2FA QR code
//  POST /api/auth/2fa/verify  — Verify TOTP code and enable 2FA  
//  POST /api/auth/2fa/disable — Disable 2FA
//  ── Security ──
//  POST /api/auth/change-password — Change password
//  GET  /api/auth/sessions    — Active sessions
//  GET  /api/auth/log         — Auth audit log
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const referralService = require('../services/referralService');
const { requireAuth, requireAdmin } = require('../middleware/jwtAuth');
const { requireMasterKey } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Rate Limiters ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,                    // 25 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Try again in 15 minutes.',
  },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 attempts per hour
  message: {
    success: false,
    error: 'Too many attempts. Try again later.',
  },
});

// ── Helper ───────────────────────────────────────────────────────────────────
function getClientInfo(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  POST /register
// ═════════════════════════════════════════════════════════════════════════════

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, walletAddress, encryptedKey, referralCode } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const result = await authService.register({
      email, password, name, walletAddress, encryptedKey, ip, userAgent,
    });

    // Process referral rewards after successful registration
    let referralData = { signupBonus: null, referral: null };
    try {
      // 1. Signup bonus: 100 KAIROS
      referralData.signupBonus = referralService.processSignupBonus(result.user.id, email);

      // 2. Referral reward: 20 KAIROS to referrer
      if (referralCode) {
        referralData.referral = referralService.processReferral(result.user.id, email, referralCode);
      }

      // 3. Auto-generate referral code for new user
      const codeData = referralService.getOrCreateCode(result.user.id);
      referralData.myCode = codeData.code;
    } catch (refErr) {
      logger.warn('Referral processing error (non-fatal)', { error: refErr.message });
    }

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        referral: referralData,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /login
// ═════════════════════════════════════════════════════════════════════════════

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const result = await authService.login({ email, password, totpCode, ip, userAgent });

    // 2FA required
    if (result.requires2FA) {
      return res.json({
        success: true,
        requires2FA: true,
        tempToken: result.tempToken,
      });
    }

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /verify-2fa — Complete login when 2FA is enabled
// ═════════════════════════════════════════════════════════════════════════════

router.post('/verify-2fa', authLimiter, async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) {
      return res.status(400).json({ success: false, error: 'tempToken and totpCode required' });
    }

    const decoded = authService.verifyToken(tempToken);
    if (decoded.type !== '2fa_pending') {
      return res.status(401).json({ success: false, error: 'Invalid temp token' });
    }

    const user = authService.getUser(decoded.userId);
    const { ip, userAgent } = getClientInfo(req);

    // Re-login with TOTP code (password already verified)
    // We need to build the token directly
    const result = await authService.login({
      email: user.email,
      password: null,
      totpCode,
      ip,
      userAgent,
      _skipPassword: true,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /refresh — Refresh access token
// ═════════════════════════════════════════════════════════════════════════════

router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refreshToken required' });
    }

    const tokens = authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  GET /me — Current user profile
// ═════════════════════════════════════════════════════════════════════════════

router.get('/me', requireAuth, (req, res) => {
  try {
    const user = authService.getUser(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /logout — Revoke current session
// ═════════════════════════════════════════════════════════════════════════════

router.post('/logout', requireAuth, (req, res) => {
  try {
    // Just revoke all sessions for simplicity
    authService.revokeAllSessions(req.user.userId);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /logout-all — Revoke ALL sessions (security measure)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/logout-all', requireAuth, (req, res) => {
  try {
    authService.revokeAllSessions(req.user.userId);
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  2FA MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const result = await authService.generate2FAQRCode(req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.post('/2fa/verify', requireAuth, (req, res) => {
  try {
    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ success: false, error: 'totpCode required' });

    const result = authService.verify2FASetup(req.user.userId, totpCode);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.post('/2fa/disable', requireAuth, strictLimiter, (req, res) => {
  try {
    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ success: false, error: 'totpCode required' });

    const result = authService.disable2FA(req.user.userId, totpCode);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  SECURITY
// ═════════════════════════════════════════════════════════════════════════════

router.post('/change-password', requireAuth, strictLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both passwords required' });
    }

    const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.get('/sessions', requireAuth, (req, res) => {
  try {
    const sessions = authService.getUserSessions(req.user.userId);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/log', requireAuth, (req, res) => {
  try {
    const log = authService.getAuthLog(req.user.userId, 50);
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /admin/reset-password — Force reset any user's password (master key)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/admin/reset-password', requireMasterKey, async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const result = await authService.forceResetPassword(email, newPassword);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /admin/unlock — Unlock a locked account (master key, NO rate limiter)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/admin/unlock', requireMasterKey, (req, res) => {
  try {
    const { email } = req.body;
    const result = authService.unlockAccount(email);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  POST /update-key — Migrate encrypted key (legacy btoa → AES-256-GCM)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/update-key', requireAuth, (req, res) => {
  try {
    const { encryptedKey } = req.body;
    if (!encryptedKey || !encryptedKey.startsWith('v1:')) {
      return res.status(400).json({ success: false, error: 'Invalid encrypted key format' });
    }
    const db = require('../services/database').getAuthDb();
    db.prepare('UPDATE users SET encrypted_key = ? WHERE id = ?').run(encryptedKey, req.user.id);
    res.json({ success: true, message: 'Key updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  CROSS-APP INTEGRATION (Wallet ↔ Trade)
// ═════════════════════════════════════════════════════════════════════════════

// POST /cross-app-token — Generate a 60s token to pass to the other app
router.post('/cross-app-token', requireAuth, (req, res) => {
  try {
    const { target } = req.body; // 'wallet' or 'trade'
    if (!target || !['wallet', 'trade'].includes(target)) {
      return res.status(400).json({ success: false, error: 'target must be "wallet" or "trade"' });
    }

    const token = authService.generateCrossAppToken(req.user.userId, target);
    res.json({ success: true, data: { crossAppToken: token, expiresIn: 60 } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /exchange-token — Exchange a cross-app token for a full session
router.post('/exchange-token', authLimiter, async (req, res) => {
  try {
    const { crossAppToken } = req.body;
    if (!crossAppToken) {
      return res.status(400).json({ success: false, error: 'crossAppToken required' });
    }

    const { ip, userAgent } = getClientInfo(req);
    const result = authService.exchangeCrossAppToken(crossAppToken, ip, userAgent);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

module.exports = router;
