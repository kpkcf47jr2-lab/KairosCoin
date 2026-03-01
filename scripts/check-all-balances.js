const { ethers } = require('ethers');

async function main() {
  const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
  const abi = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function owner() view returns (address)',
    'function reserveWallet() view returns (address)'
  ];
  const c = new ethers.Contract('0x14D41707269c7D8b8DFa5095b38824a46dA05da3', abi, p);

  const [ts, owner, reserve] = await Promise.all([
    c.totalSupply(), c.owner(), c.reserveWallet()
  ]);

  console.log('=== Estado Actual ===');
  console.log('Owner (Safe):', owner);
  console.log('Reserve Wallet:', reserve);
  console.log('Total Supply:', ethers.formatUnits(ts, 18), 'KAIROS');

  const wallets = {
    'Safe': '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8',
    'Deployer/Relayer (0xCee449)': '0xCee44904A6aA94dEa28754373887E07D4B6f4968',
    'Phone Wallet (0x37935A)': '0x37935A6AD6A5e7f096B759952F41D464CAe82be8',
  };

  for (const [name, addr] of Object.entries(wallets)) {
    const [kairos, bnb] = await Promise.all([
      c.balanceOf(addr), p.getBalance(addr)
    ]);
    console.log(`\n${name} (${addr}):`);
    console.log('  KAIROS:', ethers.formatUnits(kairos, 18));
    console.log('  BNB:', ethers.formatEther(bnb));
  }
}

main().catch(console.error);
