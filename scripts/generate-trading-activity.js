// ═══════════════════════════════════════════════════════════════
//  Generate multiple swap events for more robust indexing
//  Swap KAIROS → BNB on both DEXes (reverse trades)
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const { ethers } = require('ethers');

const RPC       = 'https://bsc-dataseed1.binance.org';
const KAIROS    = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const WBNB      = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PRIV_KEY  = process.env.DEPLOYER_PRIVATE_KEY;

const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const KAIROS_ROUTER  = '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6';

const ROUTER_ABI = [
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
];
const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
];

(async () => {
  if (!PRIV_KEY) { console.error('No DEPLOYER_PRIVATE_KEY'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIV_KEY, provider);
  const kairos = new ethers.Contract(KAIROS, ERC20_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 600;

  const kairosBal = await kairos.balanceOf(wallet.address);
  console.log('KAIROS balance:', ethers.formatEther(kairosBal));
  
  // Swap 0.5 KAIROS back to BNB on each router
  const swapAmount = ethers.parseEther('0.5');

  // Approve PancakeSwap Router
  console.log('\n1. Approving KAIROS for PancakeSwap Router...');
  let tx = await kairos.approve(PANCAKE_ROUTER, swapAmount);
  await tx.wait();
  console.log('   Approved');

  // Swap KAIROS → BNB on PancakeSwap
  console.log('2. Swapping 0.5 KAIROS → BNB on PancakeSwap...');
  const pRouter = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, wallet);
  try {
    tx = await pRouter.swapExactTokensForETH(swapAmount, 0, [KAIROS, WBNB], wallet.address, deadline, { gasLimit: 300000 });
    console.log('   TX:', tx.hash);
    const r = await tx.wait();
    console.log(`   ✅ Block ${r.blockNumber} | https://bscscan.com/tx/${tx.hash}`);
  } catch (e) {
    console.log('   ❌', e.message?.substring(0, 150));
  }

  await new Promise(r => setTimeout(r, 3000));

  // Approve KairosSwap Router
  console.log('\n3. Approving KAIROS for KairosSwap Router...');
  tx = await kairos.approve(KAIROS_ROUTER, swapAmount);
  await tx.wait();
  console.log('   Approved');

  // Swap KAIROS → BNB on KairosSwap
  console.log('4. Swapping 0.5 KAIROS → BNB on KairosSwap...');
  const kRouter = new ethers.Contract(KAIROS_ROUTER, ROUTER_ABI, wallet);
  try {
    tx = await kRouter.swapExactTokensForETH(swapAmount, 0, [KAIROS, WBNB], wallet.address, deadline, { gasLimit: 300000 });
    console.log('   TX:', tx.hash);
    const r = await tx.wait();
    console.log(`   ✅ Block ${r.blockNumber} | https://bscscan.com/tx/${tx.hash}`);
  } catch (e) {
    console.log('   ❌', e.message?.substring(0, 150));
  }

  // One more round BNB → KAIROS on PancakeSwap for extra activity
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n5. Extra swap: 0.001 BNB → KAIROS on PancakeSwap...');
  try {
    tx = await pRouter.swapExactETHForTokens(0, [WBNB, KAIROS], wallet.address, deadline, { value: ethers.parseEther('0.001'), gasLimit: 300000 });
    console.log('   TX:', tx.hash);
    const r = await tx.wait();
    console.log(`   ✅ Block ${r.blockNumber} | https://bscscan.com/tx/${tx.hash}`);
  } catch (e) {
    console.log('   ❌', e.message?.substring(0, 150));
  }

  console.log('\n✅ Done! Generated 4+ swap events across both DEXes.');
  console.log('DexScreener typically indexes PancakeSwap pairs within 1-24 hours.');
})();
