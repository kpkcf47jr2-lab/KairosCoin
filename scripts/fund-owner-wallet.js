// Send BNB from deployer to Safe owner wallet for gas
require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const TO = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8';

  const bal = await provider.getBalance(signer.address);
  console.log('Deployer BNB:', ethers.formatEther(bal));

  // Send 0.005 BNB for multiple Safe transactions
  const amount = ethers.parseEther('0.005');
  if (bal < amount + ethers.parseEther('0.001')) {
    console.log('Not enough BNB. Sending all minus gas reserve...');
    // Send balance minus gas reserve
    const gasReserve = ethers.parseEther('0.001');
    const sendAmount = bal - gasReserve;
    if (sendAmount <= 0n) {
      console.error('No BNB to send');
      process.exit(1);
    }
    const tx = await signer.sendTransaction({ to: TO, value: sendAmount });
    console.log('TX:', tx.hash);
    await tx.wait();
    console.log('Sent', ethers.formatEther(sendAmount), 'BNB to', TO);
  } else {
    const tx = await signer.sendTransaction({ to: TO, value: amount });
    console.log('TX:', tx.hash);
    await tx.wait();
    console.log('Sent 0.005 BNB to', TO);
  }

  // Verify
  const newBal = await provider.getBalance(TO);
  console.log('Owner wallet new BNB balance:', ethers.formatEther(newBal));
}

main().catch(e => console.error(e.message));
