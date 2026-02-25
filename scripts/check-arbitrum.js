const { ethers } = require('ethers');
require('dotenv').config();

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const p = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
const kairos = new ethers.Contract('0x14D41707269c7D8b8DFa5095b38824a46dA05da3', [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function approve(address,uint256) returns (bool)',
], p);
const perps = '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9';
const owner = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';

async function main() {
  const [ownerBal, perpsBal, supply, ethBal] = await Promise.all([
    kairos.balanceOf(owner),
    kairos.balanceOf(perps),
    kairos.totalSupply(),
    p.getBalance(owner),
  ]);
  console.log('=== Arbitrum State ===');
  console.log('KAIROS Supply (Arbitrum):', ethers.formatUnits(supply, 18));
  console.log('Owner KAIROS balance:', ethers.formatUnits(ownerBal, 18));
  console.log('KairosPerps KAIROS balance:', ethers.formatUnits(perpsBal, 18));
  console.log('Owner ETH balance:', ethers.formatEther(ethBal), 'ETH');
  console.log('Owner ETH value: ~$' + (parseFloat(ethers.formatEther(ethBal)) * 2800).toFixed(2));
}

main().catch(console.error);
