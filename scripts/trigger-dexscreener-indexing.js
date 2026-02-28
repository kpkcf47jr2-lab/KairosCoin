// ═══════════════════════════════════════════════════════════════
//  Trigger DexScreener indexing by executing small swaps
//  on PancakeSwap and KairosSwap KAIROS/WBNB pairs
//  This generates Swap events that DexScreener's indexer picks up
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const { ethers } = require('ethers');

// ── Config ──
const RPC       = 'https://bsc-dataseed1.binance.org';
const KAIROS    = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const WBNB      = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PRIV_KEY  = process.env.DEPLOYER_PRIVATE_KEY;

// PancakeSwap V2 Router
const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
// KairosSwap Router
const KAIROS_ROUTER  = '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6';

// Swap amount: 0.001 BNB (~$0.60)
const SWAP_AMOUNT = ethers.parseEther('0.001');

const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];
const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

async function doSwap(routerAddress, routerName, wallet, provider) {
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 min

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Swap on ${routerName}: ${ethers.formatEther(SWAP_AMOUNT)} BNB → KAIROS`);
  console.log(`${'═'.repeat(60)}`);

  // 1. Get expected output
  try {
    const amounts = await router.getAmountsOut(SWAP_AMOUNT, [WBNB, KAIROS]);
    const expectedKairos = ethers.formatEther(amounts[1]);
    console.log(`Expected output: ~${parseFloat(expectedKairos).toFixed(4)} KAIROS`);
  } catch (e) {
    console.log('Could not estimate output (pair may not have this route)');
  }

  // 2. Execute swap BNB → KAIROS (accept any amount, it's a tiny swap)
  console.log('Executing BNB → KAIROS swap...');
  try {
    const tx = await router.swapExactETHForTokens(
      0, // accept any amount out (it's a tiny test swap)
      [WBNB, KAIROS],
      wallet.address,
      deadline,
      { value: SWAP_AMOUNT, gasLimit: 300000 }
    );
    console.log(`  TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  ✅ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed.toString()})`);
    console.log(`  https://bscscan.com/tx/${tx.hash}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Swap failed: ${err.message?.substring(0, 200)}`);
    return false;
  }
}

(async () => {
  if (!PRIV_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIV_KEY, provider);
  console.log('Wallet:', wallet.address);

  const bnbBal = await provider.getBalance(wallet.address);
  console.log('BNB balance:', ethers.formatEther(bnbBal));

  // Need at least 0.005 BNB for 2 swaps + gas
  if (bnbBal < ethers.parseEther('0.005')) {
    console.error('ERROR: Need at least 0.005 BNB for swaps + gas');
    process.exit(1);
  }

  // Swap 1: PancakeSwap BNB → KAIROS
  const ok1 = await doSwap(PANCAKE_ROUTER, 'PancakeSwap V2', wallet, provider);

  // Wait a bit between swaps
  if (ok1) {
    console.log('\nWaiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Swap 2: KairosSwap BNB → KAIROS
  const ok2 = await doSwap(KAIROS_ROUTER, 'KairosSwap', wallet, provider);

  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`PancakeSwap swap: ${ok1 ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`KairosSwap swap:  ${ok2 ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (ok1 || ok2) {
    console.log('\n🎯 Swap events generated! DexScreener should index within minutes to hours.');
    console.log('   Check: https://dexscreener.com/bsc/0x14D41707269c7D8b8DFa5095b38824a46dA05da3');
    console.log('\n   For KairosSwap to appear on DexScreener, the DEX must be integrated.');
    console.log('   Contact: https://telegram.me/dexscreenerchat');
  }
})();
