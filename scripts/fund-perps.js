// ═══════════════════════════════════════════════════════════════════════════════
//  Fund KairosPerps contract with KAIROS tokens
//  Sends KAIROS from owner to KairosPerps so it can pay out trader profits
//
//  Usage: node scripts/fund-perps.js
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require('ethers');
require('dotenv').config();

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const KAIROS_PERPS = '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9';
const KAIROS_TOKEN = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';

// Amount to fund: 100,000 KAIROS (enough for initial trading profits)
const FUND_AMOUNT = ethers.parseUnits('100000', 18);

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Fund KairosPerps with KAIROS');
  console.log('═══════════════════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  
  const kairos = new ethers.Contract(KAIROS_TOKEN, [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address,uint256) returns (bool)',
  ], wallet);

  // Check balances before
  const ownerBal = await kairos.balanceOf(wallet.address);
  const perpsBal = await kairos.balanceOf(KAIROS_PERPS);
  console.log(`Owner KAIROS: ${ethers.formatUnits(ownerBal, 18)}`);
  console.log(`KairosPerps KAIROS: ${ethers.formatUnits(perpsBal, 18)}`);
  console.log(`Funding amount: ${ethers.formatUnits(FUND_AMOUNT, 18)} KAIROS\n`);

  // Send KAIROS to KairosPerps
  console.log('Sending KAIROS to KairosPerps...');
  const tx = await kairos.transfer(KAIROS_PERPS, FUND_AMOUNT);
  console.log(`Tx hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber} ✅\n`);

  // Check balances after
  const perpsBal2 = await kairos.balanceOf(KAIROS_PERPS);
  console.log(`KairosPerps KAIROS balance: ${ethers.formatUnits(perpsBal2, 18)} ✅`);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  KairosPerps funded — ready to pay trader profits');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
