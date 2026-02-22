// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Blockchain Service
//  Core engine: Connects to BSC, executes mint/burn, reads on-chain state
//
//  SUPERIORITY OVER USDT/USDC:
//  - Real-time on-chain supply tracking (totalMinted, totalBurned)
//  - Transparent fee system (8 bps vs 20 bps)
//  - ERC-2612 gasless approvals
//  - Batch transfers in single tx
//  - Full audit trail with events
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const config = require("../config");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

// ── Load ABI from compiled contract ──────────────────────────────────────────
// Try local abi/ first (for deployment), then fall back to root artifacts/
const abiPaths = [
  path.join(__dirname, "../../abi/KairosCoin.json"),
  path.join(__dirname, "../../../artifacts/contracts/KairosCoin.sol/KairosCoin.json"),
];
let CONTRACT_ABI;
for (const p of abiPaths) {
  try {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    CONTRACT_ABI = artifact.abi;
    logger.info("Loaded ABI from " + path.basename(path.dirname(p)));
    break;
  } catch (_) { /* try next */ }
}
if (!CONTRACT_ABI) {
  logger.error("Failed to load contract ABI from any path");
  process.exit(1);
}

// ── State ────────────────────────────────────────────────────────────────────
let provider = null;
let wallet = null;
let contract = null;
let readOnlyContract = null;
let isInitialized = false;

// ── Nonce Manager ────────────────────────────────────────────────────────────
// Prevents nonce collisions when multiple tx fire in rapid succession
let pendingNonce = null;
let nonceLock = false;

async function getNextNonce() {
  while (nonceLock) {
    await new Promise((r) => setTimeout(r, 50));
  }
  nonceLock = true;
  try {
    if (pendingNonce === null) {
      pendingNonce = await wallet.getNonce("pending");
    } else {
      pendingNonce++;
    }
    return pendingNonce;
  } finally {
    nonceLock = false;
  }
}

function resetNonce() {
  pendingNonce = null;
}

// ═════════════════════════════════════════════════════════════════════════════
//                           INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

async function initialize() {
  if (isInitialized) return;

  logger.info("Initializing blockchain service...");

  // Provider with fallback RPCs
  const rpcUrls = [
    config.bscRpcUrl,
    "https://bsc-dataseed2.binance.org",
    "https://bsc-dataseed3.binance.org",
    "https://bsc-dataseed4.binance.org",
    "https://bsc-dataseed1.defibit.io",
  ];

  // Try each RPC until one works
  for (const url of rpcUrls) {
    try {
      provider = new ethers.JsonRpcProvider(url, {
        name: "bsc",
        chainId: config.chainId,
      });
      await provider.getBlockNumber(); // Test connection
      logger.info(`Connected to BSC via ${url}`);
      break;
    } catch (err) {
      logger.warn(`RPC ${url} failed, trying next...`);
      provider = null;
    }
  }

  if (!provider) {
    throw new Error("All BSC RPC endpoints failed");
  }

  // Wallet (owner)
  if (config.ownerPrivateKey && config.ownerPrivateKey !== "0xCHANGE_ME") {
    wallet = new ethers.Wallet(config.ownerPrivateKey, provider);
    contract = new ethers.Contract(config.contractAddress, CONTRACT_ABI, wallet);
    logger.info(`Owner wallet loaded: ${wallet.address}`);
  } else {
    logger.warn("No owner private key — running in READ-ONLY mode");
  }

  // Read-only contract (always available)
  readOnlyContract = new ethers.Contract(
    config.contractAddress,
    CONTRACT_ABI,
    provider
  );

  isInitialized = true;
  logger.info("Blockchain service initialized successfully");
}

// ═════════════════════════════════════════════════════════════════════════════
//                        MINT — Create KAIROS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Mint new KAIROS tokens when USD deposit is confirmed.
 * @param {string} to - Recipient wallet address
 * @param {string} amount - Amount in KAIROS (human readable, e.g. "1000")
 * @returns {Object} Transaction result
 */
