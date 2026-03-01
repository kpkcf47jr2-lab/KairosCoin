// Check BNB balance of Safe owner wallet (0x37935A...)
const { ethers } = require('ethers');
const p = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
async function main() {
  const owner = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8';
  const bal = await p.getBalance(owner);
  console.log('Owner wallet BNB:', ethers.formatEther(bal));
  if (bal < ethers.parseEther('0.001')) {
    console.log('WARNING: Needs BNB for gas! Send at least 0.002 BNB to', owner);
  } else {
    console.log('OK: Has enough BNB for Safe transactions');
  }
}
main();
