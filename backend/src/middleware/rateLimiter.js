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
    error: "Too many requests",
    message: "Rate limit exceeded. Try again later.",
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
    error: "Too many mint/burn requests",
    message: "Maximum 30 mint/burn operations per hour",
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
    error: "Too many requests",
    message: "Rate limit exceeded. Slow down.",
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

module.exports = {
  generalLimiter,
  mintBurnLimiter,
  publicLimiter,
  healthLimiter,
};
