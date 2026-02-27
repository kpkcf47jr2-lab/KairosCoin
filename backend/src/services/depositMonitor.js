// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Deposit Monitor
//  Watches for USDT/BUSD deposits → Auto-mints KAIROS 1:1
//
//  Flow: User sends USDT to deposit address → Monitor detects → Auto-mint KAIROS
//
//  Supported stablecoins (BSC):
//    • USDT (Tether):  0x55d398326f99059fF775485246999027B3197955
//    • BUSD (Binance): 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
//    • USDC (Circle):  0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const logger = require("../utils/logger");
const config = require("../config");
const blockchain = require("./blockchain");
const db = require("./database");
const { v4: uuidv4 } = require("uuid");

// ── Accepted Stablecoins on BSC ─────────────────────────────────────────────
const STABLECOINS = {
  "0x55d398326f99059fF775485246999027B3197955": { symbol: "USDT", decimals: 18 },
  "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": { symbol: "BUSD", decimals: 18 },
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": { symbol: "USDC", decimals: 18 },
};

// ERC20 Transfer event signature
const TRANSFER_EVENT_TOPIC = ethers.id("Transfer(address,address,uint256)");

// Minimal ERC20 ABI for reading
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ── State ────────────────────────────────────────────────────────────────────
let isRunning = false;
let pollInterval = null;
let lastProcessedBlock = 0;
const MONITOR_NAME = 'deposit';

// ── Configuration ────────────────────────────────────────────────────────────
const DEPOSIT_ADDRESS = config.depositAddress; // Address that receives stablecoin deposits
const POLL_INTERVAL_MS = config.depositPollInterval || 15000; // 15 seconds
const CONFIRMATIONS_REQUIRED = 5; // Wait for 5 block confirmations
const MIN_DEPOSIT_USD = 1; // Minimum deposit: $1
const MAX_DEPOSIT_USD = 1000000; // Maximum deposit: $1M per tx

// ═════════════════════════════════════════════════════════════════════════════
//                          START MONITORING
// ═════════════════════════════════════════════════════════════════════════════

async function start() {
  if (!DEPOSIT_ADDRESS) {
    logger.warn("DEPOSIT_ADDRESS not configured — Deposit monitor DISABLED");
    return;
  }

  if (isRunning) {
    logger.warn("Deposit monitor already running");
    return;
  }

  const provider = blockchain.getProvider();
  if (!provider) {
    logger.error("Cannot start deposit monitor — no blockchain provider");
    return;
  }

  isRunning = true;

  // Restore last processed block from DB, or start from current - 5
  try {
    const savedBlock = db.getMonitorBlock(MONITOR_NAME);
    if (savedBlock) {
      lastProcessedBlock = savedBlock;
      logger.info(`Deposit monitor restored from DB — block ${savedBlock}`);
    } else {
      lastProcessedBlock = (await provider.getBlockNumber()) - 5;
      logger.info(`Deposit monitor starting fresh — block ${lastProcessedBlock}`);
    }
    logger.info(`Deposit monitor STARTED — watching ${DEPOSIT_ADDRESS}`, {
      startBlock: lastProcessedBlock,
      stablecoins: Object.keys(STABLECOINS).map(
        (addr) => STABLECOINS[addr].symbol
      ),
      pollInterval: `${POLL_INTERVAL_MS}ms`,
      confirmations: CONFIRMATIONS_REQUIRED,
    });
  } catch (err) {
    logger.error("Failed to get starting block", { error: err.message });
    lastProcessedBlock = 0;
  }

  // Start polling loop
  pollInterval = setInterval(() => pollForDeposits(), POLL_INTERVAL_MS);

  // Initial poll
  setTimeout(() => pollForDeposits(), 3000);
}

// ═════════════════════════════════════════════════════════════════════════════
//                        POLL FOR NEW DEPOSITS
// ═════════════════════════════════════════════════════════════════════════════

