/**
 * Bridge ETH (Base) → ETH (Arbitrum) + ETH (Base) → POL (Polygon)
 * Then deploy KairosCoin on both chains.
 * 
 * Usage: node scripts/bridge-and-deploy-all.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const WALLET = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const LIFI_API = "https://li.quest/v1";

const RPCS = {
  base: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

const CHAINS = {
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
};

async function getQuote(fromChain, toChain, fromToken, toToken, amount) {
  const params = new URLSearchParams({
    fromChain: fromChain.toString(),
    toChain: toChain.toString(),
    fromToken,
    toToken,
    fromAmount: amount,
    fromAddress: WALLET,
    toAddress: WALLET,
    slippage: "0.03",
  });

  const response = await fetch(`${LIFI_API}/quote?${params}`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Quote failed: ${response.status} — ${err}`);
  }
  return response.json();
}

async function bridge(fromChainName, toChainName, amountEth) {
  console.log(`\n🌉 Bridging ${amountEth} ETH: ${fromChainName} → ${toChainName}...`);
  
  const provider = new ethers.JsonRpcProvider(RPCS[fromChainName]);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const amountWei = ethers.parseEther(amountEth).toString();

  // Get quote
  const quote = await getQuote(
    CHAINS[fromChainName],
    CHAINS[toChainName],
    NATIVE,
    NATIVE,
    amountWei
  );

  const estimatedOut = ethers.formatEther(quote.estimate.toAmount);
  console.log(`   Bridge: ${quote.tool}`);
  console.log(`   Send: ${amountEth} ETH → Receive: ~${parseFloat(estimatedOut).toFixed(6)} on ${toChainName}`);

  // Send
  const tx = await wallet.sendTransaction({
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value,
    gasLimit: quote.transactionRequest.gasLimit || 500000,
    gasPrice: quote.transactionRequest.gasPrice,
  });
  
  console.log(`   TX: ${tx.hash}`);
  console.log(`   ⏳ Confirming on ${fromChainName}...`);
  await tx.wait();
  console.log(`   ✅ Confirmed!`);

  // Wait for arrival
  const destProvider = new ethers.JsonRpcProvider(RPCS[toChainName]);
  const startBalance = await destProvider.getBalance(WALLET);
  
  console.log(`   🔄 Waiting for ${toChainName} arrival...`);
  
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const newBalance = await destProvider.getBalance(WALLET);
    if (newBalance > startBalance) {
      const received = newBalance - startBalance;
      console.log(`   🎉 Received ${ethers.formatEther(received)} on ${toChainName}!`);
      console.log(`   Total balance: ${ethers.formatEther(newBalance)}`);
      return true;
    }
    process.stdout.write(`   [${(i+1)*5}s] Waiting...\r`);
  }
  
  console.log(`   ⏰ Timeout — may still be in transit`);
  return false;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🚀 Multi-Chain Bridge & Deploy");
  console.log("  Base → Arbitrum + Polygon");
  console.log("═══════════════════════════════════════════════════");

  // Check Base balance
  const baseProvider = new ethers.JsonRpcProvider(RPCS.base);
  const baseBal = await baseProvider.getBalance(WALLET);
  console.log(`\n📊 Base balance: ${ethers.formatEther(baseBal)} ETH (~$${(parseFloat(ethers.formatEther(baseBal)) * 1857).toFixed(2)})`);

  // We need to split: ~0.002 ETH for Arbitrum, ~0.002 ETH for Polygon, keep rest for Base
  const arbAmount = "0.002";   // ~$3.70 — plenty for deploy ($0.50-2 gas)
  const polyAmount = "0.002";  // ~$3.70 — will convert to POL (~sufficient)

  // ── 1. Bridge to Arbitrum ─────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("STEP 1: Bridge to Arbitrum");
  console.log("─".repeat(50));
  await bridge("base", "arbitrum", arbAmount);

  // Brief pause between bridges
  await new Promise(r => setTimeout(r, 3000));

  // ── 2. Bridge to Polygon ──────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("STEP 2: Bridge to Polygon");
  console.log("─".repeat(50));
  await bridge("base", "polygon", polyAmount);

  // ── Final balances ────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("FINAL BALANCES:");
  console.log("─".repeat(50));
  
  for (const [name, rpc] of Object.entries(RPCS)) {
    const p = new ethers.JsonRpcProvider(rpc);
    const b = await p.getBalance(WALLET);
    console.log(`   ${name}: ${ethers.formatEther(b)}`);
  }

  console.log("\n✅ Ready to deploy! Run:");
  console.log("   npx hardhat run scripts/deploy-multichain.js --network arbitrum");
  console.log("   npx hardhat run scripts/deploy-multichain.js --network polygon");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
