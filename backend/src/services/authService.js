// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Authentication Service
//  bcrypt password hashing • JWT tokens • TOTP 2FA • Brute force protection
//  Security level: Banking-grade
// ═══════════════════════════════════════════════════════════════════════════════

const Database = require('libsql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

// ── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES = '24h';
const JWT_REFRESH_EXPIRES = '7d';
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes lockout
const ADMIN_EMAILS = ['info@kairos-777.com'];
const ADMIN_WALLET = '0xCee44904A6aA94dEa28754373887E07D4B6f4968'; // Owner wallet — fee recipient

let db = null;

// ═════════════════════════════════════════════════════════════════════════════
//                           INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function connectDb() {
  if (config.tursoAuthUrl && config.tursoAuthToken) {
    db = new Database(config.tursoAuthUrl, { authToken: config.tursoAuthToken });
    logger.info(`Auth DB connected to Turso cloud: ${config.tursoAuthUrl}`);
  } else {
    const dbDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(path.join(dbDir, 'kairos_auth.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
}

/**
 * Auto-reconnect wrapper: catches Turso "stream not found" errors,
 * reconnects, and retries the operation once.
 */
function withReconnect(fn) {
  try {
    return fn(db);
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('stream not found') || msg.includes('STREAM_EXPIRED') || msg.includes('Hrana')) {
      logger.warn('🔄 Turso stream expired — reconnecting auth DB...');
      try { db.close(); } catch {}
      connectDb();
      return fn(db);  // retry once
    }
    throw err;
  }
}

function initialize() {
  connectDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      wallet_address TEXT,
      encrypted_key TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      plan TEXT NOT NULL DEFAULT 'free',
      totp_secret TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login TEXT,
      last_ip TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      email TEXT,
      action TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_auth_log_user ON auth_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_log_created ON auth_log(created_at);
  `);

  // Clean expired sessions every hour
  setInterval(cleanExpiredSessions, 60 * 60 * 1000);
  cleanExpiredSessions();

  // ── Ensure admin account always has the correct owner wallet ──
  try {
    for (const adminEmail of ADMIN_EMAILS) {
      const admin = db.prepare('SELECT id, wallet_address FROM users WHERE email = ?').get(adminEmail);
      if (admin && admin.wallet_address !== ADMIN_WALLET) {
        db.prepare('UPDATE users SET wallet_address = ?, encrypted_key = \'\', updated_at = ? WHERE id = ?')
          .run(ADMIN_WALLET, new Date().toISOString(), admin.id);
        logger.info(`👑 Admin wallet linked: ${adminEmail} → ${ADMIN_WALLET}`);
      }
    }
  } catch (err) {
    logger.warn('Admin wallet migration skipped:', err.message);
  }

  logger.info('🔐 Auth service initialized (bcrypt + JWT + TOTP)');
}

// ═════════════════════════════════════════════════════════════════════════════
//                           REGISTER
// ═════════════════════════════════════════════════════════════════════════════

async function register({ email, password, name, walletAddress, encryptedKey, ip, userAgent }) {
  if (!email || !password || !name) {
    throw new AuthError('Email, password and name are required', 400);
  }
  if (password.length < 8) {
    throw new AuthError('Password must be at least 8 characters', 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError('Invalid email format', 400);
  }

  // Check existing
  const existing = withReconnect(() => db.prepare('SELECT id FROM users WHERE email = ?').get(email));
  if (existing) {
    throw new AuthError('Email already registered', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Determine role
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const role = isAdmin ? 'admin' : 'user';
  const displayName = isAdmin ? 'Kairos 777 Inc' : name;
  const plan = isAdmin ? 'enterprise' : 'free';

  // Admin accounts always use the owner wallet (externally managed)
  const finalWalletAddress = isAdmin ? ADMIN_WALLET : (walletAddress || '');
  const finalEncryptedKey = isAdmin ? '' : (encryptedKey || '');

  const userId = crypto.randomUUID();

  withReconnect(() => db.prepare(`
    INSERT INTO users (id, email, name, password_hash, wallet_address, encrypted_key, role, plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email.toLowerCase(), displayName, passwordHash, finalWalletAddress, finalEncryptedKey, role, plan));

  logAuth(userId, email, 'register', ip, userAgent, true);

  // Generate tokens
  const tokens = generateTokens(userId, email, role);
  saveSession(userId, tokens.accessToken, ip, userAgent);

  logger.info(`✅ New user registered: ${email} (${role})`);

  return {
    user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)),
    ...tokens,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                           LOGIN
// ═════════════════════════════════════════════════════════════════════════════

async function login({ email, password, totpCode, ip, userAgent, _skipPassword }) {
  if (!email || (!password && !_skipPassword)) {
    throw new AuthError('Email and password are required', 400);
  }

  const user = withReconnect(() => db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()));
  if (!user) {
    logAuth(null, email, 'login_failed', ip, userAgent, false, 'User not found');
    throw new AuthError('Invalid email or password', 401);
  }

  // Check lockout
  if (user.locked_until) {
    const lockExpiry = new Date(user.locked_until).getTime();
    if (Date.now() < lockExpiry) {
      const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
      logAuth(user.id, email, 'login_locked', ip, userAgent, false, `Account locked for ${minutesLeft} min`);
      throw new AuthError(`Account locked. Try again in ${minutesLeft} minutes`, 423);
    }
    // Lock expired, reset
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  }

  // Verify password (skip if coming from 2FA verify flow)
  if (!_skipPassword) {
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_attempts + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_TIME_MS).toISOString();
        db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
          .run(attempts, lockUntil, user.id);
        logAuth(user.id, email, 'login_locked', ip, userAgent, false, `Locked after ${attempts} attempts`);
        throw new AuthError('Too many failed attempts. Account locked for 15 minutes', 423);
      }
      db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
      logAuth(user.id, email, 'login_failed', ip, userAgent, false, `Wrong password (attempt ${attempts}/${MAX_LOGIN_ATTEMPTS})`);
      throw new AuthError('Invalid email or password', 401);
    }
  }

  // Check 2FA if enabled
  if (user.totp_enabled) {
    if (!totpCode) {
      return { requires2FA: true, tempToken: generateTempToken(user.id) };
    }
    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!verified) {
      logAuth(user.id, email, '2fa_failed', ip, userAgent, false, 'Invalid TOTP code');
      throw new AuthError('Invalid 2FA code', 401);
    }
  }

  // Success — reset attempts, update last login
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = ?, last_ip = ?, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), ip, new Date().toISOString(), user.id);

  const tokens = generateTokens(user.id, user.email, user.role);
  saveSession(user.id, tokens.accessToken, ip, userAgent);

  logAuth(user.id, email, 'login', ip, userAgent, true);
  logger.info(`✅ Login: ${email} from ${ip}`);

  return {
    user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)),
    ...tokens,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                           2FA MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

