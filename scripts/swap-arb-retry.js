// Swap remaining ARB → USDC using 0.3% fee tier
require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const p = new ethers.JsonRpcProvider("https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0");
  const w = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, p);
  const router = new ethers.Contract("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ], w);
  const usdc = new ethers.Contract("0xaf88d065e77c8cC2239327C5EDb3A432268e5831", ["function balanceOf(address) view returns (uint256)"], p);
  const arb = new ethers.Contract("0x912CE59144191C1204E64559FE8253a0e49E6548", [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
  ], w);

  const arbBal = await arb.balanceOf(w.address);
  console.log("ARB balance:", ethers.formatEther(arbBal));
  console.log("USDC before:", ethers.formatUnits(await usdc.balanceOf(w.address), 6));

  // Try fee tiers: 3000 (0.3%), 10000 (1%)
  for (const fee of [3000, 10000]) {
    try {
      console.log("\nTrying fee tier:", fee / 10000, "%");
      const tx = await router.exactInputSingle({
        tokenIn: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        tokenOut: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        fee: fee,
        recipient: w.address,
        amountIn: ethers.parseEther("8"),
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      }, { gasLimit: 500000 });

      console.log("Tx:", tx.hash);
      await tx.wait();
      console.log("SUCCESS!");
      console.log("USDC:", ethers.formatUnits(await usdc.balanceOf(w.address), 6));
      console.log("ARB:", ethers.formatEther(await arb.balanceOf(w.address)));
      return;
    } catch (e) {
      console.log("Failed:", e.message.slice(0, 80));
    }
  }

  // If direct swap fails, try ARB → WETH → USDC multi-hop
  console.log("\nTrying multi-hop ARB → WETH → USDC...");
  // Use exactInput with path encoding
  const SWAP_ROUTER_MULTI = new ethers.Contract("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", [
    "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)"
  ], w);

  // Encode path: ARB --(0.3%)--> WETH --(0.05%)--> USDC
  const path = ethers.solidityPacked(
    ["address", "uint24", "address", "uint24", "address"],
    ["0x912CE59144191C1204E64559FE8253a0e49E6548", 3000, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 500, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"]
  );

  try {
    const tx = await SWAP_ROUTER_MULTI.exactInput({
      path: path,
      recipient: w.address,
      amountIn: ethers.parseEther("8"),
      amountOutMinimum: 0,
    }, { gasLimit: 500000 });

    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("SUCCESS via multi-hop!");
    console.log("USDC:", ethers.formatUnits(await usdc.balanceOf(w.address), 6));
    console.log("ARB:", ethers.formatEther(await arb.balanceOf(w.address)));
  } catch (e) {
    console.log("Multi-hop failed:", e.message.slice(0, 100));
    console.log("\nCurrent balances:");
    console.log("USDC:", ethers.formatUnits(await usdc.balanceOf(w.address), 6));
    console.log("ARB:", ethers.formatEther(await arb.balanceOf(w.address)));
  }
}

main().catch(e => console.error("Error:", e.message));
