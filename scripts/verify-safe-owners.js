const { ethers } = require('ethers');

async function main() {
  const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
  const safeAddr = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
  const safeAbi = [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)',
    'function nonce() view returns (uint256)',
    'function isOwner(address) view returns (bool)'
  ];
  const safe = new ethers.Contract(safeAddr, safeAbi, p);

  const [owners, threshold, nonce] = await Promise.all([
    safe.getOwners(), safe.getThreshold(), safe.nonce()
  ]);

  console.log('=== Safe Status ===');
  console.log('Owners:', owners.length);
  owners.forEach((o, i) => console.log(`  Owner ${i + 1}: ${o}`));
  console.log('Threshold:', threshold.toString());
  console.log('Nonce:', nonce.toString());

  const relayer = '0xCee44904A6aA94dEa28754373887E07D4B6f4968';
  const phone = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8';
  
  const [isRelayer, isPhone] = await Promise.all([
    safe.isOwner(relayer), safe.isOwner(phone)
  ]);
  
  console.log('\n=== Verificación ===');
  console.log('Relayer (0xCee449) es owner:', isRelayer ? '✅ SÍ' : '❌ NO');
  console.log('Phone (0x37935A) es owner:', isPhone ? '✅ SÍ' : '❌ NO');
}

main().catch(console.error);
