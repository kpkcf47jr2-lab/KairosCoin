const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
const owner = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';

const USDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const KAIROS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

const erc20 = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

async function main() {
  const bnb = await provider.getBalance(owner);
  console.log('BNB:', ethers.formatEther(bnb));
  for (const [name, addr] of [['KAIROS', KAIROS], ['USDC', USDC], ['USDT', USDT], ['BUSD', BUSD]]) {
    const c = new ethers.Contract(addr, erc20, provider);
    const [bal, dec] = await Promise.all([c.balanceOf(owner), c.decimals()]);
    console.log(name + ':', ethers.formatUnits(bal, dec));
  }
}
main().catch(console.error);
