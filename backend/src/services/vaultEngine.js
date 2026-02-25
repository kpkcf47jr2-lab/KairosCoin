// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Vault Engine
//  Manages the KAIROS Liquidity Vault: deposits, withdrawals, fee distribution,
//  APY calculation. This is the off-chain tracker for the on-chain vault.
//
//  The vault creates liquidity for KAIROS by:
//  - Encouraging holders to deposit KAIROS to earn yield
//  - Trading fees from leverage positions flow back to depositors
//  - TVL grows as more users deposit → more liquidity → more trading
// ═══════════════════════════════════════════════════════════════════════════════

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

let db = null;

// ── Vault Configuration ──────────────────────────────────────────────────────
const VAULT_CONFIG = {
  minDeposit: 1,          // Minimum 1 KAIROS
  maxVaultCapacity: 10000000, // 10M KAIROS
  withdrawalCooldownMs: 3600000, // 1 hour cooldown
  feeSplit: {
    vault: 70,            // 70% of trading fees → vault LPs
    treasury: 20,         // 20% → Kairos 777
    insurance: 10,        // 10% → Insurance fund
  },
};

// ═════════════════════════════════════════════════════════════════════════════
//                       DATABASE INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize(database) {
  db = database.getDb();
  createVaultTables();
  logger.info("Vault Engine database tables initialized");
}

