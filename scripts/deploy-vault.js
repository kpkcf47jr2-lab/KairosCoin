// scripts/deploy-vault.js
// ═══════════════════════════════════════════════════════════════════════════════
//  KairosVault — Deployment Script (BSC Mainnet)
//  Owner: Kairos 777 Inc. — Mario Isaac
// ═══════════════════════════════════════════════════════════════════════════════

const hre = require("hardhat");

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Deploying KairosVault (kKAIROS) — Liquidity Vault");
  console.log("  Owner: Kairos 777 Inc.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("  Deployer       :", deployer.address);
  console.log("  Balance        :", hre.ethers.formatEther(balance), "BNB");
  console.log("  Network        :", hre.network.name);
  console.log("");

  // ── Addresses ─────────────────────────────────────────────────────────────
  // KAIROS token on BSC
  const KAIROS_TOKEN = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3";
  // Treasury = owner wallet (Kairos 777 Inc.)
  const TREASURY = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
  // Insurance fund = same wallet for now (can be changed post-deploy)
  const INSURANCE_FUND = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";

  console.log("  KAIROS Token   :", KAIROS_TOKEN);
  console.log("  Treasury       :", TREASURY);
  console.log("  Insurance Fund :", INSURANCE_FUND);
  console.log("");

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("  ⏳ Deploying KairosVault...\n");

  const KairosVault = await hre.ethers.getContractFactory("KairosVault");
  const vault = await KairosVault.deploy(KAIROS_TOKEN, TREASURY, INSURANCE_FUND);

  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  const name = await vault.name();
  const symbol = await vault.symbol();
  const kairosToken = await vault.kairosToken();
  const treasury = await vault.treasury();
  const insuranceFund = await vault.insuranceFund();
  const owner = await vault.owner();
  const minDeposit = await vault.minDeposit();
  const maxCapacity = await vault.maxVaultCapacity();
  const cooldown = await vault.withdrawalCooldown();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ✅ KairosVault deployed successfully!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Vault Address    :", vaultAddress);
  console.log("  Token Name       :", name);
  console.log("  Symbol           :", symbol);
  console.log("  KAIROS Token     :", kairosToken);
  console.log("  Treasury         :", treasury);
  console.log("  Insurance Fund   :", insuranceFund);
  console.log("  Owner            :", owner);
  console.log("  Min Deposit      :", hre.ethers.formatEther(minDeposit), "KAIROS");
  console.log("  Max Capacity     :", hre.ethers.formatEther(maxCapacity), "KAIROS");
  console.log("  Cooldown         :", Number(cooldown) / 3600, "hours");
  console.log("");
  console.log("  Fee Split:");
  console.log("    Vault LPs      : 70%");
  console.log("    Treasury       : 20%");
  console.log("    Insurance      : 10%");
  console.log("");
  console.log("  📋 Save this address:");
  console.log(`     ${vaultAddress}`);
  console.log("");
  console.log("  🔍 Verify on BscScan:");
  console.log(`     https://bscscan.com/address/${vaultAddress}`);
  console.log("");

  // ── Save deployment info ──────────────────────────────────────────────────
  const fs = require("fs");
  const deploymentInfo = {
    contract: "KairosVault",
    address: vaultAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    kairosToken: KAIROS_TOKEN,
    treasury: TREASURY,
    insuranceFund: INSURANCE_FUND,
    deployedAt: new Date().toISOString(),
    constructorArgs: [KAIROS_TOKEN, TREASURY, INSURANCE_FUND],
  };

  // Append to deployments.json
  let deployments = {};
  try {
    deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  } catch (e) {}
  deployments.KairosVault = deployments.KairosVault || {};
  deployments.KairosVault[hre.network.name] = deploymentInfo;
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  console.log("  💾 Saved to deployments.json");

  // ── Verify instructions ───────────────────────────────────────────────────
  console.log("");
  console.log("  To verify on BscScan, run:");
  console.log(`  npx hardhat verify --network bsc ${vaultAddress} ${KAIROS_TOKEN} ${TREASURY} ${INSURANCE_FUND}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
