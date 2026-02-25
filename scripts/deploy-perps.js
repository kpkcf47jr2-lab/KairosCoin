// ═══════════════════════════════════════════════════════════════════════════════
//  Deploy KairosPerps — Perpetual Trading Contract on Arbitrum
//  Routes orders to GMX V2 via authorized relayer
//
//  Usage: npx hardhat run scripts/deploy-perps.js --network arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  KairosPerps Deployment — Arbitrum");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Constructor arguments ──
  const KAIROS_TOKEN = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3"; // KAIROS on Arbitrum
  const RELAYER = deployer.address; // Backend relayer = deployer for now
  const VAULT = deployer.address;   // Will update to KairosVault later
  const TREASURY = "0xCee44904A6aA94dEa28754373887E07D4B6f4968"; // Owner wallet
  const INSURANCE = deployer.address; // Insurance fund = deployer for now

  console.log("Constructor args:");
  console.log(`  KAIROS:    ${KAIROS_TOKEN}`);
  console.log(`  Relayer:   ${RELAYER}`);
  console.log(`  Vault:     ${VAULT}`);
  console.log(`  Treasury:  ${TREASURY}`);
  console.log(`  Insurance: ${INSURANCE}\n`);

  // ── Deploy ──
  console.log("Deploying KairosPerps...");
  const KairosPerps = await hre.ethers.getContractFactory("KairosPerps");
  const perps = await KairosPerps.deploy(
    KAIROS_TOKEN,
    RELAYER,
    VAULT,
    TREASURY,
    INSURANCE
  );
  
  await perps.waitForDeployment();
  const address = await perps.getAddress();
  
  console.log(`\n✅ KairosPerps deployed to: ${address}`);
  console.log(`   Network: Arbitrum One (42161)`);
  console.log(`   Tx: ${perps.deploymentTransaction()?.hash}\n`);

  // ── Verify on Arbiscan ──
  console.log("Waiting 30s for block confirmations before verification...");
  await new Promise(r => setTimeout(r, 30000));
  
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [KAIROS_TOKEN, RELAYER, VAULT, TREASURY, INSURANCE],
    });
    console.log("✅ Contract verified on Arbiscan!");
  } catch (err) {
    console.log("⚠️  Verification failed (can retry manually):", err.message);
  }

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Contract:  ${address}`);
  console.log(`  Network:   Arbitrum One`);
  console.log(`  Relayer:   ${RELAYER}`);
  console.log(`  Token:     ${KAIROS_TOKEN}`);
  console.log("");
  console.log("  Next steps:");
  console.log("  1. Set KAIROS_PERPS_ADDRESS in backend .env");
  console.log("  2. Fund contract with KAIROS for profit payouts");
  console.log("  3. Fund relayer wallet with ETH + USDC on Arbitrum");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
