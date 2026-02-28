const { ethers } = require("ethers");

const bsc = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org");
const arb = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
const base = new ethers.JsonRpcProvider("https://mainnet.base.org");
const polygon = new ethers.JsonRpcProvider("https://polygon-rpc.com");

const contracts = [
  // ── Root contracts/ ──
  { name: "KairosCoin (BSC)",         addr: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3", p: bsc },
  { name: "KairosCoin (Base)",        addr: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3", p: base },
  { name: "KairosCoin (Arbitrum)",    addr: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3", p: arb },
  { name: "KairosCoin (Polygon)",     addr: "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9", p: polygon },
  { name: "KairosVault (BSC)",        addr: "0x15E86d52D058e7AA5373906CC790aAbE82d14de9", p: bsc },
  { name: "KairosPerps (Arbitrum)",   addr: "0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9", p: arb },
  { name: "KairosSwapFactory (BSC)",  addr: "0xB5891c54199d539CB8afd37BFA9E17370095b9D9", p: bsc },
  { name: "KairosSwapRouter (BSC)",   addr: "0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6", p: bsc },

  // ── kairos-exchange/contracts/ (FeeModule + KairosRouter) ──
  // No known addresses — these may or may not have been deployed
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  KAIROS CONTRACT DEPLOYMENT STATUS CHECK");
  console.log("═══════════════════════════════════════════════════════════\n");

  for (const c of contracts) {
    try {
      const code = await c.p.getCode(c.addr);
      const deployed = code !== "0x" && code.length > 2;
      const icon = deployed ? "✅" : "❌";
      console.log(`${icon} ${c.name}`);
      console.log(`   ${c.addr} ${deployed ? "(DEPLOYED - " + code.length + " bytes)" : "(NO CODE)"}\n`);
    } catch (err) {
      console.log(`⚠️  ${c.name} — ERROR: ${err.message}\n`);
    }
  }

  // Also check deployer nonce on BSC to see how many txs have been sent
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DEPLOYER WALLET STATUS");
  console.log("═══════════════════════════════════════════════════════════\n");

  const deployer = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
  const nonce = await bsc.getTransactionCount(deployer);
  const balance = await bsc.getBalance(deployer);
  console.log(`  Address: ${deployer}`);
  console.log(`  BSC Nonce: ${nonce} (total transactions)`);
  console.log(`  BSC Balance: ${ethers.formatEther(balance)} BNB`);

  // Check the last few deployed contract addresses by computing CREATE addresses
  console.log("\n  Recent CREATE addresses (nonce-based):");
  for (let i = Math.max(0, nonce - 10); i < nonce; i++) {
    const addr = ethers.getCreateAddress({ from: deployer, nonce: i });
    const code = await bsc.getCode(addr);
    const hasCode = code !== "0x" && code.length > 2;
    console.log(`   nonce ${i}: ${addr} ${hasCode ? "✅ HAS CODE (" + code.length + " bytes)" : "— empty"}`);
  }
}

main().catch(console.error);
