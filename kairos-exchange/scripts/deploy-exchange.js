const hre = require("hardhat");

// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Exchange — Deploy Script
//  Deploys: FeeModule → KairosRouter → Adapters
//  Owner: Kairos 777 Inc.
// ═══════════════════════════════════════════════════════════════════════════════

// ── BSC Addresses ──
const ADDRESSES = {
  56: { // BSC Mainnet
    kairos:         "0x14D41707269c7D8b8DFa5095b38824a46dA05da3",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968", // Owner wallet
    wbnb:           "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    pancakeRouter:  "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    sushiRouter:    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  },
  97: { // BSC Testnet
    kairos:         "0x0000000000000000000000000000000000000000",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
    wbnb:           "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    pancakeRouter:  "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    sushiRouter:    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  },
  1: { // Ethereum
    kairos:         "0x0000000000000000000000000000000000000000",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
    wbnb:           "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    pancakeRouter:  "0xEfF92A263d31888d860bD50809A8D171709b7b1c", // PCS on ETH
    sushiRouter:    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  },
  137: { // Polygon
    kairos:         "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
    wbnb:           "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    pancakeRouter:  "0x0000000000000000000000000000000000000000", // No PCS on Polygon
    sushiRouter:    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  },
  42161: { // Arbitrum
    kairos:         "0x14D41707269c7D8b8DFa5095b38824a46dA05da3",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
    wbnb:           "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    pancakeRouter:  "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb", // PCS on Arb
    sushiRouter:    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  },
  8453: { // Base
    kairos:         "0x14D41707269c7D8b8DFa5095b38824a46dA05da3",
    treasury:       "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
    wbnb:           "0x4200000000000000000000000000000000000006", // WETH
    pancakeRouter:  "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb", // PCS on Base
    sushiRouter:    "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  },
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const addresses = ADDRESSES[Number(chainId)];

  if (!addresses) {
    throw new Error(`No addresses configured for chain ${chainId}`);
  }

  console.log("═══════════════════════════════════════════");
  console.log("  KAIROS EXCHANGE — Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Chain:    ${chainId}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} native`);
  console.log("═══════════════════════════════════════════\n");

  // ── 1. Deploy FeeModule ──
  console.log("1/4  Deploying FeeModule...");
  const FeeModule = await hre.ethers.getContractFactory("FeeModule");
  const feeModule = await FeeModule.deploy(
    addresses.treasury,
    addresses.kairos,
    deployer.address
  );
  await feeModule.waitForDeployment();
  const feeAddr = await feeModule.getAddress();
  console.log(`     ✓ FeeModule: ${feeAddr}`);

  // ── 2. Deploy KairosRouter ──
  console.log("2/4  Deploying KairosRouter...");
  const KairosRouter = await hre.ethers.getContractFactory("KairosRouter");
  const router = await KairosRouter.deploy(
    feeAddr,
    addresses.wbnb,
    deployer.address
  );
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log(`     ✓ KairosRouter: ${routerAddr}`);

  // ── 3. Deploy Adapters ──
  console.log("3/4  Deploying DEX Adapters...");

  // PancakeSwap
  let pancakeAddr = "N/A";
  if (addresses.pancakeRouter !== "0x0000000000000000000000000000000000000000") {
    const PancakeAdapter = await hre.ethers.getContractFactory("PancakeSwapAdapter");
    const pancake = await PancakeAdapter.deploy(addresses.pancakeRouter);
    await pancake.waitForDeployment();
    pancakeAddr = await pancake.getAddress();
    console.log(`     ✓ PancakeSwapAdapter: ${pancakeAddr}`);

    // Register in router
    await router.registerAdapter(pancakeAddr);
    console.log("       → Registered in router");
  } else {
    console.log("     — PancakeSwap not available on this chain, skipping");
  }

  // SushiSwap
  let sushiAddr = "N/A";
  if (addresses.sushiRouter !== "0x0000000000000000000000000000000000000000") {
    const SushiAdapter = await hre.ethers.getContractFactory("SushiSwapAdapter");
    const sushi = await SushiAdapter.deploy(addresses.sushiRouter);
    await sushi.waitForDeployment();
    sushiAddr = await sushi.getAddress();
    console.log(`     ✓ SushiSwapAdapter: ${sushiAddr}`);

    // Register in router
    await router.registerAdapter(sushiAddr);
    console.log("       → Registered in router");
  } else {
    console.log("     — SushiSwap not available on this chain, skipping");
  }

  // ── 4. Summary ──
  console.log("\n═══════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE ✓");
  console.log("═══════════════════════════════════════════");
  console.log(`  FeeModule:          ${feeAddr}`);
  console.log(`  KairosRouter:       ${routerAddr}`);
  console.log(`  PancakeSwapAdapter: ${pancakeAddr}`);
  console.log(`  SushiSwapAdapter:   ${sushiAddr}`);
  console.log("═══════════════════════════════════════════\n");

  // Save deployment info
  const fs = require("fs");
  const deployment = {
    chainId: Number(chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      FeeModule: feeAddr,
      KairosRouter: routerAddr,
      PancakeSwapAdapter: pancakeAddr,
      SushiSwapAdapter: sushiAddr,
    },
  };
  fs.writeFileSync(
    `deployments-exchange-${chainId}.json`,
    JSON.stringify(deployment, null, 2)
  );
  console.log(`Deployment info saved to deployments-exchange-${chainId}.json`);

  // ── Verify contracts (if not local) ──
  if (Number(chainId) !== 31337) {
    console.log("\nWaiting 30s for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 30000));

    try {
      await hre.run("verify:verify", { address: feeAddr, constructorArguments: [addresses.treasury, addresses.kairos, deployer.address] });
      console.log("✓ FeeModule verified");
    } catch (e) { console.log("FeeModule verify:", e.message); }

    try {
      await hre.run("verify:verify", { address: routerAddr, constructorArguments: [feeAddr, addresses.wbnb, deployer.address] });
      console.log("✓ KairosRouter verified");
    } catch (e) { console.log("KairosRouter verify:", e.message); }

    if (pancakeAddr !== "N/A") {
      try {
        await hre.run("verify:verify", { address: pancakeAddr, constructorArguments: [addresses.pancakeRouter] });
        console.log("✓ PancakeSwapAdapter verified");
      } catch (e) { console.log("PancakeSwapAdapter verify:", e.message); }
    }

    if (sushiAddr !== "N/A") {
      try {
        await hre.run("verify:verify", { address: sushiAddr, constructorArguments: [addresses.sushiRouter] });
        console.log("✓ SushiSwapAdapter verified");
      } catch (e) { console.log("SushiSwapAdapter verify:", e.message); }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
