// Swap 8 ARB → USDC to get above $10 for GMX
require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const p = new ethers.JsonRpcProvider("https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0");
  const w = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, p);
  const router = new ethers.Contract("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ], w);
  const usdc = new ethers.Contract("0xaf88d065e77c8cC2239327C5EDb3A432268e5831", ["function balanceOf(address) view returns (uint256)"], p);
  const arb = new ethers.Contract("0x912CE59144191C1204E64559FE8253a0e49E6548", ["function balanceOf(address) view returns (uint256)"], p);

  const tx = await router.exactInputSingle({
    tokenIn: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    tokenOut: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    fee: 500,
    recipient: w.address,
    amountIn: ethers.parseEther("8"),
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  }, { gasLimit: 300000 });

  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("USDC:", ethers.formatUnits(await usdc.balanceOf(w.address), 6));
  console.log("ARB:", ethers.formatEther(await arb.balanceOf(w.address)));
  console.log("ETH:", ethers.formatEther(await p.getBalance(w.address)));
}

main().catch(e => console.error("Error:", e.message));
