// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Request Validators
//  Validates all inputs before they hit business logic
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");

/**
 * Validate mint request body.
 */
function validateMintRequest(req, res, next) {
  const { to, amount, reference, note } = req.body;

  const errors = [];

  // ── Address validation ───────────────────────────────────────────────────
  if (!to) {
    errors.push("'to' address is required");
  } else if (!ethers.isAddress(to)) {
    errors.push("'to' must be a valid Ethereum/BSC address");
  } else if (to === ethers.ZeroAddress) {
    errors.push("Cannot mint to zero address");
  }

  // ── Amount validation ────────────────────────────────────────────────────
  if (!amount) {
    errors.push("'amount' is required");
  } else {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push("'amount' must be a positive number");
    } else if (numAmount < 0.01) {
      errors.push("Minimum mint amount is 0.01 KAIROS");
    } else if (numAmount > 100_000_000) {
      errors.push("Maximum single mint is 100,000,000 KAIROS");
    }
    // Check for reasonable decimal places (max 18 for ERC20)
    const str = String(amount);
    if (str.includes(".") && str.split(".")[1].length > 18) {
      errors.push("Amount cannot exceed 18 decimal places");
    }
  }

  // ── Optional fields ──────────────────────────────────────────────────────
  if (reference && typeof reference !== "string") {
    errors.push("'reference' must be a string");
  }
  if (note && typeof note !== "string") {
    errors.push("'note' must be a string");
  }
  if (note && note.length > 500) {
    errors.push("'note' max length is 500 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  // Sanitize & normalize
  req.validatedData = {
    to: ethers.getAddress(to), // checksum
    amount: String(amount),
    reference: reference || null,
    note: note || null,
  };

  next();
}

/**
 * Validate burn request body.
 */
function validateBurnRequest(req, res, next) {
  const { from, amount, reference, note } = req.body;

  const errors = [];

  // ── Address validation ───────────────────────────────────────────────────
  if (!from) {
    errors.push("'from' address is required");
  } else if (!ethers.isAddress(from)) {
    errors.push("'from' must be a valid Ethereum/BSC address");
  } else if (from === ethers.ZeroAddress) {
    errors.push("Cannot burn from zero address");
  }

  // ── Amount validation ────────────────────────────────────────────────────
  if (!amount) {
    errors.push("'amount' is required");
  } else {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push("'amount' must be a positive number");
    } else if (numAmount < 0.01) {
      errors.push("Minimum burn amount is 0.01 KAIROS");
    } else if (numAmount > 100_000_000) {
      errors.push("Maximum single burn is 100,000,000 KAIROS");
    }
    const str = String(amount);
    if (str.includes(".") && str.split(".")[1].length > 18) {
      errors.push("Amount cannot exceed 18 decimal places");
    }
  }

  if (reference && typeof reference !== "string") {
    errors.push("'reference' must be a string");
  }
  if (note && typeof note !== "string") {
    errors.push("'note' must be a string");
  }
  if (note && note.length > 500) {
    errors.push("'note' max length is 500 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  req.validatedData = {
    from: ethers.getAddress(from),
    amount: String(amount),
    reference: reference || null,
    note: note || null,
  };

  next();
}

/**
 * Validate reserve update request.
 */
function validateReserveUpdate(req, res, next) {
  const { type, amount, currency, institution, reference, note } = req.body;

  const errors = [];

  const validTypes = ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "ADJUSTMENT"];
  if (!type || !validTypes.includes(type)) {
    errors.push(`'type' must be one of: ${validTypes.join(", ")}`);
  }

  if (!amount) {
    errors.push("'amount' is required");
  } else {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      errors.push("'amount' must be a non-zero number");
    }
  }

  const validCurrencies = ["USD", "USDT", "USDC", "BUSD", "T-BILL"];
  if (currency && !validCurrencies.includes(currency)) {
    errors.push(`'currency' must be one of: ${validCurrencies.join(", ")}`);
  }

  if (institution && typeof institution !== "string") {
    errors.push("'institution' must be a string");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  req.validatedData = {
    type,
    amount: String(amount),
    currency: currency || "USD",
    institution: institution || null,
    reference: reference || null,
    note: note || null,
  };

  next();
}

/**
 * Validate pagination query params.
 */
function validatePagination(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(200, Math.max(1, limit)),
    offset: (Math.max(1, page) - 1) * Math.min(200, Math.max(1, limit)),
  };

  next();
}

module.exports = {
  validateMintRequest,
  validateBurnRequest,
  validateReserveUpdate,
  validatePagination,
};