function createVaultTables() {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════════════
    --  VAULT STATE — Global vault metrics (single row)
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS vault_state (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      total_deposits REAL NOT NULL DEFAULT 0,
      total_shares REAL NOT NULL DEFAULT 0,
      total_fees_distributed REAL NOT NULL DEFAULT 0,
      total_treasury_fees REAL NOT NULL DEFAULT 0,
      total_insurance_fees REAL NOT NULL DEFAULT 0,
      cumulative_deposited REAL NOT NULL DEFAULT 0,
      cumulative_withdrawn REAL NOT NULL DEFAULT 0,
      current_epoch INTEGER NOT NULL DEFAULT 0,
      deposits_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Initialize vault state if empty
    INSERT OR IGNORE INTO vault_state (id) VALUES (1);

    -- ═══════════════════════════════════════════════════════════════════════
    --  VAULT ACCOUNTS — One per wallet, tracks shares & value
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS vault_accounts (
      wallet_address TEXT PRIMARY KEY,
      shares REAL NOT NULL DEFAULT 0,
      total_deposited REAL NOT NULL DEFAULT 0,
      total_withdrawn REAL NOT NULL DEFAULT 0,
      total_earned REAL NOT NULL DEFAULT 0,
      last_deposit_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  VAULT TRANSACTIONS — Full audit trail
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS vault_transactions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'FEE_DISTRIBUTION')),
      kairos_amount REAL NOT NULL,
      shares_amount REAL NOT NULL DEFAULT 0,
      price_per_share REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════════
    --  VAULT EPOCHS — Yield snapshots for APY calculation
    -- ═══════════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS vault_epochs (
      epoch INTEGER PRIMARY KEY,
      total_fees REAL NOT NULL,
      vault_share REAL NOT NULL,
      treasury_share REAL NOT NULL,
      insurance_share REAL NOT NULL,
      total_deposits_at_epoch REAL NOT NULL,
      price_per_share REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_vault_tx_wallet ON vault_transactions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_vault_tx_type ON vault_transactions(type);
    CREATE INDEX IF NOT EXISTS idx_vault_epochs_time ON vault_epochs(created_at);
  `);
}

// ═════════════════════════════════════════════════════════════════════════════
//                          VAULT STATE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function getVaultState() {
  return db.prepare("SELECT * FROM vault_state WHERE id = 1").get();
}

function getPricePerShare() {
  const state = getVaultState();
  if (state.total_shares === 0 || state.total_deposits === 0) return 1;
  return state.total_deposits / state.total_shares;
}

function getOrCreateAccount(walletAddress) {
  const addr = walletAddress.toLowerCase();
  let account = db.prepare("SELECT * FROM vault_accounts WHERE wallet_address = ?").get(addr);

  if (!account) {
    db.prepare("INSERT INTO vault_accounts (wallet_address) VALUES (?)").run(addr);
    account = db.prepare("SELECT * FROM vault_accounts WHERE wallet_address = ?").get(addr);
    logger.info("Vault account created", { wallet: addr });
  }

  return account;
}

// ═════════════════════════════════════════════════════════════════════════════
//                         DEPOSIT KAIROS
// ═════════════════════════════════════════════════════════════════════════════

function deposit(walletAddress, amount) {
  const addr = walletAddress.toLowerCase();
  const state = getVaultState();

  // Validation
  if (amount < VAULT_CONFIG.minDeposit) {
    throw new Error(`Minimum deposit: ${VAULT_CONFIG.minDeposit} KAIROS`);
  }
  if (!state.deposits_enabled) {
    throw new Error("Deposits are currently paused");
  }
  if (state.total_deposits + amount > VAULT_CONFIG.maxVaultCapacity) {
    throw new Error(`Vault capacity exceeded. Available: ${(VAULT_CONFIG.maxVaultCapacity - state.total_deposits).toFixed(2)} KAIROS`);
  }

  // Calculate shares to mint
  let sharesToMint;
  const pricePerShare = getPricePerShare();

  if (state.total_shares === 0 || state.total_deposits === 0) {
    sharesToMint = amount; // First deposit: 1:1
  } else {
    sharesToMint = amount / pricePerShare;
  }

  if (sharesToMint <= 0) throw new Error("Zero shares calculated");

  const txId = uuidv4();
  const account = getOrCreateAccount(addr);

  // Update vault state
  db.prepare(`
    UPDATE vault_state
    SET total_deposits = total_deposits + ?,
        total_shares = total_shares + ?,
        cumulative_deposited = cumulative_deposited + ?,
        updated_at = datetime('now')
    WHERE id = 1
  `).run(amount, sharesToMint, amount);

  // Update user account
  db.prepare(`
    UPDATE vault_accounts
    SET shares = shares + ?,
        total_deposited = total_deposited + ?,
        last_deposit_at = datetime('now'),
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(sharesToMint, amount, addr);

  // Record transaction
  db.prepare(`
    INSERT INTO vault_transactions (id, wallet_address, type, kairos_amount, shares_amount, price_per_share)
    VALUES (?, ?, 'DEPOSIT', ?, ?, ?)
  `).run(txId, addr, amount, sharesToMint, pricePerShare);

  logger.info("Vault deposit", { wallet: addr, amount, shares: sharesToMint, pricePerShare, txId });

  return {
    txId,
    deposited: amount,
    sharesReceived: sharesToMint,
    pricePerShare,
    totalShares: account.shares + sharesToMint,
    totalValue: (account.shares + sharesToMint) * getPricePerShare(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                        WITHDRAW KAIROS
// ═════════════════════════════════════════════════════════════════════════════

function withdraw(walletAddress, shares) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);
  const state = getVaultState();

  if (shares <= 0) throw new Error("Must withdraw positive amount");
  if (shares > account.shares) {
    throw new Error(`Insufficient shares. You have: ${account.shares.toFixed(4)} kKAIROS`);
  }

  // Cooldown check
  if (account.last_deposit_at) {
    const depositTime = new Date(account.last_deposit_at + 'Z').getTime();
    const elapsed = Date.now() - depositTime;
    if (elapsed < VAULT_CONFIG.withdrawalCooldownMs) {
      const remaining = Math.ceil((VAULT_CONFIG.withdrawalCooldownMs - elapsed) / 60000);
      throw new Error(`Withdrawal cooldown active. ${remaining} minutes remaining.`);
    }
  }

  // Calculate KAIROS to return
  const pricePerShare = getPricePerShare();
  const kairosAmount = shares * pricePerShare;

  if (kairosAmount <= 0) throw new Error("Zero withdrawal");
  if (kairosAmount > state.total_deposits) {
    throw new Error("Insufficient vault liquidity");
  }

  const txId = uuidv4();
  const earned = kairosAmount - (shares * 1); // Yield earned (shares at initial 1:1 vs current price)
  const actualEarned = Math.max(0, earned);

  // Update vault state
  db.prepare(`
    UPDATE vault_state
    SET total_deposits = total_deposits - ?,
        total_shares = total_shares - ?,
        cumulative_withdrawn = cumulative_withdrawn + ?,
        updated_at = datetime('now')
    WHERE id = 1
  `).run(kairosAmount, shares, kairosAmount);

  // Update user account
  db.prepare(`
    UPDATE vault_accounts
    SET shares = shares - ?,
        total_withdrawn = total_withdrawn + ?,
        total_earned = total_earned + ?,
        updated_at = datetime('now')
    WHERE wallet_address = ?
  `).run(shares, kairosAmount, actualEarned, addr);

  // Record transaction
  db.prepare(`
    INSERT INTO vault_transactions (id, wallet_address, type, kairos_amount, shares_amount, price_per_share)
    VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?)
  `).run(txId, addr, kairosAmount, shares, pricePerShare);

  logger.info("Vault withdrawal", { wallet: addr, shares, kairosReturned: kairosAmount, earned: actualEarned, txId });

  return {
    txId,
    sharesRedeemed: shares,
    kairosReturned: kairosAmount,
    earned: actualEarned,
    pricePerShare,
    remainingShares: account.shares - shares,
    remainingValue: (account.shares - shares) * pricePerShare,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                       FEE DISTRIBUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Distribute trading fees from the margin engine into the vault
 * Called after trades close (by the margin engine or a cron)
 */
function distributeFees(totalFees) {
  if (totalFees <= 0) return null;

  const state = getVaultState();
  const split = VAULT_CONFIG.feeSplit;

  const vaultShare = totalFees * (split.vault / 100);
  const treasuryShare = totalFees * (split.treasury / 100);
  const insuranceShare = totalFees - vaultShare - treasuryShare;

  const newEpoch = state.current_epoch + 1;
  const pricePerShare = state.total_shares > 0
    ? (state.total_deposits + vaultShare) / state.total_shares
    : 1;

  // Update vault: add vaultShare to deposits (increases price per share)
  db.prepare(`
    UPDATE vault_state
    SET total_deposits = total_deposits + ?,
        total_fees_distributed = total_fees_distributed + ?,
        total_treasury_fees = total_treasury_fees + ?,
        total_insurance_fees = total_insurance_fees + ?,
        current_epoch = ?,
        updated_at = datetime('now')
    WHERE id = 1
  `).run(vaultShare, vaultShare, treasuryShare, insuranceShare, newEpoch);

  // Record epoch
  db.prepare(`
    INSERT INTO vault_epochs (epoch, total_fees, vault_share, treasury_share, insurance_share, total_deposits_at_epoch, price_per_share)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(newEpoch, totalFees, vaultShare, treasuryShare, insuranceShare, state.total_deposits + vaultShare, pricePerShare);

  logger.info("Fees distributed", { totalFees, vaultShare, treasuryShare, insuranceShare, epoch: newEpoch, pricePerShare });

  return {
    epoch: newEpoch,
    totalFees,
    vaultShare,
    treasuryShare,
    insuranceShare,
    newPricePerShare: pricePerShare,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                          READ FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function getVaultInfo() {
  const state = getVaultState();
  const pricePerShare = getPricePerShare();

  // Calculate APY from recent epochs
  const recentEpochs = db.prepare(`
    SELECT * FROM vault_epochs ORDER BY epoch DESC LIMIT 30
  `).all();

  let apy = 0;
  if (recentEpochs.length >= 2) {
    const oldest = recentEpochs[recentEpochs.length - 1];
    const newest = recentEpochs[0];
    const timeSpanMs = new Date(newest.created_at + 'Z').getTime() - new Date(oldest.created_at + 'Z').getTime();
    const timeSpanDays = Math.max(1, timeSpanMs / (86400000));
    const totalVaultFees = recentEpochs.reduce((sum, e) => sum + e.vault_share, 0);
    const avgDeposits = (oldest.total_deposits_at_epoch + newest.total_deposits_at_epoch) / 2;
    if (avgDeposits > 0) {
      const dailyRate = (totalVaultFees / avgDeposits) / timeSpanDays;
      apy = dailyRate * 365 * 100; // Annualized %
    }
  }

  const totalProviders = db.prepare("SELECT COUNT(*) as count FROM vault_accounts WHERE shares > 0").get().count;

  return {
    tvl: state.total_deposits,
    totalShares: state.total_shares,
    pricePerShare,
    totalFeesDistributed: state.total_fees_distributed,
    totalTreasuryFees: state.total_treasury_fees,
    totalInsuranceFees: state.total_insurance_fees,
    cumulativeDeposited: state.cumulative_deposited,
    cumulativeWithdrawn: state.cumulative_withdrawn,
    currentEpoch: state.current_epoch,
    depositsEnabled: !!state.deposits_enabled,
    totalProviders,
    apy,
    feeSplit: VAULT_CONFIG.feeSplit,
    maxCapacity: VAULT_CONFIG.maxVaultCapacity,
    minDeposit: VAULT_CONFIG.minDeposit,
    cooldownMinutes: VAULT_CONFIG.withdrawalCooldownMs / 60000,
  };
}

function getUserVaultInfo(walletAddress) {
  const addr = walletAddress.toLowerCase();
  const account = getOrCreateAccount(addr);
  const pricePerShare = getPricePerShare();

  const currentValue = account.shares * pricePerShare;
  const unrealizedProfit = currentValue - account.total_deposited + account.total_withdrawn;

  const transactions = db.prepare(`
    SELECT * FROM vault_transactions WHERE wallet_address = ? ORDER BY created_at DESC LIMIT 50
  `).all(addr);

  // Cooldown status
  let cooldownRemaining = 0;
  if (account.last_deposit_at) {
    const depositTime = new Date(account.last_deposit_at + 'Z').getTime();
    const elapsed = Date.now() - depositTime;
    if (elapsed < VAULT_CONFIG.withdrawalCooldownMs) {
      cooldownRemaining = Math.ceil((VAULT_CONFIG.withdrawalCooldownMs - elapsed) / 1000);
    }
  }

  return {
    shares: account.shares,
    currentValue,
    totalDeposited: account.total_deposited,
    totalWithdrawn: account.total_withdrawn,
    totalEarned: account.total_earned,
    unrealizedProfit: Math.max(0, unrealizedProfit),
    pricePerShare,
    cooldownRemaining,
    transactions,
  };
}

function getLeaderboard(limit = 20) {
  const pricePerShare = getPricePerShare();
  return db.prepare(`
    SELECT wallet_address, shares, total_deposited, total_withdrawn, total_earned, created_at
    FROM vault_accounts
    WHERE shares > 0
    ORDER BY shares DESC
    LIMIT ?
  `).all(limit).map(a => ({
    ...a,
    currentValue: a.shares * pricePerShare,
    profit: (a.shares * pricePerShare) - a.total_deposited + a.total_withdrawn,
  }));
}

function getEpochHistory(limit = 50) {
  return db.prepare(`
    SELECT * FROM vault_epochs ORDER BY epoch DESC LIMIT ?
  `).all(limit);
}

// ═════════════════════════════════════════════════════════════════════════════
//                            EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  deposit,
  withdraw,
  distributeFees,
  getVaultInfo,
  getUserVaultInfo,
  getLeaderboard,
  getEpochHistory,
  getPricePerShare,
  VAULT_CONFIG,
};