function generate2FASecret(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AuthError('User not found', 404);
  if (user.totp_enabled) throw new AuthError('2FA is already enabled', 400);

  const secret = speakeasy.generateSecret({
    name: `Kairos Trade (${user.email})`,
    issuer: 'Kairos 777 Inc',
    length: 32,
  });

  // Store secret temporarily (not enabled yet)
  db.prepare('UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?')
    .run(secret.base32, new Date().toISOString(), userId);

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

async function generate2FAQRCode(userId) {
  const { otpauthUrl } = generate2FASecret(userId);
  const qrCode = await QRCode.toDataURL(otpauthUrl);
  return { qrCode, otpauthUrl };
}

function verify2FASetup(userId, totpCode) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AuthError('User not found', 404);
  if (!user.totp_secret) throw new AuthError('Generate 2FA secret first', 400);

  const verified = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: totpCode,
    window: 1,
  });

  if (!verified) throw new AuthError('Invalid verification code', 400);

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
  const backupHash = backupCodes.map(c => bcrypt.hashSync(c, 8));

  db.prepare('UPDATE users SET totp_enabled = 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), userId);

  logAuth(userId, user.email, '2fa_enabled', null, null, true);
  logger.info(`🔐 2FA enabled: ${user.email}`);

  return { enabled: true, backupCodes };
}

function disable2FA(userId, totpCode) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AuthError('User not found', 404);
  if (!user.totp_enabled) throw new AuthError('2FA is not enabled', 400);

  const verified = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: totpCode,
    window: 1,
  });

  if (!verified) throw new AuthError('Invalid 2FA code', 400);

  db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), userId);

  logAuth(userId, user.email, '2fa_disabled', null, null, true);
  return { disabled: true };
}

// ═════════════════════════════════════════════════════════════════════════════
//                           TOKEN MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

