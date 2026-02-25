// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos API — Wallet Cloud Backup Routes
//  Encrypted vault backup/restore for Kairos Wallet
//  POST /api/wallet/backup       — Create/update backup
//  GET  /api/wallet/backup       — Restore backup
//  GET  /api/wallet/backup/check — Check if backup exists
//  DELETE /api/wallet/backup     — Delete backup
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

let db = null;

function initWalletBackup(database) {
  db = database;

  // Create the wallet_backups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_backups (
      wallet_address TEXT PRIMARY KEY,
      encrypted_vault TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  logger.info("Wallet backup table initialized");
}

// ── POST /backup — Create or update encrypted vault backup ──
router.post("/backup", (req, res) => {
  try {
    const { walletAddress, encryptedVault, version } = req.body;

    if (!walletAddress || !encryptedVault) {
      return res.status(400).json({ error: "walletAddress and encryptedVault required" });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    // Max vault size: 10KB (encrypted vault should be small)
    if (encryptedVault.length > 10240) {
      return res.status(400).json({ error: "Vault data too large" });
    }

    const stmt = db.prepare(`
      INSERT INTO wallet_backups (wallet_address, encrypted_vault, version, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(wallet_address) DO UPDATE SET
        encrypted_vault = excluded.encrypted_vault,
        version = excluded.version,
        updated_at = datetime('now')
    `);

    stmt.run(walletAddress.toLowerCase(), encryptedVault, version || 1);

    logger.info(`Wallet backup created/updated for ${walletAddress.slice(0, 10)}...`);

    res.json({
      success: true,
      message: "Backup saved successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Wallet backup error:", err.message);
    res.status(500).json({ error: "Failed to save backup" });
  }
});

// ── GET /backup — Restore encrypted vault ──
router.get("/backup", (req, res) => {
  try {
    const { address } = req.query;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Valid wallet address required" });
    }

    const row = db.prepare(`
      SELECT encrypted_vault, version, created_at, updated_at
      FROM wallet_backups WHERE wallet_address = ?
    `).get(address.toLowerCase());

    if (!row) {
      return res.status(404).json({ error: "No backup found for this address" });
    }

    res.json({
      encryptedVault: row.encrypted_vault,
      version: row.version,
      timestamp: row.updated_at,
      createdAt: row.created_at,
    });
  } catch (err) {
    logger.error("Wallet restore error:", err.message);
    res.status(500).json({ error: "Failed to retrieve backup" });
  }
});

// ── GET /backup/check — Check if backup exists ──
router.get("/backup/check", (req, res) => {
  try {
    const { address } = req.query;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ exists: false });
    }

    const row = db.prepare(`
      SELECT updated_at FROM wallet_backups WHERE wallet_address = ?
    `).get(address.toLowerCase());

    if (row) {
      res.json({ exists: true, timestamp: row.updated_at });
    } else {
      res.json({ exists: false });
    }
  } catch {
    res.json({ exists: false });
  }
});

// ── DELETE /backup — Delete backup ──
router.delete("/backup", (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Valid wallet address required" });
    }

    db.prepare("DELETE FROM wallet_backups WHERE wallet_address = ?")
      .run(walletAddress.toLowerCase());

    logger.info(`Wallet backup deleted for ${walletAddress.slice(0, 10)}...`);

    res.json({ success: true, message: "Backup deleted" });
  } catch (err) {
    logger.error("Delete backup error:", err.message);
    res.status(500).json({ error: "Failed to delete backup" });
  }
});

module.exports = { router, initWalletBackup };