async function pollForDeposits() {
  if (!isRunning) return;

  const provider = blockchain.getProvider();
  if (!provider) return;

  try {
    const currentBlock = await provider.getBlockNumber();
    const safeBlock = currentBlock - CONFIRMATIONS_REQUIRED;

    if (safeBlock <= lastProcessedBlock) return; // No new confirmed blocks

    // Scan each accepted stablecoin for transfers TO our deposit address
    const stablecoinAddresses = Object.keys(STABLECOINS);

    for (const tokenAddress of stablecoinAddresses) {
      try {
        await scanTransfers(provider, tokenAddress, lastProcessedBlock + 1, safeBlock);
      } catch (err) {
        logger.error(`Error scanning ${STABLECOINS[tokenAddress].symbol} deposits`, {
          error: err.message,
          fromBlock: lastProcessedBlock + 1,
          toBlock: safeBlock,
        });
      }
    }

    lastProcessedBlock = safeBlock;
    // Persist block number so we survive restarts
    try { db.setMonitorBlock(MONITOR_NAME, safeBlock); } catch (_) {}
  } catch (err) {
    logger.error("Deposit poll error", { error: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                    SCAN TRANSFER EVENTS FOR A TOKEN
// ═════════════════════════════════════════════════════════════════════════════

async function scanTransfers(provider, tokenAddress, fromBlock, toBlock) {
  const tokenInfo = STABLECOINS[tokenAddress];

  // Query Transfer events where `to` = our deposit address
  const depositAddrPadded = ethers.zeroPadValue(DEPOSIT_ADDRESS.toLowerCase(), 32);

  const filter = {
    address: tokenAddress,
    topics: [
      TRANSFER_EVENT_TOPIC,
      null, // from (any)
      depositAddrPadded, // to = our deposit address
    ],
    fromBlock,
    toBlock,
  };

  const logs = await provider.getLogs(filter);

  if (logs.length > 0) {
    logger.info(`Found ${logs.length} ${tokenInfo.symbol} deposit(s)`, {
      fromBlock,
      toBlock,
    });
  }

  for (const log of logs) {
    await processDeposit(log, tokenAddress, tokenInfo);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                       PROCESS A SINGLE DEPOSIT
// ═════════════════════════════════════════════════════════════════════════════

async function processDeposit(log, tokenAddress, tokenInfo) {
  const txHash = log.transactionHash;

  // Skip if already processed (DB-persisted, survives restarts)
  if (db.isTxProcessed(txHash)) return;

  // Parse the Transfer event
  const from = ethers.getAddress("0x" + log.topics[1].slice(26));
  const amount = ethers.toBigInt(log.data);
  const amountHuman = ethers.formatUnits(amount, tokenInfo.decimals);
  const amountUSD = parseFloat(amountHuman);

  // Validate amount
  if (amountUSD < MIN_DEPOSIT_USD) {
    logger.warn(`Deposit too small: ${amountUSD} ${tokenInfo.symbol} from ${from}`, { txHash });
    db.markTxProcessed(txHash, MONITOR_NAME);
    return;
  }

  if (amountUSD > MAX_DEPOSIT_USD) {
    logger.warn(`Deposit exceeds max: ${amountUSD} ${tokenInfo.symbol} from ${from}`, { txHash });
    // Still process but flag for review
  }

  logger.info(`Processing deposit: ${amountHuman} ${tokenInfo.symbol} from ${from}`, {
    txHash,
    blockNumber: log.blockNumber,
    amountUSD,
  });

  const depositId = uuidv4();

  try {
    // 1. Record the deposit in database
    db.createTransaction({
      id: depositId,
      type: "AUTO_MINT",
      status: "PROCESSING",
      amount: amountHuman,
      from_address: from,
      to_address: from, // Mint KAIROS back to the depositor
      reference: `deposit:${tokenInfo.symbol}:${txHash}`,
      note: `Auto-mint: ${amountHuman} ${tokenInfo.symbol} deposited → ${amountHuman} KAIROS minted`,
      initiated_by: "deposit-monitor",
    });

    // 2. Record the reserve deposit
    db.recordReserveChange({
      id: uuidv4(),
      type: "DEPOSIT",
      amount: amountUSD,
      currency: "USD",
      source: `${tokenInfo.symbol} on-chain deposit`,
      reference: txHash,
      note: `Auto-deposit: ${amountHuman} ${tokenInfo.symbol} from ${from}`,
      recorded_by: "deposit-monitor",
    });

    // 3. Auto-mint KAIROS to the depositor (1:1 with USD)
    const mintResult = await blockchain.mint(from, amountHuman);

    // 4. Update transaction record
    db.updateTransaction(depositId, {
      status: "CONFIRMED",
      tx_hash: mintResult.txHash,
      block_number: mintResult.blockNumber,
      gas_used: mintResult.gasUsed,
      effective_gas_price: mintResult.effectiveGasPrice,
    });

    // Mark as processed (DB-persisted)
    db.markTxProcessed(txHash, MONITOR_NAME);

    logger.info(`AUTO-MINT SUCCESS: ${amountHuman} KAIROS → ${from}`, {
      depositTx: txHash,
      mintTx: mintResult.txHash,
      depositId,
      blockNumber: mintResult.blockNumber,
    });
  } catch (err) {
    logger.error(`AUTO-MINT FAILED for deposit ${txHash}`, {
      error: err.message,
      depositId,
      from,
      amount: amountHuman,
    });

    // Update transaction as failed
    try {
      db.updateTransaction(depositId, {
        status: "FAILED",
        error_message: err.message,
      });
    } catch (dbErr) {
      logger.error("Failed to update failed transaction", { error: dbErr.message });
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                          UTILITY
// ═════════════════════════════════════════════════════════════════════════════

function stop() {
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  logger.info("Deposit monitor STOPPED");
}

function getStatus() {
  return {
    running: isRunning,
    depositAddress: DEPOSIT_ADDRESS || "NOT CONFIGURED",
    lastProcessedBlock,
    processedTransactions: 'persisted in DB',
    supportedStablecoins: Object.keys(STABLECOINS).map(
      (addr) => `${STABLECOINS[addr].symbol} (${addr})`
    ),
    pollInterval: `${POLL_INTERVAL_MS}ms`,
    confirmations: CONFIRMATIONS_REQUIRED,
    minDeposit: `$${MIN_DEPOSIT_USD}`,
    maxDeposit: `$${MAX_DEPOSIT_USD}`,
  };
}

module.exports = {
  start,
  stop,
  getStatus,
  STABLECOINS,
};
