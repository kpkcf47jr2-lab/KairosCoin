/**
 * Bridge BNB (BSC) → ETH (Base) using LI.FI Protocol
 * 
 * Usage: npx hardhat run scripts/bridge-to-base.js
 * 
 * This script:
 * 1. Gets a bridge quote from LI.FI (aggregates Stargate, Across, etc.)
 * 2. Signs and sends the bridge transaction on BSC
 * 3. Waits for confirmation
 * 4. Monitors until ETH arrives on Base
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ── Config ──────────────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const WALLET_ADDRESS = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

// Chain IDs
const BSC_CHAIN_ID = 56;
const BASE_CHAIN_ID = 8453;

// Native token addresses (0xEE...EE = native gas token in LI.FI)
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Amount to bridge (leave some BNB for gas)
const AMOUNT_BNB = "0.018"; // ~$10.6 — leaves ~0.006 BNB for gas fees

// RPC URLs
const BSC_RPC = "https://bsc-dataseed1.binance.org";
const BASE_RPC = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

// ── LI.FI API ───────────────────────────────────────────────────────────────
const LIFI_API = "https://li.quest/v1";

async function getQuote() {
  const amountWei = ethers.parseEther(AMOUNT_BNB).toString();
  
  const params = new URLSearchParams({
    fromChain: BSC_CHAIN_ID.toString(),
    toChain: BASE_CHAIN_ID.toString(),
    fromToken: NATIVE_TOKEN,
    toToken: NATIVE_TOKEN,
    fromAmount: amountWei,
    fromAddress: WALLET_ADDRESS,
    toAddress: WALLET_ADDRESS,
    slippage: "0.03", // 3% slippage
    allowBridges: "stargate,across,cbridge,hop",
  });

  console.log("🔍 Getting bridge quote from LI.FI...");
  console.log(`   From: ${AMOUNT_BNB} BNB (BSC)`);
  console.log(`   To: ETH (Base)`);
  
  const response = await fetch(`${LIFI_API}/quote?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LI.FI quote failed: ${response.status} — ${error}`);
  }
  
  return response.json();
}

async function checkStatus(txHash) {
  const params = new URLSearchParams({
    txHash: txHash,
    bridge: "lifi",
    fromChain: BSC_CHAIN_ID.toString(),
    toChain: BASE_CHAIN_ID.toString(),
  });

  const response = await fetch(`${LIFI_API}/status?${params}`);
  if (!response.ok) return null;
  return response.json();
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🌉 BNB (BSC) → ETH (Base) Bridge");
  console.log("  Powered by LI.FI Protocol");
  console.log("═══════════════════════════════════════════════════\n");

  // ── Setup providers ─────────────────────────────────────────────────────
  const bscProvider = new ethers.JsonRpcProvider(BSC_RPC);
  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, bscProvider);

  // ── Check starting balances ─────────────────────────────────────────────
  const bnbBalance = await bscProvider.getBalance(WALLET_ADDRESS);
  const baseBalance = await baseProvider.getBalance(WALLET_ADDRESS);
  
  console.log("📊 Current Balances:");
  console.log(`   BSC:  ${ethers.formatEther(bnbBalance)} BNB (~$${(parseFloat(ethers.formatEther(bnbBalance)) * 590).toFixed(2)})`);
  console.log(`   Base: ${ethers.formatEther(baseBalance)} ETH (~$${(parseFloat(ethers.formatEther(baseBalance)) * 1857).toFixed(2)})\n`);

  const amountWei = ethers.parseEther(AMOUNT_BNB);
  if (bnbBalance < amountWei + ethers.parseEther("0.003")) {
    console.log("❌ Not enough BNB. Need at least", AMOUNT_BNB, "+ 0.003 for gas");
    console.log("   You have:", ethers.formatEther(bnbBalance), "BNB");
    process.exit(1);
  }

  // ── Get quote ───────────────────────────────────────────────────────────
  let quote;
  try {
    quote = await getQuote();
  } catch (e) {
    console.log("❌ Could not get LI.FI quote:", e.message);
    console.log("\n🔄 Trying alternative: direct Stargate bridge...\n");
    
    // Fallback: try with different parameters
    try {
      const params = new URLSearchParams({
        fromChain: BSC_CHAIN_ID.toString(),
        toChain: BASE_CHAIN_ID.toString(),
        fromToken: NATIVE_TOKEN,
        toToken: NATIVE_TOKEN,
        fromAmount: ethers.parseEther(AMOUNT_BNB).toString(),
        fromAddress: WALLET_ADDRESS,
        toAddress: WALLET_ADDRESS,
        slippage: "0.05",
      });
      
      const response = await fetch(`${LIFI_API}/quote?${params}`);
      if (!response.ok) throw new Error(await response.text());
      quote = await response.json();
    } catch (e2) {
      console.log("❌ Fallback also failed:", e2.message);
      console.log("\n📋 Manual alternative: Go to https://app.across.to/bridge");
      console.log("   Connect MetaMask → BNB Chain → Base → 0.018 BNB");
      process.exit(1);
    }
  }

  // ── Display quote details ───────────────────────────────────────────────
  const estimatedETH = ethers.formatEther(quote.estimate.toAmount);
  const bridgeName = quote.tool || "unknown";
  const gasCostUSD = quote.estimate.gasCosts?.[0]?.amountUSD || "~0.10";
  
  console.log("✅ Quote received!");
  console.log(`   Bridge: ${bridgeName}`);
  console.log(`   Send: ${AMOUNT_BNB} BNB`);
  console.log(`   Receive: ~${parseFloat(estimatedETH).toFixed(6)} ETH on Base`);
  console.log(`   Gas cost: ~$${gasCostUSD}`);
  console.log(`   Estimated time: ${quote.estimate.executionDuration || 60}s\n`);

  // ── Execute bridge transaction ──────────────────────────────────────────
  console.log("🚀 Sending bridge transaction...");
  
  const tx = {
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value,
    gasLimit: quote.transactionRequest.gasLimit || 300000,
    gasPrice: quote.transactionRequest.gasPrice || ethers.parseUnits("3", "gwei"),
  };

  const txResponse = await wallet.sendTransaction(tx);
  console.log(`   TX Hash: ${txResponse.hash}`);
  console.log(`   BSCScan: https://bscscan.com/tx/${txResponse.hash}`);
  console.log("   ⏳ Waiting for BSC confirmation...");

  const receipt = await txResponse.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed})\n`);

  // ── Monitor bridge completion ───────────────────────────────────────────
  console.log("🔄 Monitoring bridge transfer to Base...");
  console.log("   This may take 1-5 minutes...\n");

  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
    attempts++;
    
    // Check Base balance
    const newBaseBalance = await baseProvider.getBalance(WALLET_ADDRESS);
    if (newBaseBalance > baseBalance) {
      const received = newBaseBalance - baseBalance;
      console.log(`\n🎉 SUCCESS! ETH arrived on Base!`);
      console.log(`   Received: ${ethers.formatEther(received)} ETH`);
      console.log(`   New Base balance: ${ethers.formatEther(newBaseBalance)} ETH`);
      console.log(`   (~$${(parseFloat(ethers.formatEther(newBaseBalance)) * 1857).toFixed(2)})`);
      console.log(`\n✅ Ready to deploy! Run:`);
      console.log(`   npx hardhat run scripts/deploy-multichain.js --network base`);
      return;
    }
    
    // Also check status via LI.FI
    try {
      const status = await checkStatus(txResponse.hash);
      if (status?.status === "DONE") {
        const newBal = await baseProvider.getBalance(WALLET_ADDRESS);
        console.log(`\n🎉 Bridge DONE! Base balance: ${ethers.formatEther(newBal)} ETH`);
        return;
      }
      if (status?.status === "FAILED") {
        console.log("❌ Bridge failed:", status.message);
        return;
      }
      process.stdout.write(`   [${attempts * 5}s] Waiting... (status: ${status?.status || 'pending'})\r`);
    } catch {
      process.stdout.write(`   [${attempts * 5}s] Waiting...\r`);
    }
  }
  
  console.log("\n⏰ Timeout — bridge may still be processing.");
  console.log("   Check manually: https://scan.li.fi/");
  console.log(`   TX: ${txResponse.hash}`);
  console.log("   Or run: npx --yes node scripts/check-balances.js");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
