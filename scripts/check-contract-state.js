// Check if the deployed KairosCoin on BSC has AccessControl (MINTER_ROLE)
require('dotenv').config();
const { ethers } = require('ethers');

const KAIROS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const DEPLOYER = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
const SAFE = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';

async function main() {
  const p = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');

  console.log('=== CONTRACT STATE CHECK ===');
  console.log('');

  const c = new ethers.Contract(KAIROS, [
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'function feeBps() view returns (uint256)',
    'function mintCap() view returns (uint256)',
    'function burnCap() view returns (uint256)',
    'function totalMinted() view returns (uint256)',
    'function totalBurned() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function reserveWallet() view returns (address)',
  ], p);

  console.log('Owner:', await c.owner());
  console.log('Paused:', await c.paused());
  console.log('Fee BPS:', (await c.feeBps()).toString());
  console.log('Mint Cap:', ethers.formatEther(await c.mintCap()));
  console.log('Burn Cap:', ethers.formatEther(await c.burnCap()));
  console.log('Total Supply:', ethers.formatEther(await c.totalSupply()));
  console.log('Total Minted:', ethers.formatEther(await c.totalMinted()));
  console.log('Total Burned:', ethers.formatEther(await c.totalBurned()));
  console.log('Reserve Wallet:', await c.reserveWallet());

  // Check if hasRole exists
  console.log('');
  console.log('=== ACCESS CONTROL CHECK ===');
  
  const cRoles = new ethers.Contract(KAIROS, [
    'function hasRole(bytes32, address) view returns (bool)',
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'function MINTER_ROLE() view returns (bytes32)',
    'function getRoleAdmin(bytes32) view returns (bytes32)',
  ], p);

  try {
    const adminRole = await cRoles.DEFAULT_ADMIN_ROLE();
    console.log('DEFAULT_ADMIN_ROLE:', adminRole);
    
    const minterRole = await cRoles.MINTER_ROLE();
    console.log('MINTER_ROLE:', minterRole);

    const deployerIsAdmin = await cRoles.hasRole(adminRole, DEPLOYER);
    console.log('Deployer is DEFAULT_ADMIN:', deployerIsAdmin);

    const safeIsAdmin = await cRoles.hasRole(adminRole, SAFE);
    console.log('Safe is DEFAULT_ADMIN:', safeIsAdmin);

    const roleAdmin = await cRoles.getRoleAdmin(minterRole);
    console.log('MINTER_ROLE admin:', roleAdmin);

    console.log('');
    console.log('AccessControl: YES - contract supports roles');
  } catch (err) {
    console.log('AccessControl: NO - hasRole reverted');
    console.log('Error:', err.message.slice(0, 200));
    console.log('');
    console.log('This means the deployed contract does NOT have AccessControl.');
    console.log('Only the owner() can mint/burn. No MINTER_ROLE available.');
  }
}

main().catch(e => console.error(e));
