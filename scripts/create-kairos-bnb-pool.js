// ═══════════════════════════════════════════════════════════════
//  Create first KAIROS/BNB pool on KairosSwap (BSC)
//  Uses addLiquidityETH — sends BNB + KAIROS to create initial pool
//  Pegged at 1 KAIROS = $1 USD
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const { ethers } = require('ethers');

// ── Config ──
const RPC       = 'https://bsc-dataseed1.binance.org';
const KAIROS    = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const ROUTER    = '0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6'; // KairosSwap Router
const FACTORY   = '0xB5891c54199d539CB8afd37BFA9E17370095b9D9'; // KairosSwap Factory
const WBNB      = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PRIV_KEY  = process.env.DEPLOYER_PRIVATE_KEY;

// ABIs
const ROUTER_ABI = [
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
  'function WETH() external view returns (address)',
];
const FACTORY_ABI = [
  'function getPair(address,address) external view returns (address)',
];
const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];
const PAIR_ABI = [
  'function getReserves() external view returns (uint112,uint112,uint32)',
  'function token0() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
];

(async () => {
  if (!PRIV_KEY) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIV_KEY, provider);
  const account = wallet.address;
  console.log('Wallet:', account);

  // Check balances
  const bnbBal = await provider.getBalance(account);
  const kairos = new ethers.Contract(KAIROS, ERC20_ABI, wallet);
  const kairosBal = await kairos.balanceOf(account);
  const kairosDec = await kairos.decimals();

  console.log('BNB balance:', ethers.formatEther(bnbBal));
  console.log('KAIROS balance:', ethers.formatUnits(kairosBal, kairosDec));

  // ── Get BNB price for correct ratio ──
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
  const priceData = await res.json();
  const bnbPrice = priceData.binancecoin.usd;
  console.log('BNB Price: $' + bnbPrice);

  // ── Calculate amounts ──
  // Reserve 0.005 BNB for gas (~$3)
  const GAS_RESERVE = ethers.parseEther('0.005');
  const bnbForPool = bnbBal - GAS_RESERVE;

  if (bnbForPool <= 0n) {
    console.error('ERROR: Not enough BNB (need gas reserve of 0.005 BNB)');
    process.exit(1);
  }

  // KAIROS is $1 pegged, so we need (BNB amount * BNB price) KAIROS
  const bnbFloat = parseFloat(ethers.formatEther(bnbForPool));
  const kairosNeeded = bnbFloat * bnbPrice;
  const kairosAmount = ethers.parseUnits(kairosNeeded.toFixed(6), 18);

  console.log('\n=== Pool Creation Plan ===');
  console.log('BNB to pool:', ethers.formatEther(bnbForPool), 'BNB ($' + (bnbFloat * bnbPrice).toFixed(2) + ')');
  console.log('KAIROS to pool:', kairosNeeded.toFixed(6), 'KAIROS ($' + kairosNeeded.toFixed(2) + ')');
  console.log('Initial price: 1 KAIROS = ' + (bnbFloat / kairosNeeded).toFixed(8) + ' BNB');
  console.log('Initial price: 1 BNB = ' + bnbPrice.toFixed(2) + ' KAIROS');

  // Check if pair already exists
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
  const existingPair = await factory.getPair(KAIROS, WBNB);
  if (existingPair && existingPair !== ethers.ZeroAddress) {
    console.log('\n⚠️  Pool KAIROS/WBNB already exists at:', existingPair);
    // Check reserves
    const pair = new ethers.Contract(existingPair, PAIR_ABI, provider);
    const [r0, r1] = await pair.getReserves();
    const token0 = await pair.token0();
    const isKairosToken0 = token0.toLowerCase() === KAIROS.toLowerCase();
    console.log('Reserves:');
    console.log('  KAIROS:', ethers.formatUnits(isKairosToken0 ? r0 : r1, 18));
    console.log('  WBNB:', ethers.formatEther(isKairosToken0 ? r1 : r0));
    
    if (r0 > 0n && r1 > 0n) {
      console.log('Pool already has liquidity. Adding more...');
    }
  }

  // ── Step 1: Approve KAIROS for Router ──
  console.log('\n[1/3] Approving KAIROS for KairosSwap Router...');
  const currentAllowance = await kairos.allowance(account, ROUTER);
  if (currentAllowance < kairosAmount) {
    const approveTx = await kairos.approve(ROUTER, ethers.MaxUint256);
    console.log('Approve tx:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ KAIROS approved');
  } else {
    console.log('✅ Already approved');
  }

  // ── Step 2: Add Liquidity ──
  console.log('\n[2/3] Adding liquidity to KairosSwap...');
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 min

  // 1% slippage tolerance
  const minKairos = (kairosAmount * 99n) / 100n;
  const minBnb = (bnbForPool * 99n) / 100n;

  const tx = await router.addLiquidityETH(
    KAIROS,            // token
    kairosAmount,      // amountTokenDesired
    minKairos,         // amountTokenMin (1% slippage)
    minBnb,            // amountETHMin (1% slippage)
    account,           // to (LP tokens receiver)
    deadline,          // deadline
    { value: bnbForPool }  // BNB to send
  );

  console.log('Tx hash:', tx.hash);
  console.log('Waiting for confirmation...');
  const receipt = await tx.wait();
  console.log('✅ Liquidity added! Gas used:', receipt.gasUsed.toString());
  console.log('Block:', receipt.blockNumber);

  // ── Step 3: Verify pool ──
  console.log('\n[3/3] Verifying pool...');
  const pairAddr = await factory.getPair(KAIROS, WBNB);
  console.log('Pair address:', pairAddr);

  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [r0, r1] = await pair.getReserves();
  const token0 = await pair.token0();
  const isKairosToken0 = token0.toLowerCase() === KAIROS.toLowerCase();
  const reserveKairos = isKairosToken0 ? r0 : r1;
  const reserveBnb = isKairosToken0 ? r1 : r0;
  const totalLP = await pair.totalSupply();
  const myLP = await pair.balanceOf(account);

  console.log('\n=== Pool KAIROS/BNB Created ===');
  console.log('KAIROS reserve:', ethers.formatUnits(reserveKairos, 18));
  console.log('BNB reserve:', ethers.formatEther(reserveBnb));
  console.log('Total LP tokens:', ethers.formatEther(totalLP));
  console.log('Your LP tokens:', ethers.formatEther(myLP));
  console.log('Your pool share: 100%');
  
  const kFloat = parseFloat(ethers.formatUnits(reserveKairos, 18));
  const bFloat = parseFloat(ethers.formatEther(reserveBnb));
  console.log('\nPrices:');
  console.log('  1 KAIROS =', (bFloat / kFloat).toFixed(8), 'BNB (~$' + ((bFloat / kFloat) * bnbPrice).toFixed(4) + ')');
  console.log('  1 BNB =', (kFloat / bFloat).toFixed(2), 'KAIROS');

  // Check remaining BNB
  const finalBnb = await provider.getBalance(account);
  console.log('\nRemaining BNB:', ethers.formatEther(finalBnb));
  console.log('\n🎉 Pool live on KairosSwap!');
  console.log('BscScan pair:', 'https://bscscan.com/address/' + pairAddr);
})();
