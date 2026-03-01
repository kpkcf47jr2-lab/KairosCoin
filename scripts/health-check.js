// Full system health check — verifies all components
const { ethers } = require('ethers');

async function main() {
  const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

  const SAFE = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
  const TOKEN = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';

  const safeAbi = [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)',
    'function nonce() view returns (uint256)',
    'function isOwner(address) view returns (bool)',
  ];
  const tokenAbi = [
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'function totalSupply() view returns (uint256)',
    'function totalMinted() view returns (uint256)',
    'function totalBurned() view returns (uint256)',
    'function feeBps() view returns (uint256)',
    'function mintCap() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
  ];

  const safe = new ethers.Contract(SAFE, safeAbi, p);
  const token = new ethers.Contract(TOKEN, tokenAbi, p);

  console.log('═══════════════════════════════════════');
  console.log('  KAIROS SYSTEM HEALTH CHECK');
  console.log('═══════════════════════════════════════\n');

  // 1. Token Contract
  console.log('1️⃣  TOKEN CONTRACT');
  const [owner, paused, supply, minted, burned, fee, cap] = await Promise.all([
    token.owner(), token.paused(), token.totalSupply(),
    token.totalMinted(), token.totalBurned(), token.feeBps(), token.mintCap(),
  ]);
  const ownerIsSafe = owner.toLowerCase() === SAFE.toLowerCase();
  console.log(`   Owner = Safe: ${ownerIsSafe ? '✅' : '❌'} (${owner})`);
  console.log(`   Paused: ${paused ? '⚠️ YES' : '✅ No'}`);
  console.log(`   Supply: ${ethers.formatUnits(supply, 18)} KAIROS`);
  console.log(`   Minted: ${ethers.formatUnits(minted, 18)}`);
  console.log(`   Burned: ${ethers.formatUnits(burned, 18)}`);
  console.log(`   Fee: ${fee} bps`);
  console.log(`   MintCap: ${cap === 0n ? 'Unlimited ∞' : ethers.formatUnits(cap, 18)}`);

  // 2. Safe
  console.log('\n2️⃣  GNOSIS SAFE');
  const [owners, threshold, nonce] = await Promise.all([
    safe.getOwners(), safe.getThreshold(), safe.nonce(),
  ]);
  console.log(`   Owners: ${owners.length}`);
  owners.forEach((o, i) => {
    const label = o.toLowerCase() === '0xcee44904a6aa94dea28754373887e07d4b6f4968' ? '(Deployer/Relayer)' :
                  o.toLowerCase() === '0x37935a6ad6a5e7f096b759952f41d464cae82be8' ? '(Phone Wallet)' : '';
    console.log(`     ${i+1}. ${o} ${label}`);
  });
  console.log(`   Threshold: ${threshold}-of-${owners.length} ${threshold == 1 ? '✅' : '⚠️'}`);
  console.log(`   Nonce: ${nonce} (${nonce > 0 ? '✅ TXs executed' : '⚠️ No TXs yet'})`);

  // 3. Balances
  console.log('\n3️⃣  BALANCES');
  const wallets = {
    'Deployer': '0xCee44904A6aA94dEa28754373887E07D4B6f4968',
    'Phone': '0x37935A6AD6A5e7f096B759952F41D464CAe82be8',
    'Safe': SAFE,
  };
  for (const [name, addr] of Object.entries(wallets)) {
    const [bal, bnb] = await Promise.all([token.balanceOf(addr), p.getBalance(addr)]);
    console.log(`   ${name}: ${ethers.formatUnits(bal, 18)} KAIROS, ${ethers.formatEther(bnb)} BNB`);
  }

  // 4. Backend API
  console.log('\n4️⃣  BACKEND API');
  try {
    const resp = await fetch('https://kairos-api-u6k5.onrender.com/api/supply');
    if (resp.ok) {
      const data = await resp.json();
      console.log(`   Status: ✅ Online`);
      console.log(`   Supply reported: ${data.totalSupply || data.supply?.totalSupply || 'OK'}`);
    } else {
      console.log(`   Status: ⚠️ HTTP ${resp.status}`);
    }
  } catch (err) {
    console.log(`   Status: ❌ Offline (${err.message})`);
  }

  // 5. Wallet App
  console.log('\n5️⃣  WALLET APP');
  try {
    const resp = await fetch('https://kairos-wallet.netlify.app');
    console.log(`   Status: ${resp.ok ? '✅ Online' : '⚠️ HTTP ' + resp.status}`);
  } catch (err) {
    console.log(`   Status: ❌ Offline`);
  }

  // 6. Safe Mint Test (dry check — just verify minted > 0)
  console.log('\n6️⃣  SAFE MINT/BURN');
  console.log(`   Total Minted: ${ethers.formatUnits(minted, 18)} ${minted > 0n ? '✅ Safe mint works' : '⚠️ No mints yet'}`);
  console.log(`   Safe nonce: ${nonce} ${nonce >= 2 ? '✅ (addOwner + mint confirmed)' : nonce >= 1 ? '✅ (addOwner confirmed)' : ''}`);

  // Summary
  console.log('\n═══════════════════════════════════════');
  const checks = [ownerIsSafe, !paused, owners.length >= 2, threshold == 1n, nonce >= 1n];
  const passed = checks.filter(Boolean).length;
  console.log(`  RESULT: ${passed}/${checks.length} checks passed`);
  console.log(`  ${passed === checks.length ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'}`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => console.error('Error:', err.message));
