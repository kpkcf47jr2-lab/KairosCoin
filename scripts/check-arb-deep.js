const { ethers } = require("ethers");
const wallet = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const arb = new ethers.JsonRpcProvider("https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0");

// All common stablecoins on Arbitrum
const tokens = {
  "USDT":       "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  "USDC":       "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "USDC.e":     "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  "DAI":        "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  "FRAX":       "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
  "TUSD":       "0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07",
  "WETH":       "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  "ARB":        "0x912CE59144191C1204E64559FE8253a0e49E6548",
  "WBTC":       "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
};

async function main() {
  const eth = await arb.getBalance(wallet);
  console.log(`ETH: ${ethers.formatEther(eth)} (~$${(parseFloat(ethers.formatEther(eth)) * 2800).toFixed(2)})`);
  console.log("");

  for (const [name, addr] of Object.entries(tokens)) {
    try {
      const contract = new ethers.Contract(addr, ERC20_ABI, arb);
      const decimals = await contract.decimals();
      const balance = await contract.balanceOf(wallet);
      const formatted = ethers.formatUnits(balance, decimals);
      if (parseFloat(formatted) > 0) {
        console.log(`✅ ${name}: ${formatted}`);
      } else {
        console.log(`   ${name}: 0`);
      }
    } catch (e) {
      console.log(`   ${name}: error - ${e.message.slice(0, 50)}`);
    }
  }

  // Also check recent incoming transactions
  console.log("\n--- Wallet address being checked ---");
  console.log(wallet);
  console.log("View on Arbiscan: https://arbiscan.io/address/" + wallet);
}

main().catch(e => console.error(e.message));