function generateTokens(userId, email, role) {
  const accessToken = jwt.sign(
    { userId, email, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { userId, email, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );

  return { accessToken, refreshToken };
}

function generateTempToken(userId) {
  return jwt.sign(
    { userId, type: '2fa_pending' },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
}

/**
 * Generate a short-lived cross-app token (60s) for Wallet ↔ Trade linking.
 * The receiving app exchanges this token for a full session.
 */
function generateCrossAppToken(userId, targetApp) {
  return jwt.sign(
    { userId, type: 'cross_app', target: targetApp },
    JWT_SECRET,
    { expiresIn: '60s' }
  );
}

/**
 * Exchange a cross-app token for a full session (access + refresh tokens).
 */
function exchangeCrossAppToken(token, ip, userAgent) {
  const decoded = verifyToken(token);
  if (decoded.type !== 'cross_app') {
    throw new AuthError('Invalid cross-app token', 401);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
  if (!user) throw new AuthError('User not found', 404);

  const tokens = generateTokens(user.id, user.email, user.role);
  saveSession(user.id, tokens.accessToken, ip, userAgent);

  logAuth(user.id, user.email, 'cross_app_exchange', ip, userAgent, true, `target: ${decoded.target}`);
  logger.info(`🔗 Cross-app exchange: ${user.email} → ${decoded.target}`);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthError('Token expired', 401);
    }
    throw new AuthError('Invalid token', 401);
  }
}

function refreshAccessToken(refreshToken) {
  const decoded = verifyToken(refreshToken);
  if (decoded.type !== 'refresh') throw new AuthError('Invalid refresh token', 401);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
  if (!user) throw new AuthError('User not found', 404);

  return generateTokens(user.id, user.email, user.role);
}

// ═════════════════════════════════════════════════════════════════════════════
//                           SESSION MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

function saveSession(userId, token, ip, userAgent) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), userId, tokenHash, ip || '', userAgent || '', expiresAt);
}

function validateSession(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')").get(tokenHash);
  return !!session;
}

function revokeAllSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

function cleanExpiredSessions() {
  const result = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  if (result.changes > 0) logger.debug(`Cleaned ${result.changes} expired sessions`);
}

// ═════════════════════════════════════════════════════════════════════════════
//                           PASSWORD MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

async function changePassword(userId, currentPassword, newPassword) {
  if (newPassword.length < 8) throw new AuthError('Password must be at least 8 characters', 400);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AuthError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AuthError('Current password is incorrect', 401);

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(newHash, new Date().toISOString(), userId);

  // Revoke all sessions (force re-login)
  revokeAllSessions(userId);

  logAuth(userId, user.email, 'password_changed', null, null, true);
  return { changed: true };
}

// Admin force reset — requires master API key (no current password needed)
async function forceResetPassword(email, newPassword) {
  if (!email) throw new AuthError('Email is required', 400);
  if (!newPassword || newPassword.length < 8) throw new AuthError('Password must be at least 8 characters', 400);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new AuthError('User not found', 404);

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?')
    .run(newHash, new Date().toISOString(), user.id);

  revokeAllSessions(user.id);
  logAuth(user.id, user.email, 'admin_password_reset', null, null, true, 'Force reset by admin');
  logger.info(`🔑 Admin force reset password for ${email}`);
  return { reset: true, email: user.email };
}

// ═════════════════════════════════════════════════════════════════════════════
//                           USER QUERY
// ═════════════════════════════════════════════════════════════════════════════

function getUser(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AuthError('User not found', 404);
  return sanitizeUser(user);
}

function getUserSessions(userId) {
  return db.prepare("SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC").all(userId);
}

function getAuthLog(userId, limit = 20) {
  return db.prepare('SELECT * FROM auth_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}

// ═════════════════════════════════════════════════════════════════════════════
//                           HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    plan: user.plan || 'free',
    walletAddress: user.wallet_address || '',
    encryptedKey: user.encrypted_key || '',
    has2FA: !!user.totp_enabled,
    createdAt: user.created_at || '',
    lastLogin: user.last_login || '',
  };
}

function logAuth(userId, email, action, ip, userAgent, success, details = '') {
  try {
    db.prepare('INSERT INTO auth_log (user_id, email, action, ip, user_agent, success, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId || '', email || '', action, ip || '', userAgent || '', success ? 1 : 0, details);
  } catch (err) {
    logger.error('Auth log error:', err.message);
  }
}

// Custom error class
class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

function unlockAccount(email) {
  if (!email) throw new AuthError('Email is required', 400);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new AuthError('User not found', 404);
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), user.id);
  logAuth(user.id, user.email, 'admin_unlock', null, null, true, 'Account unlocked by admin');
  logger.info(`🔓 Admin unlocked account: ${email}`);
  return { unlocked: true, email: user.email };
}

module.exports = {
  initialize,
  register,
  login,
  verifyToken,
  refreshAccessToken,
  generate2FASecret,
  generate2FAQRCode,
  verify2FASetup,
  disable2FA,
  changePassword,
  forceResetPassword,
  unlockAccount,
  getUser,
  getUserSessions,
  getAuthLog,
  revokeAllSessions,
  validateSession,
  generateCrossAppToken,
  exchangeCrossAppToken,
  AuthError,
};
