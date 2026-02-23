// scripts/deploy-multichain.js
// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin (KAIROS) — Multi-Chain Deployment Script
//  Deploys the same contract to any supported network.
//  Usage: npx hardhat run scripts/deploy-multichain.js --network <network>
//
//  Supported networks: bsc, polygon, base, arbitrum, ethereum
//  Owner: Kairos 777 Inc. — Mario Isaac
// ═══════════════════════════════════════════════════════════════════════════════

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chain metadata for pretty output
const CHAIN_INFO = {
  bsc:      { name: "BNB Smart Chain", explorer: "https://bscscan.com", symbol: "BNB" },
  polygon:  { name: "Polygon",         explorer: "https://polygonscan.com", symbol: "POL" },
  base:     { name: "Base",            explorer: "https://basescan.org", symbol: "ETH" },
  arbitrum: { name: "Arbitrum One",    explorer: "https://arbiscan.io", symbol: "ETH" },
  ethereum: { name: "Ethereum",        explorer: "https://etherscan.io", symbol: "ETH" },
  hardhat:  { name: "Hardhat Local",   explorer: "N/A", symbol: "ETH" },
};

// Deployments log file
const DEPLOYMENTS_FILE = path.join(__dirname, "..", "deployments.json");

async function main() {
  const network = hre.network.name;
  const chainInfo = CHAIN_INFO[network] || { name: network, explorer: "N/A", symbol: "???" };

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  KairosCoin (KAIROS) — Multi-Chain Deployment");
  console.log("  \"In God We Trust\"");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Network    : ${chainInfo.name} (${network})`);
  console.log(`  Chain ID   : ${hre.network.config.chainId || "auto"}`);
  console.log(`  Explorer   : ${chainInfo.explorer}`);
  console.log("");

  // ── Get deployer info ──────────────────────────────────────────────────
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`  Deployer   : ${deployer.address}`);
  console.log(`  Balance    : ${hre.ethers.formatEther(balance)} ${chainInfo.symbol}`);
  console.log("");

  if (balance === 0n) {
    console.error("  ❌ ERROR: Deployer has 0 balance. Send gas to this address first.");
    process.exit(1);
  }

  // ── Configuration ─────────────────────────────────────────────────────
  const ADMIN_WALLET = process.env.ADMIN_WALLET || deployer.address;
  const RESERVE_WALLET = process.env.RESERVE_WALLET || deployer.address;

  console.log(`  Admin      : ${ADMIN_WALLET}`);
  console.log(`  Reserve    : ${RESERVE_WALLET}`);
  console.log("");
  console.log("  Deploying...");
  console.log("");

  // ── Deploy ────────────────────────────────────────────────────────────
  const KairosCoin = await hre.ethers.getContractFactory("KairosCoin");
  const kairos = await KairosCoin.deploy(ADMIN_WALLET, RESERVE_WALLET);

  await kairos.waitForDeployment();

  const contractAddress = await kairos.getAddress();
  const deployTx = kairos.deploymentTransaction();

  // Wait a few seconds for state to propagate
  console.log("  ⏳ Waiting for state confirmation...");
  await new Promise(r => setTimeout(r, 5000));

  let name, symbol, totalSupply, feeBps;
  try {
    totalSupply = await kairos.totalSupply();
    name = await kairos.name();
    symbol = await kairos.symbol();
    feeBps = await kairos.feeBps();
  } catch (e) {
    // Fallback: contract deployed but can't read yet
    console.log("  ⚠️  Contract deployed but state not readable yet. Using defaults.");
    name = "KairosCoin";
    symbol = "KAIROS";
    totalSupply = hre.ethers.parseEther("10000000000");
    feeBps = 8n;
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ✅ DEPLOYMENT SUCCESSFUL!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Network          : ${chainInfo.name}`);
  console.log(`  Contract Address : ${contractAddress}`);
  console.log(`  Token            : ${name} (${symbol})`);
  console.log(`  Total Supply     : ${hre.ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`  Fee              : ${feeBps.toString()} bps (0.08%)`);
  console.log(`  Owner            : ${ADMIN_WALLET}`);
  console.log(`  TX Hash          : ${deployTx?.hash || "N/A"}`);
  console.log(`  Explorer         : ${chainInfo.explorer}/address/${contractAddress}`);
  console.log("");

  // ── Save deployment record ────────────────────────────────────────────
  let deployments = {};
  try {
    deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, "utf8"));
  } catch (_) {
    // File doesn't exist yet
  }

  deployments[network] = {
    address: contractAddress,
    chainId: hre.network.config.chainId,
    chainName: chainInfo.name,
    explorer: `${chainInfo.explorer}/address/${contractAddress}`,
    txHash: deployTx?.hash || null,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    adminWallet: ADMIN_WALLET,
    reserveWallet: RESERVE_WALLET,
  };

  fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
  console.log(`  📁 Deployment saved to deployments.json`);

  // ── Verify instructions ───────────────────────────────────────────────
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  NEXT STEPS:");
  console.log(`  1. Verify: npx hardhat verify --network ${network} ${contractAddress} "${ADMIN_WALLET}" "${RESERVE_WALLET}"`);
  console.log(`  2. View: ${chainInfo.explorer}/address/${contractAddress}`);
  console.log("  3. Update PROJECT_BIBLE.md with the new address");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  return { network, contractAddress, ADMIN_WALLET, RESERVE_WALLET };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n  ❌ Deployment FAILED:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error("  💡 Send more gas to the deployer wallet");
    }
    process.exit(1);
  });
