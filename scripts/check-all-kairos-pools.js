// Check KAIROS pools on PancakeSwap (BSC)
const { ethers } = require('ethers');

const RPC = 'https://bsc-dataseed1.binance.org';
const provider = new ethers.JsonRpcProvider(RPC);
const WALLET = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
const KAIROS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const USDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

// PancakeSwap V2
const PCS_FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const PCS_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// KairosSwap
const KS_FACTORY = '0xB5891c54199d539CB8afd37BFA9E17370095b9D9';

const FACTORY_ABI = ['function getPair(address,address) view returns (address)'];
const PAIR_ABI = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function token0() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

const tokens = [
  { symbol: 'WBNB', address: WBNB, decimals: 18 },
  { symbol: 'USDT', address: USDT, decimals: 18 },
  { symbol: 'USDC', address: USDC, decimals: 18 },
  { symbol: 'BUSD', address: BUSD, decimals: 18 },
];

async function checkPools(factoryAddr, dexName) {
  const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, provider);
  const results = [];

  for (const token of tokens) {
    try {
      const pairAddr = await factory.getPair(KAIROS, token.address);
      if (!pairAddr || pairAddr === ethers.ZeroAddress) continue;

      const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
      const [r0, r1, ] = await pair.getReserves();
      const token0 = await pair.token0();
      const totalSupply = await pair.totalSupply();
      const myBalance = await pair.balanceOf(WALLET);

      if (totalSupply === 0n) continue;

      const isKairosToken0 = token0.toLowerCase() === KAIROS.toLowerCase();
      const reserveKairos = isKairosToken0 ? r0 : r1;
      const reserveOther = isKairosToken0 ? r1 : r0;

      const kFloat = parseFloat(ethers.formatUnits(reserveKairos, 18));
      const oFloat = parseFloat(ethers.formatUnits(reserveOther, token.decimals));
      const myShare = totalSupply > 0n ? Number((myBalance * 10000n) / totalSupply) / 100 : 0;

      results.push({
        pair: `KAIROS/${token.symbol}`,
        pairAddr,
        reserveKairos: kFloat,
        reserveOther: oFloat,
        totalLP: ethers.formatEther(totalSupply),
        myLP: ethers.formatEther(myBalance),
        myShare,
        dex: dexName,
      });
    } catch (err) {
      // skip
    }
  }
  return results;
}

(async () => {
  console.log('Buscando pools de KAIROS...\n');

  const pcsResults = await checkPools(PCS_FACTORY, 'PancakeSwap');
  const ksResults = await checkPools(KS_FACTORY, 'KairosSwap');

  const all = [...pcsResults, ...ksResults];

  if (all.length === 0) {
    console.log('No se encontraron pools de KAIROS.');
    return;
  }

  // Get BNB price
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
  const data = await res.json();
  const bnbPrice = data.binancecoin.usd;

  for (const pool of all) {
    console.log(`══ ${pool.dex}: ${pool.pair} ══`);
    console.log(`  Pair: ${pool.pairAddr}`);
    console.log(`  KAIROS reserve: ${pool.reserveKairos.toFixed(6)}`);
    console.log(`  ${pool.pair.split('/')[1]} reserve: ${pool.reserveOther.toFixed(6)}`);
    
    // Estimate TVL
    let tvlUsd = 0;
    if (pool.pair.includes('WBNB')) {
      tvlUsd = pool.reserveOther * bnbPrice * 2;
      console.log(`  Price: 1 KAIROS = ${(pool.reserveOther / pool.reserveKairos).toFixed(8)} BNB (~$${((pool.reserveOther / pool.reserveKairos) * bnbPrice).toFixed(4)})`);
    } else {
      tvlUsd = pool.reserveOther * 2; // stablecoins
      console.log(`  Price: 1 KAIROS = ${(pool.reserveOther / pool.reserveKairos).toFixed(6)} ${pool.pair.split('/')[1]}`);
    }
    console.log(`  TVL: ~$${tvlUsd.toFixed(2)}`);
    console.log(`  Tu LP: ${pool.myLP} (${pool.myShare}% del pool)`);
    console.log(`  Tu valor: ~$${(tvlUsd * pool.myShare / 100).toFixed(2)}`);
    console.log('');
  }
})();
