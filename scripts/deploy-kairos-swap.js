// ═══════════════════════════════════════════════════════════════════════════════
//  Deploy KairosSwap AMM — Factory + Router
//  Owner: Kairos 777 Inc. — Mario Isaac
//  "In God We Trust"
//
//  Usage:
//    npx hardhat run scripts/deploy-kairos-swap.js --network bsc
// ═══════════════════════════════════════════════════════════════════════════════

const hre = require("hardhat");

// WETH / WBNB addresses per chain
const WRAPPED_NATIVE = {
  56:    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB on BSC
  1:     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on ETH
  8453:  "0x4200000000000000000000000000000000000006", // WETH on Base
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arbitrum
  137:   "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WPOL on Polygon
  31337: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // Hardhat local (fake)
};

// Kairos 777 Treasury (receives protocol fees)
const KAIROS_TREASURY = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const chainId = (await deployer.provider.getNetwork()).chainId;
  const chainIdNum = Number(chainId);

  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  KairosSwap AMM — Deployment");
  console.log("  Chain ID:", chainIdNum);
  console.log("  Deployer:", deployer.address);
  console.log("  Treasury:", KAIROS_TREASURY);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const wrappedNative = WRAPPED_NATIVE[chainIdNum];
  if (!wrappedNative) {
    throw new Error(`No WETH/WBNB configured for chain ${chainIdNum}`);
  }
  console.log("  Wrapped Native:", wrappedNative);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("  Deployer Balance:", hre.ethers.formatEther(balance), "native\n");

  // ── Step 1: Deploy Factory ──
  console.log("1) Deploying KairosSwapFactory...");
  const Factory = await hre.ethers.getContractFactory("KairosSwapFactory");
  const factory = await Factory.deploy(KAIROS_TREASURY);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("   Factory deployed at:", factoryAddr);

  // Verify feeTo is set correctly
  const feeTo = await factory.feeTo();
  console.log("   Fee recipient (feeTo):", feeTo);

  // ── Step 2: Deploy Router ──
  console.log("\n2) Deploying KairosSwapRouter...");
  const Router = await hre.ethers.getContractFactory("KairosSwapRouter");
  const router = await Router.deploy(factoryAddr, wrappedNative);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("   Router deployed at:", routerAddr);

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Factory:", factoryAddr);
  console.log("  Router: ", routerAddr);
  console.log("  WETH:   ", wrappedNative);
  console.log("  Fee To: ", feeTo);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Save deployment info ──
  const fs = require("fs");
  const deploymentInfo = {
    chainId: chainIdNum,
    factory: factoryAddr,
    router: routerAddr,
    wrappedNative,
    feeTo,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const filePath = `./deployments-kairos-swap-${chainIdNum}.json`;
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to ${filePath}`);

  // ── Optional: Verify on block explorer ──
  if (chainIdNum !== 31337) {
    console.log("\nWaiting 30s before verification...");
    await new Promise(r => setTimeout(r, 30000));

    try {
      console.log("Verifying Factory...");
      await hre.run("verify:verify", {
        address: factoryAddr,
        constructorArguments: [KAIROS_TREASURY],
      });
      console.log("Factory verified!");
    } catch (e) {
      console.log("Factory verification:", e.message?.slice(0, 100));
    }

    try {
      console.log("Verifying Router...");
      await hre.run("verify:verify", {
        address: routerAddr,
        constructorArguments: [factoryAddr, wrappedNative],
      });
      console.log("Router verified!");
    } catch (e) {
      console.log("Router verification:", e.message?.slice(0, 100));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
