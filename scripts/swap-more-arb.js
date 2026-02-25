// Swap 50 more ARB → USDC (keep ~10 ARB reserve)
require("dotenv").config();
const { ethers } = require("ethers");

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC = "https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0";

const SWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const ARB_TOKEN  = "0x912CE59144191C1204E64559FE8253a0e49E6548";
const USDC_TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
];

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);
  const arbToken = new ethers.Contract(ARB_TOKEN, ERC20_ABI, wallet);
  const usdcToken = new ethers.Contract(USDC_TOKEN, ERC20_ABI, wallet);

  // Swap 50 ARB → USDC
  const arbToSwap = ethers.parseEther("50");
  console.log("Swapping 50 ARB → USDC...");

  const tx = await router.exactInputSingle({
    tokenIn: ARB_TOKEN,
    tokenOut: USDC_TOKEN,
    fee: 500,
    recipient: wallet.address,
    amountIn: arbToSwap,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  }, { gasLimit: 300000 });
  
  console.log("Tx:", tx.hash);
  await tx.wait();

  const finalArb = await arbToken.balanceOf(wallet.address);
  const finalUsdc = await usdcToken.balanceOf(wallet.address);
  const finalEth = await provider.getBalance(wallet.address);
  
  console.log("\n=== BALANCES FINALES ===");
  console.log("ETH:", ethers.formatEther(finalEth));
  console.log("ARB:", ethers.formatEther(finalArb));
  console.log("USDC:", ethers.formatUnits(finalUsdc, 6));
}

main().catch(e => console.error("Error:", e.message));
