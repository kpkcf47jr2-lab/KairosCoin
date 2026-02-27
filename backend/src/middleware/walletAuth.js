// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Wallet Signature Authentication Middleware
//  Verifies that the caller owns the wallet address via EIP-191 signature
//
//  The client must send:
//    - x-wallet-address: "0x..." (the wallet address)
//    - x-wallet-signature: "0x..." (signed message)
//    - x-wallet-timestamp: "1709..." (unix timestamp in ms)
//
//  The signed message format:
//    "kairos:${walletAddress}:${timestamp}"
//
//  Signature expires after 5 minutes to prevent replay attacks.
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const logger = require("../utils/logger");

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware: Verify wallet ownership via EIP-191 personal_sign.
 * Sets req.verifiedWallet to the verified lowercase address.
 */
function requireWalletSignature(req, res, next) {
  try {
    const walletAddress = req.headers["x-wallet-address"] || req.body?.walletAddress;
    const signature = req.headers["x-wallet-signature"];
    const timestamp = req.headers["x-wallet-timestamp"];

    if (!walletAddress || !signature || !timestamp) {
      return res.status(401).json({
        error: "Wallet authentication required",
        message: "Provide x-wallet-address, x-wallet-signature, and x-wallet-timestamp headers",
      });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    // Check timestamp freshness (prevent replay attacks)
    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(ts) || Math.abs(now - ts) > SIGNATURE_MAX_AGE_MS) {
      logger.warn("Wallet auth: signature expired or invalid timestamp", {
        walletAddress: walletAddress.slice(0, 10),
        timestamp,
        age: now - ts,
      });
      return res.status(401).json({
        error: "Signature expired",
        message: "Please sign a new message. Signatures expire after 5 minutes.",
      });
    }

    // Reconstruct the expected signed message
    const message = `kairos:${walletAddress.toLowerCase()}:${timestamp}`;

    // Recover the signer address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Compare addresses (case-insensitive)
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn("Wallet auth: signature mismatch", {
        claimed: walletAddress.slice(0, 10),
        recovered: recoveredAddress.slice(0, 10),
      });
      return res.status(403).json({
        error: "Signature verification failed",
        message: "The signature does not match the wallet address",
      });
    }

    // Set verified wallet on request
    req.verifiedWallet = walletAddress.toLowerCase();
    next();
  } catch (err) {
    logger.error("Wallet auth error", { error: err.message });
    return res.status(400).json({ error: "Invalid signature format" });
  }
}

/**
 * Optional wallet auth — if signature present, verify it; otherwise continue.
 * Sets req.verifiedWallet if valid, or null if not provided.
 */
function optionalWalletSignature(req, res, next) {
  const signature = req.headers["x-wallet-signature"];
  if (!signature) {
    req.verifiedWallet = null;
    return next();
  }
  return requireWalletSignature(req, res, next);
}

module.exports = { requireWalletSignature, optionalWalletSignature };