async function mint(to, amount) {
  if (!contract) throw new Error("Blockchain not initialized or read-only mode");
  if (!ethers.isAddress(to)) throw new Error(`Invalid address: ${to}`);

  const amountWei = ethers.parseUnits(amount, 18);

  logger.info("MINT initiated", {
    type: "MINT",
    to,
    amount,
    amountWei: amountWei.toString(),
  });

  try {
    const nonce = await getNextNonce();
    const gasEstimate = await contract.mint.estimateGas(to, amountWei);
    const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer

    const tx = await contract.mint(to, amountWei, {
      nonce,
      gasLimit,
      gasPrice: ethers.parseUnits("3", "gwei"),
    });

    logger.info("MINT tx submitted", {
      type: "MINT",
      txHash: tx.hash,
      to,
      amount,
      nonce,
    });

    // Wait for confirmation (2 blocks for safety)
    const receipt = await tx.wait(2);

    const result = {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      to,
      amount,
      timestamp: new Date().toISOString(),
    };

    logger.info("MINT confirmed", { type: "MINT_CONFIRMED", ...result });
    return result;
  } catch (err) {
    resetNonce();
    logger.error("MINT failed", {
      type: "MINT_FAILED",
      to,
      amount,
      error: err.message,
      code: err.code,
    });
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                        BURN — Destroy KAIROS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Burn KAIROS tokens when USD withdrawal is processed.
 * @param {string} from - Address whose tokens will be burned
 * @param {string} amount - Amount in KAIROS (human readable)
 * @returns {Object} Transaction result
 */
async function burn(from, amount) {
  if (!contract) throw new Error("Blockchain not initialized or read-only mode");
  if (!ethers.isAddress(from)) throw new Error(`Invalid address: ${from}`);

  const amountWei = ethers.parseUnits(amount, 18);

  logger.info("BURN initiated", {
    type: "BURN",
    from,
    amount,
    amountWei: amountWei.toString(),
  });

  try {
    const nonce = await getNextNonce();
    const gasEstimate = await contract.burn.estimateGas(from, amountWei);
    const gasLimit = (gasEstimate * 120n) / 100n;

    const tx = await contract.burn(from, amountWei, {
      nonce,
      gasLimit,
      gasPrice: ethers.parseUnits("3", "gwei"),
    });

    logger.info("BURN tx submitted", {
      type: "BURN",
      txHash: tx.hash,
      from,
      amount,
      nonce,
    });

    const receipt = await tx.wait(2);

    const result = {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      from,
      amount,
      timestamp: new Date().toISOString(),
    };

    logger.info("BURN confirmed", { type: "BURN_CONFIRMED", ...result });
    return result;
  } catch (err) {
    resetNonce();
    logger.error("BURN failed", {
      type: "BURN_FAILED",
      from,
      amount,
      error: err.message,
      code: err.code,
    });
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//                      ON-CHAIN STATE QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get comprehensive token supply information.
 * USDT/USDC don't expose this level of on-chain transparency.
 */
async function getSupplyInfo() {
  const rc = readOnlyContract;

  const [totalSupply, totalMinted, totalBurned, name, symbol, decimals, paused, owner] =
    await Promise.all([
      rc.totalSupply(),
      rc.totalMinted(),
      rc.totalBurned(),
      rc.name(),
      rc.symbol(),
      rc.decimals(),
      rc.paused(),
      rc.owner(),
    ]);

  // Owner balance
  const ownerBalanceWei = await rc.balanceOf(owner);
  const totalSupplyFormatted = ethers.formatUnits(totalSupply, 18);
  const ownerBalanceFormatted = ethers.formatUnits(ownerBalanceWei, 18);
  const circulatingSupply = (
    parseFloat(totalSupplyFormatted) - parseFloat(ownerBalanceFormatted)
  ).toFixed(8);

  return {
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupplyFormatted,
    totalSupplyRaw: totalSupply.toString(),
    circulatingSupply,
    circulatingSupplyRaw: (totalSupply - ownerBalanceWei).toString(),
    ownerBalance: ownerBalanceFormatted,
    ownerAddress: owner,
    totalMinted: ethers.formatUnits(totalMinted, 18),
    totalBurned: ethers.formatUnits(totalBurned, 18),
    netMinted: ethers.formatUnits(totalMinted - totalBurned, 18),
    initialSupply: "10000000000",
    isPaused: paused,
    contractAddress: config.contractAddress,
    chainId: config.chainId,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get fee system information.
 * Shows KAIROS transparent fee advantage over USDT/USDC.
 */
async function getFeeInfo() {
  const rc = readOnlyContract;

  const [feeBps, maxFeeBps, feeDenominator, reserveWallet, totalFeesCollected] =
    await Promise.all([
      rc.feeBps(),
      rc.MAX_FEE_BPS(),
      rc.FEE_DENOMINATOR(),
      rc.reserveWallet(),
      rc.totalFeesCollected(),
    ]);

  return {
    currentFeeBps: Number(feeBps),
    currentFeePercent: `${(Number(feeBps) / 100).toFixed(2)}%`,
    maxFeeBps: Number(maxFeeBps),
    maxFeePercent: `${(Number(maxFeeBps) / 100).toFixed(2)}%`,
    feeDenominator: Number(feeDenominator),
    reserveWallet,
    totalFeesCollected: ethers.formatUnits(totalFeesCollected, 18),
    comparison: {
      kairos: "0.08%",
      usdt: "~0.10-0.20%",
      usdc: "~0.10-0.20%",
      savings: "60% cheaper than USDT/USDC",
    },
  };
}

/**
 * Get holder count and top holders info.
 */
async function getHolderBalance(address) {
  if (!ethers.isAddress(address)) throw new Error(`Invalid address: ${address}`);

  const balance = await readOnlyContract.balanceOf(address);
  const isBlacklisted = await readOnlyContract.isBlacklisted(address);
  const isFeeExempt = await readOnlyContract.feeExempt(address);

  return {
    address,
    balance: ethers.formatUnits(balance, 18),
    balanceWei: balance.toString(),
    isBlacklisted,
    isFeeExempt,
  };
}

/**
 * Get the owner wallet's BNB balance (for gas monitoring).
 */
async function getOwnerGasBalance() {
  if (!wallet) return { balance: "0", warning: "No wallet configured" };

  const balance = await provider.getBalance(wallet.address);
  const bnb = ethers.formatEther(balance);

  return {
    address: wallet.address,
    balanceBNB: bnb,
    balanceWei: balance.toString(),
    warning: parseFloat(bnb) < 0.01 ? "LOW GAS — top up BNB for mint/burn operations" : null,
  };
}

/**
 * Get on-chain Proof of Reserves data.
 * This is what makes KAIROS MORE TRANSPARENT than USDT/USDC.
 */
async function getProofOfReserves() {
  const supply = await getSupplyInfo();
  const fees = await getFeeInfo();
  const gasBalance = await getOwnerGasBalance();

  // Owner wallet balance (treasury — not in circulation)
  const ownerBalance = wallet
    ? await getHolderBalance(wallet.address)
    : { balance: "0" };

  const circulatingSupply =
    parseFloat(supply.totalSupply) - parseFloat(ownerBalance.balance);

  return {
    // ── Supply Metrics ────────────────────────────────────
    totalSupply: supply.totalSupply,
    circulatingSupply: circulatingSupply.toFixed(2),
    treasuryHeld: ownerBalance.balance,

    // ── Mint/Burn Audit Trail ─────────────────────────────
    totalMinted: supply.totalMinted,
    totalBurned: supply.totalBurned,
    netMinted: supply.netMinted,

    // ── Fee Transparency ──────────────────────────────────
    feeRate: fees.currentFeePercent,
    totalFeesCollected: fees.totalFeesCollected,
    reserveWallet: fees.reserveWallet,

    // ── System Status ─────────────────────────────────────
    contractPaused: supply.isPaused,
    ownerGas: gasBalance,

    // ── Peg Information ───────────────────────────────────
    peg: {
      target: "1 KAIROS = 1 USD",
      mechanism: "Mint on USD deposit, Burn on USD withdrawal",
      reserveType: "USD fiat reserves held by Kairos 777 Inc.",
    },

    // ── Verification Links ────────────────────────────────
    verification: {
      contract: `https://bscscan.com/token/${config.contractAddress}`,
      holders: `https://bscscan.com/token/${config.contractAddress}#balances`,
      sourceCode: `https://bscscan.com/address/${config.contractAddress}#code`,
      github: "https://github.com/kpkcf47jr2-lab/KairosCoin",
    },

    // ── Timestamp ─────────────────────────────────────────
    lastUpdated: new Date().toISOString(),
    disclaimer:
      "This data is queried in real-time from BNB Smart Chain. " +
      "Verify independently on BscScan.",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                        EVENT LISTENER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Listen for on-chain Mint/Burn events for real-time tracking.
 */
function startEventListener(onMint, onBurn, onFee) {
  if (!readOnlyContract) return;

  readOnlyContract.on("Mint", (to, amount, event) => {
    const data = {
      type: "MINT",
      to,
      amount: ethers.formatUnits(amount, 18),
      txHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
    };
    logger.info("On-chain MINT event detected", data);
    if (onMint) onMint(data);
  });

  readOnlyContract.on("Burn", (from, amount, event) => {
    const data = {
      type: "BURN",
      from,
      amount: ethers.formatUnits(amount, 18),
      txHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
    };
    logger.info("On-chain BURN event detected", data);
    if (onBurn) onBurn(data);
  });

  readOnlyContract.on("FeeCollected", (from, to, feeAmount, reserveWallet, event) => {
    const data = {
      type: "FEE",
      from,
      to,
      fee: ethers.formatUnits(feeAmount, 18),
      reserveWallet,
      txHash: event.log.transactionHash,
    };
    logger.info("On-chain FEE event detected", data);
    if (onFee) onFee(data);
  });

  logger.info("Event listeners started for Mint, Burn, FeeCollected");
}

// ═════════════════════════════════════════════════════════════════════════════
//                           EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  mint,
  burn,
  getSupplyInfo,
  getFeeInfo,
  getHolderBalance,
  getOwnerGasBalance,
  getProofOfReserves,
  startEventListener,
  getProvider: () => provider,
  getWallet: () => wallet,
  getContract: () => contract,
};
