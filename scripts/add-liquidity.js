/**
 * ═══════════════════════════════════════════════════════════════
 *  KairosCoin — Add Liquidity on PancakeSwap V2
 *  Creates KAIROS/BNB pool and adds initial liquidity
 *  
 *  Usage: npx hardhat run scripts/add-liquidity.js --network bsc
 * ═══════════════════════════════════════════════════════════════
 */
const { ethers } = require("hardhat");

// ── PancakeSwap V2 Addresses (BSC Mainnet) ──────────────────
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// ── KairosCoin Contract ─────────────────────────────────────
const KAIROS_ADDRESS = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3";

// ── Liquidity Parameters ────────────────────────────────────
// KAIROS is pegged 1:1 to USD
// If depositing ~$190 in BNB → pair with 190 KAIROS
const KAIROS_AMOUNT = "190";      // 190 KAIROS = $190 USD
const SLIPPAGE_PERCENT = 5;       // 5% slippage tolerance
const DEADLINE_MINUTES = 20;      // 20 min deadline

// ── ABIs ────────────────────────────────────────────────────
const ROUTER_ABI = [
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function factory() external view returns (address)",
  "function WETH() external view returns (address)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  KairosCoin — PancakeSwap V2 Liquidity Pool Setup");
  console.log("══════════════════════════════════════════════════════");
  console.log("Signer:", signer.address);

  // ── Get contracts ───────────────────────────────────────
  const kairos = new ethers.Contract(KAIROS_ADDRESS, ERC20_ABI, signer);
  const router = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, signer);
  const factory = new ethers.Contract(PANCAKE_FACTORY, FACTORY_ABI, signer);

  // ── Check balances ──────────────────────────────────────
  const decimals = await kairos.decimals();
  const symbol = await kairos.symbol();
  const kairosBalance = await kairos.balanceOf(signer.address);
  const bnbBalance = await ethers.provider.getBalance(signer.address);

  console.log(`\n📊 Balances:`);
  console.log(`  ${symbol}: ${ethers.formatUnits(kairosBalance, decimals)}`);
  console.log(`  BNB:  ${ethers.formatEther(bnbBalance)}`);

  // ── Calculate amounts ───────────────────────────────────
  const kairosAmount = ethers.parseUnits(KAIROS_AMOUNT, decimals);
  
  // Reserve 0.02 BNB for gas, use the rest
  const gasReserve = ethers.parseEther("0.02");
  const bnbForLiquidity = bnbBalance - gasReserve;

  if (bnbForLiquidity <= 0n) {
    console.error("\n❌ Not enough BNB! Need at least 0.02 BNB (0.01 for gas + some for liquidity)");
    process.exit(1);
  }

  if (kairosBalance < kairosAmount) {
    console.error(`\n❌ Not enough ${symbol}! Need ${KAIROS_AMOUNT}, have ${ethers.formatUnits(kairosBalance, decimals)}`);
    process.exit(1);
  }

  // Slippage
  const kairosMin = kairosAmount * BigInt(100 - SLIPPAGE_PERCENT) / 100n;
  const bnbMin = bnbForLiquidity * BigInt(100 - SLIPPAGE_PERCENT) / 100n;
  const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

  console.log(`\n💰 Liquidity to add:`);
  console.log(`  ${symbol}: ${ethers.formatUnits(kairosAmount, decimals)} (~$${KAIROS_AMOUNT} USD)`);
  console.log(`  BNB:  ${ethers.formatEther(bnbForLiquidity)} (~$${(Number(ethers.formatEther(bnbForLiquidity)) * 627).toFixed(0)} USD)`);
  console.log(`  Slippage: ${SLIPPAGE_PERCENT}%`);

  // ── Check if pair already exists ────────────────────────
  const existingPair = await factory.getPair(KAIROS_ADDRESS, WBNB);
  if (existingPair !== ethers.ZeroAddress) {
    console.log(`\n⚠️  Pair already exists: ${existingPair}`);
    console.log("  Adding to existing pool...");
  } else {
    console.log("\n🆕 Creating new KAIROS/BNB pair...");
  }

  // ── Step 1: Approve Router ──────────────────────────────
  console.log("\n📝 Step 1: Approving PancakeSwap Router...");
  const currentAllowance = await kairos.allowance(signer.address, PANCAKE_ROUTER);
  
  if (currentAllowance < kairosAmount) {
    const approveTx = await kairos.approve(PANCAKE_ROUTER, ethers.MaxUint256);
    console.log(`  Tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log("  ✅ Approved!");
  } else {
    console.log("  ✅ Already approved!");
  }

  // ── Step 2: Add Liquidity ──────────────────────────────
  console.log("\n🚀 Step 2: Adding liquidity...");
  const tx = await router.addLiquidityETH(
    KAIROS_ADDRESS,       // token
    kairosAmount,         // amountTokenDesired
    kairosMin,            // amountTokenMin
    bnbMin,               // amountETHMin
    signer.address,       // LP tokens go to our wallet
    deadline,             // deadline
    { value: bnbForLiquidity }  // BNB sent with transaction
  );

  console.log(`  Tx: ${tx.hash}`);
  console.log("  Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`  ✅ Confirmed in block ${receipt.blockNumber}!`);

  // ── Verify ─────────────────────────────────────────────
  const pairAddress = await factory.getPair(KAIROS_ADDRESS, WBNB);
  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  ✅ LIQUIDITY ADDED SUCCESSFULLY!`);
  console.log(`  Pair Address: ${pairAddress}`);
  console.log(`  View on PancakeSwap:`);
  console.log(`  https://pancakeswap.finance/info/v2/pairs/${pairAddress}`);
  console.log(`  View on BscScan:`);
  console.log(`  https://bscscan.com/address/${pairAddress}`);
  console.log(`══════════════════════════════════════════════════════\n`);
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message || error);
  process.exit(1);
});
