// ═══════════════════════════════════════════════════════
//  Transfer KairosCoin ownership to Gnosis Safe
//  From: 0xCee449... (deployer) → To: Safe 0xC84f26...
// ═══════════════════════════════════════════════════════

require('dotenv').config();
const { ethers } = require('ethers');

const KAIROS_CONTRACT = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';
const SAFE_ADDRESS = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('=== TRANSFER OWNERSHIP TO SAFE ===');
  console.log('Contract:', KAIROS_CONTRACT);
  console.log('From (current owner):', signer.address);
  console.log('To (Safe):', SAFE_ADDRESS);
  console.log('');

  const contract = new ethers.Contract(KAIROS_CONTRACT, [
    'function owner() view returns (address)',
    'function transferOwnership(address newOwner)',
  ], signer);

  // Verify current owner
  const currentOwner = await contract.owner();
  console.log('Current owner on-chain:', currentOwner);

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error('ERROR: Signer is NOT the current owner!');
    process.exit(1);
  }

  // Check gas balance
  const balance = await provider.getBalance(signer.address);
  console.log('Signer BNB balance:', ethers.formatEther(balance));
  if (balance < ethers.parseEther('0.001')) {
    console.error('ERROR: Not enough BNB for gas');
    process.exit(1);
  }

  console.log('');
  console.log('Sending transferOwnership transaction...');

  const tx = await contract.transferOwnership(SAFE_ADDRESS, {
    gasLimit: 100000,
  });

  console.log('TX hash:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Verify new owner
  const newOwner = await contract.owner();
  console.log('');
  console.log('=== VERIFICATION ===');
  console.log('New owner on-chain:', newOwner);

  if (newOwner.toLowerCase() === SAFE_ADDRESS.toLowerCase()) {
    console.log('SUCCESS — Ownership transferred to Safe!');
  } else {
    console.log('WARNING — Owner does not match Safe address!');
  }
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
