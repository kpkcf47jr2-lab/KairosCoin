// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Rate Limiter
//  Protects mint/burn and public APIs from abuse
// ═══════════════════════════════════════════════════════════════════════════════

const rateLimit = require("express-rate-limit");
const config = require("../config");

// ── General API limiter (all routes) ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimitMax || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests",
    message: "Demasiadas solicitudes. Intenta más tarde.",
    retryAfter: "15 minutes",
  },
});

// ── Strict limiter for mint/burn operations ──────────────────────────────────
const mintBurnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 mint/burn ops per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
  message: {
    success: false,
    error: "Too many mint/burn requests",
    message: "Máximo 30 operaciones por hora.",
    retryAfter: "1 hour",
  },
});

// ── Public endpoints limiter ─────────────────────────────────────────────────
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests",
    message: "Demasiadas solicitudes. Espera un momento.",
    retryAfter: "1 minute",
  },
});

// ── Health check (very generous) ─────────────────────────────────────────────
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth routes limiter (brute-force protection) ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 min (login/register/2FA)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    // Skip rate limiting for admin endpoints authenticated with master key
    if (req.path.startsWith('/admin/') && req.headers['x-api-key']) return true;
    return false;
  },
  message: {
    success: false,
    error: "Too many requests",
    message: "Demasiadas solicitudes. Intenta más tarde.",
    retryAfter: "15 minutes",
  },
});

module.exports = {
  generalLimiter,
  mintBurnLimiter,
  publicLimiter,
  healthLimiter,
  authLimiter,
};
