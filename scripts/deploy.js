// scripts/deploy.js
// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin (KAIROS) — Deployment Script
//  Owner: Kairos 777 Inc.
//  Administrator: Mario Isaac
// ═══════════════════════════════════════════════════════════════════════════════

const hre = require("hardhat");

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Deploying KairosCoin (KAIROS) — Stablecoin 1:1 USD");
  console.log("  Owner: Kairos 777 Inc.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Configuration ─────────────────────────────────────────────────────────
  // For testnet/mainnet deployment, set this to the actual admin wallet address.
  // For local testing, the first signer is used.
  const [deployer] = await hre.ethers.getSigners();

  // ADMIN_WALLET: Change this address before mainnet deployment!
  const ADMIN_WALLET = process.env.ADMIN_WALLET || deployer.address;

  // RESERVE_WALLET: The Kairos reserve wallet that collects transfer fees.
  // Set via env var for mainnet, defaults to deployer for testing.
  const RESERVE_WALLET = process.env.RESERVE_WALLET || deployer.address;

  console.log("  Deployer address :", deployer.address);
  console.log("  Admin wallet     :", ADMIN_WALLET);
  console.log("  Reserve wallet   :", RESERVE_WALLET);
  console.log("  Network          :", hre.network.name);
  console.log("");

  // ── Deploy ────────────────────────────────────────────────────────────────
  const KairosCoin = await hre.ethers.getContractFactory("KairosCoin");
  const kairos = await KairosCoin.deploy(ADMIN_WALLET, RESERVE_WALLET);

  await kairos.waitForDeployment();

  const contractAddress = await kairos.getAddress();
  const totalSupply = await kairos.totalSupply();
  const name = await kairos.name();
  const symbol = await kairos.symbol();
  const decimals = await kairos.decimals();
  const owner = await kairos.owner();
  const reserveWallet = await kairos.reserveWallet();
  const feeBps = await kairos.feeBps();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ✅ KairosCoin deployed successfully!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Contract Address :", contractAddress);
  console.log("  Token Name       :", name);
  console.log("  Symbol           :", symbol);
  console.log("  Decimals         :", decimals.toString());
  console.log("  Total Supply     :", hre.ethers.formatEther(totalSupply), symbol);
  console.log("  Owner            :", owner);
  console.log("  Reserve Wallet   :", reserveWallet);
  console.log("  Fee Rate         :", feeBps.toString(), "bps (0.08%) — 60% cheaper than USDT/USDC");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  NEXT STEPS:");
  console.log("  1. Verify contract on Etherscan:");
  console.log(`     npx hardhat verify --network ${hre.network.name} ${contractAddress} "${ADMIN_WALLET}" "${RESERVE_WALLET}"`);
  console.log("  2. Configure mint/burn caps if needed");
  console.log("  3. Set fee-exempt addresses (exchanges, bridges, etc.)");
  console.log("  4. Transfer ownership to multisig/timelock if desired");
  console.log("═══════════════════════════════════════════════════════════════");

  return { contractAddress, ADMIN_WALLET, RESERVE_WALLET };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
