// Swap ARB → USDC via Uniswap V3 on Arbitrum
// Then swap ARB → ETH (WETH) for gas
require("dotenv").config();
const { ethers } = require("ethers");

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC = "https://arb-mainnet.g.alchemy.com/v2/QcDRXt-r9WOv3CjtZ0WE0";

// Uniswap V3 SwapRouter02 on Arbitrum
const SWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
// Tokens
const ARB_TOKEN  = "0x912CE59144191C1204E64559FE8253a0e49E6548";
const USDC_TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // native USDC
const WETH_TOKEN = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// SwapRouter02 ABI (exactInputSingle)
const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) external payable",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Wallet:", wallet.address);

  const arbToken = new ethers.Contract(ARB_TOKEN, ERC20_ABI, wallet);
  const usdcToken = new ethers.Contract(USDC_TOKEN, ERC20_ABI, wallet);
  const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);

  // Check balances
  const arbBal = await arbToken.balanceOf(wallet.address);
  const ethBal = await provider.getBalance(wallet.address);
  console.log("ARB balance:", ethers.formatEther(arbBal));
  console.log("ETH balance:", ethers.formatEther(ethBal));

  // === STEP 1: Approve ARB for SwapRouter ===
  const arbToSwap = ethers.parseEther("12"); // 10 for USDC + 2 for ETH
  console.log("\n--- Approving ARB for SwapRouter ---");
  
  const currentAllowance = await arbToken.allowance(wallet.address, SWAP_ROUTER);
  if (currentAllowance < arbToSwap) {
    const approveTx = await arbToken.approve(SWAP_ROUTER, ethers.MaxUint256);
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("Approved ✓");
  } else {
    console.log("Already approved ✓");
  }

  // === STEP 2: Swap 10 ARB → USDC ===
  const arbForUsdc = ethers.parseEther("10");
  console.log("\n--- Swapping 10 ARB → USDC ---");
  
  const swapParams1 = {
    tokenIn: ARB_TOKEN,
    tokenOut: USDC_TOKEN,
    fee: 500, // 0.05% pool (most liquid for ARB/USDC)
    recipient: wallet.address,
    amountIn: arbForUsdc,
    amountOutMinimum: 0, // Accept any amount (small swap, low slippage)
    sqrtPriceLimitX96: 0,
  };

  try {
    const tx1 = await router.exactInputSingle(swapParams1, { gasLimit: 300000 });
    console.log("Swap tx:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("Swap confirmed! Block:", receipt1.blockNumber);
    
    const usdcBal = await usdcToken.balanceOf(wallet.address);
    console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));
  } catch (e) {
    console.log("0.05% pool failed, trying 0.3% pool...");
    swapParams1.fee = 3000;
    const tx1 = await router.exactInputSingle(swapParams1, { gasLimit: 300000 });
    console.log("Swap tx:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("Swap confirmed! Block:", receipt1.blockNumber);
    
    const usdcBal = await usdcToken.balanceOf(wallet.address);
    console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));
  }

  // === STEP 3: Swap 2 ARB → WETH (then unwrap to ETH) ===
  const arbForEth = ethers.parseEther("2");
  console.log("\n--- Swapping 2 ARB → ETH ---");
  
  const swapParams2 = {
    tokenIn: ARB_TOKEN,
    tokenOut: WETH_TOKEN,
    fee: 500, // 0.05% pool
    recipient: wallet.address, // receive as WETH first
    amountIn: arbForEth,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  try {
    const tx2 = await router.exactInputSingle(swapParams2, { gasLimit: 300000 });
    console.log("Swap tx:", tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("Swap confirmed! Block:", receipt2.blockNumber);
  } catch (e) {
    console.log("0.05% pool failed, trying 0.3% pool...");
    swapParams2.fee = 3000;
    const tx2 = await router.exactInputSingle(swapParams2, { gasLimit: 300000 });
    console.log("Swap tx:", tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("Swap confirmed! Block:", receipt2.blockNumber);
  }

  // === Final balances ===
  console.log("\n=== FINAL BALANCES ===");
  const finalEth = await provider.getBalance(wallet.address);
  const finalArb = await arbToken.balanceOf(wallet.address);
  const finalUsdc = await usdcToken.balanceOf(wallet.address);
  const wethToken = new ethers.Contract(WETH_TOKEN, ERC20_ABI, provider);
  const finalWeth = await wethToken.balanceOf(wallet.address);
  
  console.log("ETH:", ethers.formatEther(finalEth));
  console.log("WETH:", ethers.formatEther(finalWeth));
  console.log("ARB:", ethers.formatEther(finalArb));
  console.log("USDC:", ethers.formatUnits(finalUsdc, 6));
  console.log("\n✅ Relayer ready for GMX V2 trading!");
}

main().catch(e => {
  console.error("Error:", e.message);
  if (e.data) console.error("Data:", e.data);
});
