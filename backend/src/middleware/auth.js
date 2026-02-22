// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Authentication Middleware
//  Two-tier API key system: Master (admin) & Public (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

const config = require("../config");
const logger = require("../utils/logger");

/**
 * Require Master API key for destructive operations (mint/burn).
 */
function requireMasterKey(req, res, next) {
  const key = extractApiKey(req);

  if (!key) {
    logger.warn("Auth failed: No API key provided", { ip: req.ip, path: req.path });
    return res.status(401).json({
      error: "Authentication required",
      message: "Provide API key via Authorization header (Bearer <key>) or X-API-Key header",
    });
  }

  if (key !== config.apiMasterKey) {
    logger.warn("Auth failed: Invalid master key", { ip: req.ip, path: req.path });
    return res.status(403).json({
      error: "Forbidden",
      message: "Invalid API key for this operation",
    });
  }

  req.apiKeyType = "master";
  next();
}

/**
 * Require at least Public API key for read operations.
 */
function requirePublicKey(req, res, next) {
  const key = extractApiKey(req);

  if (!key) {
    logger.warn("Auth failed: No API key provided", { ip: req.ip, path: req.path });
    return res.status(401).json({
      error: "Authentication required",
      message: "Provide API key via Authorization header (Bearer <key>) or X-API-Key header",
    });
  }

  if (key !== config.apiMasterKey && key !== config.apiPublicKey) {
    logger.warn("Auth failed: Invalid key", { ip: req.ip, path: req.path });
    return res.status(403).json({ error: "Forbidden", message: "Invalid API key" });
  }

  req.apiKeyType = key === config.apiMasterKey ? "master" : "public";
  next();
}

/**
 * Optional auth — allows unauthenticated access but tags the request.
 */
function optionalAuth(req, res, next) {
  const key = extractApiKey(req);
  if (key === config.apiMasterKey) req.apiKeyType = "master";
  else if (key === config.apiPublicKey) req.apiKeyType = "public";
  else req.apiKeyType = "anonymous";
  next();
}

/**
 * Extract API key from various sources.
 */
function extractApiKey(req) {
  // 1. Authorization: Bearer <key>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. X-API-Key header
  if (req.headers["x-api-key"]) {
    return req.headers["x-api-key"];
  }

  // 3. Query parameter (for simple testing only)
  if (req.query.api_key) {
    return req.query.api_key;
  }

  return null;
}

module.exports = { requireMasterKey, requirePublicKey, optionalAuth };
