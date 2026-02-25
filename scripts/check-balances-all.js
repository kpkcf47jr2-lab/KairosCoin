const { ethers } = require("ethers");
const wallet = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  // BSC
  const bsc = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org");
  const usdt_bsc = new ethers.Contract("0x55d398326f99059fF775485246999027B3197955", ERC20_ABI, bsc);
  const usdc_bsc = new ethers.Contract("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", ERC20_ABI, bsc);
  const bnb = await bsc.getBalance(wallet);

  // Arbitrum
  const arb = new ethers.JsonRpcProvider("https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0");
  const usdt_arb = new ethers.Contract("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", ERC20_ABI, arb);
  const usdc_arb = new ethers.Contract("0xaf88d065e77c8cC2239327C5EDb3A432268e5831", ERC20_ABI, arb);
  const usdc_e_arb = new ethers.Contract("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", ERC20_ABI, arb);
  const eth_arb = await arb.getBalance(wallet);

  console.log("=== BSC ===");
  console.log("BNB:", ethers.formatEther(bnb));
  console.log("USDT:", ethers.formatUnits(await usdt_bsc.balanceOf(wallet), 18));
  console.log("USDC:", ethers.formatUnits(await usdc_bsc.balanceOf(wallet), 18));

  console.log("\n=== ARBITRUM ===");
  console.log("ETH:", ethers.formatEther(eth_arb));
  console.log("USDT:", ethers.formatUnits(await usdt_arb.balanceOf(wallet), 6));
  console.log("USDC (native):", ethers.formatUnits(await usdc_arb.balanceOf(wallet), 6));
  console.log("USDC.e (bridged):", ethers.formatUnits(await usdc_e_arb.balanceOf(wallet), 6));
}

main().catch(e => console.error(e.message));
