const { ethers } = require("ethers");
require("dotenv").config();

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const WALLET = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  );

  console.log("Checking all possible contract addresses on Polygon...\n");

  for (let nonce = 0; nonce < 5; nonce++) {
    const addr = ethers.getCreateAddress({ from: WALLET, nonce });
    const code = await provider.getCode(addr);
    const hasCode = code !== "0x";
    console.log(`Nonce ${nonce}: ${addr} → ${hasCode ? "✅ CONTRACT EXISTS" : "❌ empty"}`);
  }
}

main().catch(console.error);
