// ═══════════════════════════════════════════════════════
//  KAIROS — Safe Operations via Script
//  Execute any Safe transaction from CLI
//  Uses DEPLOYER_PRIVATE_KEY from .env (which is the Safe owner)
// ═══════════════════════════════════════════════════════

require('dotenv').config();
const { ethers } = require('ethers');

// ── Safe addresses ──
const SAFE_ADDRESS = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
const SAFE_SINGLETON = '0x41675C099F32341bf84BFc5382aF534df5C7461a';

// ── Safe ABI (minimal for execTransaction) ──
const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function VERSION() view returns (string)',
  'function isOwner(address) view returns (bool)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool)',
  'function domainSeparator() view returns (bytes32)',
];

// Operation types
const CALL = 0;
const DELEGATECALL = 1;

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Usage: node scripts/safe-exec.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  info                         — Show Safe details');
    console.log('  transfer-ownership <contract> <newOwner> — Transfer contract ownership');
    console.log('  add-minter <contract> <minter>           — Grant MINTER_ROLE');
    console.log('  revoke-minter <contract> <minter>        — Revoke MINTER_ROLE');
    console.log('  send-bnb <to> <amount>                   — Send BNB from Safe');
    console.log('  send-token <token> <to> <amount>         — Send ERC20 from Safe');
    console.log('  custom <to> <data>                       — Execute arbitrary calldata');
    process.exit(0);
  }

  // Connect
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, signer);

  console.log('Signer:', signer.address);
  console.log('Safe:', SAFE_ADDRESS);
  console.log('');

  // Verify signer is owner
  const isOwner = await safe.isOwner(signer.address);
  if (!isOwner) {
    console.error('ERROR: Signer is NOT an owner of this Safe');
    process.exit(1);
  }

  switch (command) {
    case 'info': {
      const owners = await safe.getOwners();
      const threshold = await safe.getThreshold();
      const nonce = await safe.nonce();
      const version = await safe.VERSION();
      const balance = await provider.getBalance(SAFE_ADDRESS);
      
      console.log('=== SAFE INFO ===');
      console.log('Version:', version);
      console.log('Owners:', owners.join(', '));
      console.log('Threshold:', threshold.toString(), 'of', owners.length);
      console.log('Nonce:', nonce.toString());
      console.log('BNB Balance:', ethers.formatEther(balance));
      break;
    }

    case 'transfer-ownership': {
      const contractAddr = process.argv[3];
      const newOwner = process.argv[4];
      if (!contractAddr || !newOwner) {
        console.error('Usage: safe-exec.js transfer-ownership <contract> <newOwner>');
        process.exit(1);
      }
      const iface = new ethers.Interface(['function transferOwnership(address)']);
      const data = iface.encodeFunctionData('transferOwnership', [newOwner]);
      await execSafeTx(safe, signer, contractAddr, 0n, data);
      break;
    }

    case 'add-minter': {
      const contractAddr = process.argv[3];
      const minter = process.argv[4];
      if (!contractAddr || !minter) {
        console.error('Usage: safe-exec.js add-minter <contract> <minter>');
        process.exit(1);
      }
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
      const iface = new ethers.Interface(['function grantRole(bytes32, address)']);
      const data = iface.encodeFunctionData('grantRole', [MINTER_ROLE, minter]);
      await execSafeTx(safe, signer, contractAddr, 0n, data);
      break;
    }

    case 'revoke-minter': {
      const contractAddr = process.argv[3];
      const minter = process.argv[4];
      if (!contractAddr || !minter) {
        console.error('Usage: safe-exec.js revoke-minter <contract> <minter>');
        process.exit(1);
      }
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
      const iface = new ethers.Interface(['function revokeRole(bytes32, address)']);
      const data = iface.encodeFunctionData('revokeRole', [MINTER_ROLE, minter]);
      await execSafeTx(safe, signer, contractAddr, 0n, data);
      break;
    }

    case 'send-bnb': {
      const to = process.argv[3];
      const amount = process.argv[4];
      if (!to || !amount) {
        console.error('Usage: safe-exec.js send-bnb <to> <amount>');
        process.exit(1);
      }
      const value = ethers.parseEther(amount);
      await execSafeTx(safe, signer, to, value, '0x');
      break;
    }

    case 'send-token': {
      const token = process.argv[3];
      const to = process.argv[4];
      const amount = process.argv[5];
      if (!token || !to || !amount) {
        console.error('Usage: safe-exec.js send-token <token> <to> <amount>');
        process.exit(1);
      }
      // Get decimals
      const erc20 = new ethers.Contract(token, ['function decimals() view returns (uint8)'], provider);
      const decimals = await erc20.decimals();
      const iface = new ethers.Interface(['function transfer(address, uint256)']);
      const data = iface.encodeFunctionData('transfer', [to, ethers.parseUnits(amount, decimals)]);
      await execSafeTx(safe, signer, token, 0n, data);
      break;
    }

    case 'custom': {
      const to = process.argv[3];
      const data = process.argv[4];
      if (!to || !data) {
        console.error('Usage: safe-exec.js custom <to> <data>');
        process.exit(1);
      }
      await execSafeTx(safe, signer, to, 0n, data);
      break;
    }

    default:
      console.error('Unknown command:', command);
      process.exit(1);
  }
}

// ── Execute a Safe transaction with EIP-712 signature ──
async function execSafeTx(safe, signer, to, value, data) {
  const nonce = await safe.nonce();
  console.log('Safe nonce:', nonce.toString());
  console.log('To:', to);
  console.log('Value:', ethers.formatEther(value), 'BNB');
  console.log('Data:', data.length > 10 ? data.slice(0, 10) + '...' : data);
  console.log('');

  // Get transaction hash from Safe contract
  const safeTxHash = await safe.getTransactionHash(
    to,
    value,
    data,
    CALL, // operation
    0,    // safeTxGas
    0,    // baseGas
    0,    // gasPrice
    ethers.ZeroAddress, // gasToken
    ethers.ZeroAddress, // refundReceiver
    nonce
  );

  console.log('Safe TX Hash:', safeTxHash);

  // Sign the hash (EIP-191 eth_sign style for Safe)
  // Safe expects: {32-bytes r}{32-bytes s}{1-byte v}
  const signature = await signer.signMessage(ethers.getBytes(safeTxHash));
  
  // Adjust v: Safe expects v to be 31 or 32 for eth_sign
  // ethers.signMessage adds 27/28 prefix, Safe needs +4 for eth_sign
  const sigBytes = ethers.getBytes(signature);
  sigBytes[64] += 4; // v += 4 for eth_sign
  const adjustedSig = ethers.hexlify(sigBytes);

  console.log('Signature:', adjustedSig.slice(0, 20) + '...');
  console.log('');
  console.log('Executing Safe transaction...');

  const tx = await safe.execTransaction(
    to,
    value,
    data,
    CALL,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    adjustedSig,
    { gasLimit: 500000 }
  );

  console.log('TX sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('');
  console.log('SUCCESS — Safe transaction executed');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
