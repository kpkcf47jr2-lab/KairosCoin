const { ethers } = require('ethers');

const SAFE = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
const SIGNER = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8';
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');

const safeAbi = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function VERSION() view returns (string)',
  'function isOwner(address) view returns (bool)'
];

async function main() {
  console.log('=== VERIFICACION DEL GNOSIS SAFE ===');
  console.log('Safe:', SAFE);
  console.log('');

  const code = await provider.getCode(SAFE);
  console.log('1. Contrato existe:', code.length > 2 ? 'SI' : 'NO');

  const balance = await provider.getBalance(SAFE);
  console.log('2. Balance BNB:', ethers.formatEther(balance), 'BNB');

  const safe = new ethers.Contract(SAFE, safeAbi, provider);

  const owners = await safe.getOwners();
  console.log('3. Owners:', owners);

  const threshold = await safe.getThreshold();
  console.log('4. Threshold:', threshold.toString(), 'de', owners.length);

  const nonce = await safe.nonce();
  console.log('5. Nonce (txs ejecutadas):', nonce.toString());

  const version = await safe.VERSION();
  console.log('6. Version Safe:', version);

  const isOwner = await safe.isOwner(SIGNER);
  console.log('7. Tu wallet es owner:', isOwner ? 'SI' : 'NO');

  console.log('');
  console.log('=== RESULTADO ===');
  if (code.length > 2 && isOwner && threshold == 1n) {
    console.log('TODO CORRECTO - Safe funcional y accesible');
    console.log('Solo necesitas tu wallet', SIGNER, 'para firmar cualquier TX');
  } else {
    console.log('HAY UN PROBLEMA');
  }

  // Test Safe web UI URL
  console.log('');
  console.log('=== URL PARA ACCEDER ===');
  console.log('https://app.safe.global/home?safe=bnb:' + SAFE);
}

main().catch(console.error);
