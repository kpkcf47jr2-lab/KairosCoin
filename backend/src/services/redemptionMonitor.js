// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Redemption Monitor
//  Watches for KAIROS sent to redemption address → Auto-burns & sends USDT back
//
//  Flow: User sends KAIROS to redemption address → Monitor detects →
//        Auto-burn KAIROS → Send USDT back to user
//
//  The redemption address is the owner/treasury address.
//  When KAIROS arrives there, it means the user wants to redeem for USD.
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const logger = require("../utils/logger");
const config = require("../config");
const blockchain = require("./blockchain");
const db = require("./database");
const { v4: uuidv4 } = require("uuid");

// ERC20 Transfer event
const TRANSFER_EVENT_TOPIC = ethers.id("Transfer(address,address,uint256)");

// USDT on BSC — used to pay back redemptions
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// ── State ────────────────────────────────────────────────────────────────────
let isRunning = false;
let pollInterval = null;
let lastProcessedBlock = 0;
const processedTxHashes = new Set();
const MAX_PROCESSED_CACHE = 10000;

// ── Configuration ────────────────────────────────────────────────────────────
const REDEMPTION_ADDRESS = config.redemptionAddress; // Owner wallet receives KAIROS for redemption
const POLL_INTERVAL_MS = config.redemptionPollInterval || 15000;
const CONFIRMATIONS_REQUIRED = 5;
const MIN_REDEEM_KAIROS = 1; // Minimum: 1 KAIROS ($1)
const MAX_REDEEM_KAIROS = 1000000; // Maximum: 1M KAIROS per tx

// ═════════════════════════════════════════════════════════════════════════════
//                          START MONITORING
// ═════════════════════════════════════════════════════════════════════════════

async function start() {
  if (!REDEMPTION_ADDRESS) {
    logger.warn("REDEMPTION_ADDRESS not configured — Redemption monitor DISABLED");
    return;
  }

  if (isRunning) {
    logger.warn("Redemption monitor already running");
    return;
  }

  const provider = blockchain.getProvider();
  if (!provider) {
    logger.error("Cannot start redemption monitor — no blockchain provider");
    return;
  }

  isRunning = true;

  try {
    lastProcessedBlock = await provider.getBlockNumber();
    lastProcessedBlock -= 5;
    logger.info(`Redemption monitor STARTED — watching for KAIROS → ${REDEMPTION_ADDRESS}`, {
      startBlock: lastProcessedBlock,
      pollInterval: `${POLL_INTERVAL_MS}ms`,
      confirmations: CONFIRMATIONS_REQUIRED,
    });
  } catch (err) {
    logger.error("Failed to get starting block for redemption monitor", { error: err.message });
    lastProcessedBlock = 0;
  }

  pollInterval = setInterval(() => pollForRedemptions(), POLL_INTERVAL_MS);
  setTimeout(() => pollForRedemptions(), 5000);
}

// ═════════════════════════════════════════════════════════════════════════════
//                      POLL FOR KAIROS REDEMPTIONS
// ═════════════════════════════════════════════════════════════════════════════

