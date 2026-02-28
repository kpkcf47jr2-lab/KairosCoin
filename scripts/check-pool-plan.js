// Check BSC wallet balances for pool creation planning
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
const WALLET = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
const KAIROS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const USDT = '0x55d398326f99059fF775485246999027B3197955';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

(async () => {
  try {
    const bnbBal = await provider.getBalance(WALLET);
    const kairosC = new ethers.Contract(KAIROS, ERC20_ABI, provider);
    const usdtC = new ethers.Contract(USDT, ERC20_ABI, provider);

    const [kBal, kDec, uBal, uDec] = await Promise.all([
      kairosC.balanceOf(WALLET), kairosC.decimals(),
      usdtC.balanceOf(WALLET), usdtC.decimals(),
    ]);

    console.log('=== Balances en BSC ===');
    console.log('BNB:', ethers.formatEther(bnbBal));
    console.log('KAIROS:', ethers.formatUnits(kBal, kDec));
    console.log('USDT:', ethers.formatUnits(uBal, uDec));

    // BNB price from CoinGecko
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
    const data = await res.json();
    const bnbPrice = data.binancecoin.usd;
    const bnbFloat = parseFloat(ethers.formatEther(bnbBal));
    console.log('\nBNB Price: $' + bnbPrice);
    console.log('BNB Value: $' + (bnbFloat * bnbPrice).toFixed(2));
    console.log('\n=== Plan para Pool KAIROS/BNB ===');
    // Reserve ~0.005 BNB for gas
    const bnbForPool = bnbFloat - 0.005;
    const bnbValueForPool = bnbForPool * bnbPrice;
    // KAIROS = 1 USD pegged, so we need $X worth of KAIROS to match $X of BNB
    const kairosNeeded = bnbValueForPool;
    console.log('BNB para pool:', bnbForPool.toFixed(6), '(reservando 0.005 BNB para gas)');
    console.log('Valor BNB para pool: $' + bnbValueForPool.toFixed(2));
    console.log('KAIROS necesarios:', kairosNeeded.toFixed(2), '(a $1 USD c/u)');
    console.log('Precio inicial: 1 KAIROS = ' + (bnbForPool / kairosNeeded).toFixed(8) + ' BNB');
    console.log('Precio inicial: 1 BNB = ' + (kairosNeeded / bnbForPool).toFixed(2) + ' KAIROS');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
