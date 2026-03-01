// Test: Mint 1 KAIROS through Safe
// This validates the Safe execTransaction flow works end-to-end
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { ethers } = require('ethers');

const SAFE_ADDRESS = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
const CONTRACT_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';

const SAFE_ABI = [
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function getOwners() view returns (address[])',
  'function isOwner(address) view returns (bool)',
];

const TOKEN_ABI = [
  'function mint(address to, uint256 amount)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
];

async function main() {
  const pk = process.env.OWNER_PRIVATE_KEY;
  if (!pk) { console.error('Missing OWNER_PRIVATE_KEY in .env'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
  const wallet = new ethers.Wallet(pk, provider);
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, wallet);
  const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, provider);

  console.log('=== Pre-Flight Checks ===');
  console.log('Deployer:', wallet.address);
  
  const [isOwnerOfSafe, contractOwner, safeNonce] = await Promise.all([
    safe.isOwner(wallet.address),
    token.owner(),
    safe.nonce(),
  ]);
  
  console.log('Is Safe owner:', isOwnerOfSafe ? '✅' : '❌');
  console.log('Contract owner:', contractOwner);
  console.log('Contract owned by Safe:', contractOwner.toLowerCase() === SAFE_ADDRESS.toLowerCase() ? '✅' : '❌');
  console.log('Safe nonce:', safeNonce.toString());

  if (!isOwnerOfSafe) {
    console.error('Deployer is not a Safe owner! Aborting.');
    process.exit(1);
  }

  // Test: mint 1 KAIROS to deployer
  const testTo = wallet.address;
  const testAmount = ethers.parseUnits('1', 18);

  // Get balance before
  const balBefore = await token.balanceOf(testTo);
  console.log('\nBalance before:', ethers.formatUnits(balBefore, 18), 'KAIROS');

  // Encode mint call
  const iface = new ethers.Interface(TOKEN_ABI);
  const mintData = iface.encodeFunctionData('mint', [testTo, testAmount]);

  // Safe TX params
  const txParams = {
    to: CONTRACT_ADDRESS,
    value: 0n,
    data: mintData,
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
  };

  // Get Safe TX hash
  const safeTxHash = await safe.getTransactionHash(
    txParams.to, txParams.value, txParams.data, txParams.operation,
    txParams.safeTxGas, txParams.baseGas, txParams.gasPrice,
    txParams.gasToken, txParams.refundReceiver, safeNonce
  );
  console.log('\nSafe TX hash:', safeTxHash);

  // Sign with eth_sign (v += 4)
  const rawSig = await wallet.signMessage(ethers.getBytes(safeTxHash));
  const sigBytes = ethers.getBytes(rawSig);
  sigBytes[64] += 4;
  const signature = ethers.hexlify(sigBytes);
  console.log('Signature:', signature.slice(0, 20) + '...');

  // Execute
  console.log('\n⏳ Executing mint(1 KAIROS) through Safe...');
  const tx = await safe.execTransaction(
    txParams.to, txParams.value, txParams.data, txParams.operation,
    txParams.safeTxGas, txParams.baseGas, txParams.gasPrice,
    txParams.gasToken, txParams.refundReceiver, signature,
    { gasLimit: 500000n, gasPrice: ethers.parseUnits('3', 'gwei') }
  );

  console.log('TX submitted:', tx.hash);
  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait(2);
  console.log('✅ Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Check balance after
  const balAfter = await token.balanceOf(testTo);
  console.log('\nBalance after:', ethers.formatUnits(balAfter, 18), 'KAIROS');
  console.log('Minted:', ethers.formatUnits(balAfter - balBefore, 18), 'KAIROS');
  console.log('\n🎉 Safe mint works! Backend is ready for automated mint/burn.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
