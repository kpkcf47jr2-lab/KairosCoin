// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — JWT Authentication Middleware
//  Validates Bearer tokens on protected routes
// ═══════════════════════════════════════════════════════════════════════════════

const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Require valid JWT token. Attaches req.user with { userId, email, role }
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = authService.verifyToken(token);
    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, error: 'Invalid token type' });
    }

    // Verify session still exists
    if (!authService.validateSession(token)) {
      return res.status(401).json({ success: false, error: 'Session expired or revoked' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({ success: false, error: err.message });
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt by ${req.user.email}`);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Optional auth — attaches req.user if valid token present, but doesn't block
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = authService.verifyToken(token);
    if (decoded.type === 'access' && authService.validateSession(token)) {
      req.user = decoded;
      req.token = token;
    }
  } catch (err) {
    // Silently continue without auth
  }
  next();
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