async function pollForRedemptions() {
  if (!isRunning) return;

  const provider = blockchain.getProvider();
  if (!provider) return;

  try {
    const currentBlock = await provider.getBlockNumber();
    const safeBlock = currentBlock - CONFIRMATIONS_REQUIRED;

    if (safeBlock <= lastProcessedBlock) return;

    // Look for KAIROS Transfer events TO the redemption address
    const redemptionAddrPadded = ethers.zeroPadValue(REDEMPTION_ADDRESS.toLowerCase(), 32);

    const filter = {
      address: config.contractAddress, // KAIROS token contract
      topics: [
        TRANSFER_EVENT_TOPIC,
        null, // from (any user)
        redemptionAddrPadded, // to = our redemption address
      ],
      fromBlock: lastProcessedBlock + 1,
      toBlock: safeBlock,
    };

    const logs = await provider.getLogs(filter);

    // Filter out mint events (from = 0x0) and internal transfers from owner
    const realRedemptions = logs.filter((log) => {
      const from = ethers.getAddress("0x" + log.topics[1].slice(26));
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      // Exclude mints (from zero) and owner self-transfers
      return (
        from.toLowerCase() !== zeroAddress.toLowerCase() &&
        from.toLowerCase() !== REDEMPTION_ADDRESS.toLowerCase()
      );
    });

    if (realRedemptions.length > 0) {
      logger.info(`Found ${realRedemptions.length} KAIROS redemption(s)`, {
        fromBlock: lastProcessedBlock + 1,
        toBlock: safeBlock,
      });
    }

    for (const log of realRedemptions) {
      await processRedemption(log);
    }

    lastProcessedBlock = safeBlock;
  } catch (err) {
    logger.error("Redemption poll error", { error: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                     PROCESS A SINGLE REDEMPTION
// ═════════════════════════════════════════════════════════════════════════════

async function processRedemption(log) {
  const txHash = log.transactionHash;

  if (processedTxHashes.has(txHash)) return;

  const from = ethers.getAddress("0x" + log.topics[1].slice(26));
  const amount = ethers.toBigInt(log.data);
  const amountHuman = ethers.formatUnits(amount, 18); // KAIROS = 18 decimals
  const amountUSD = parseFloat(amountHuman);

  // Validate amount
  if (amountUSD < MIN_REDEEM_KAIROS) {
    logger.warn(`Redemption too small: ${amountUSD} KAIROS from ${from}`, { txHash });
    processedTxHashes.add(txHash);
    return;
  }

  if (amountUSD > MAX_REDEEM_KAIROS) {
    logger.warn(`Redemption exceeds max: ${amountUSD} KAIROS from ${from} — flagged for review`, {
      txHash,
    });
  }

  logger.info(`Processing redemption: ${amountHuman} KAIROS from ${from}`, {
    txHash,
    blockNumber: log.blockNumber,
    amountUSD,
  });

  const redemptionId = uuidv4();

  try {
    // 1. Record the redemption in database
    db.createTransaction({
      id: redemptionId,
      type: "AUTO_BURN",
      status: "PROCESSING",
      amount: amountHuman,
      from_address: from,
      to_address: REDEMPTION_ADDRESS,
      reference: `redeem:KAIROS:${txHash}`,
      note: `Auto-burn: ${amountHuman} KAIROS received from ${from} → Burning & sending ${amountHuman} USDT back`,
      initiated_by: "redemption-monitor",
    });

    // 2. Burn the KAIROS tokens (they're now in the owner/redemption address)
    //    The contract's burn(from, amount) can burn from the owner address
    const burnResult = await blockchain.burn(REDEMPTION_ADDRESS, amountHuman);

    // 3. Send USDT back to the user
    const usdtSent = await sendUSDT(from, amountHuman);

    // 4. Record the reserve withdrawal
    db.recordReserveChange({
      id: uuidv4(),
      type: "WITHDRAWAL",
      amount: amountUSD,
      currency: "USD",
      source: "USDT on-chain redemption",
      reference: txHash,
      note: `Auto-redemption: ${amountHuman} KAIROS burned, ${amountHuman} USDT sent to ${from}`,
      recorded_by: "redemption-monitor",
    });

    // 5. Update transaction record
    db.updateTransaction(redemptionId, {
      status: "CONFIRMED",
      tx_hash: `burn:${burnResult.txHash}|usdt:${usdtSent.txHash}`,
      block_number: burnResult.blockNumber,
      gas_used: burnResult.gasUsed,
      effective_gas_price: burnResult.effectiveGasPrice,
    });

    processedTxHashes.add(txHash);
    cleanProcessedCache();

    logger.info(`AUTO-BURN + USDT PAYOUT SUCCESS: ${amountHuman} KAIROS burned, ${amountHuman} USDT → ${from}`, {
      redemptionTx: txHash,
      burnTx: burnResult.txHash,
      usdtTx: usdtSent.txHash,
      redemptionId,
    });
  } catch (err) {
    logger.error(`AUTO-BURN FAILED for redemption ${txHash}`, {
      error: err.message,
      redemptionId,
      from,
      amount: amountHuman,
    });

    try {
      db.updateTransaction(redemptionId, {
        status: "FAILED",
        error_message: err.message,
      });
    } catch (dbErr) {
      logger.error("Failed to update failed redemption", { error: dbErr.message });
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                     SEND USDT BACK TO USER
// ═════════════════════════════════════════════════════════════════════════════

async function sendUSDT(to, amount) {
  const wallet = blockchain.getWallet();
  if (!wallet) throw new Error("No wallet available for USDT transfer");

  const provider = blockchain.getProvider();
  const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

  // Check USDT balance first
  const balance = await usdtContract.balanceOf(wallet.address);
  const amountWei = ethers.parseUnits(amount, 18); // USDT on BSC = 18 decimals

  if (balance < amountWei) {
    throw new Error(
      `Insufficient USDT balance for payout: have ${ethers.formatUnits(balance, 18)} USDT, need ${amount} USDT`
    );
  }

  logger.info(`Sending ${amount} USDT to ${to}`, {
    balance: ethers.formatUnits(balance, 18),
  });

  const tx = await usdtContract.transfer(to, amountWei, {
    gasPrice: ethers.parseUnits("3", "gwei"),
  });

  const receipt = await tx.wait(2);

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                          UTILITY
// ═════════════════════════════════════════════════════════════════════════════

function cleanProcessedCache() {
  if (processedTxHashes.size > MAX_PROCESSED_CACHE) {
    const arr = [...processedTxHashes];
    const toDelete = arr.slice(0, arr.length - MAX_PROCESSED_CACHE / 2);
    toDelete.forEach((h) => processedTxHashes.delete(h));
  }
}

function stop() {
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  logger.info("Redemption monitor STOPPED");
}

function getStatus() {
  return {
    running: isRunning,
    redemptionAddress: REDEMPTION_ADDRESS || "NOT CONFIGURED",
    lastProcessedBlock,
    processedTransactions: processedTxHashes.size,
    payoutToken: "USDT (BSC)",
    pollInterval: `${POLL_INTERVAL_MS}ms`,
    confirmations: CONFIRMATIONS_REQUIRED,
    minRedeem: `${MIN_REDEEM_KAIROS} KAIROS`,
    maxRedeem: `${MAX_REDEEM_KAIROS} KAIROS`,
  };
}

module.exports = {
  start,
  stop,
  getStatus,
};
