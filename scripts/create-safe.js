// ═══════════════════════════════════════════════════════
//  Create a Gnosis Safe (Safe{Wallet}) on BSC
//  1-of-1 multisig with 0x37935A as sole owner
//  Deployed via SafeProxyFactory v1.4.1
// ═══════════════════════════════════════════════════════

require('dotenv').config();
const { ethers } = require('ethers');

// ── Configuration ──
const SAFE_OWNER = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8'; // sole signer
const THRESHOLD = 1; // 1-of-1

// Safe v1.4.1 canonical addresses (same on all EVM chains)
const SAFE_PROXY_FACTORY = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON = '0x41675C099F32341bf84BFc5382aF534df5C7461a';
const FALLBACK_HANDLER = '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99'; // CompatibilityFallbackHandler

// ABIs (minimal)
const FACTORY_ABI = [
  'function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)',
  'event ProxyCreation(address indexed proxy, address singleton)',
];

const SAFE_ABI = [
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)',
];

async function main() {
  // Provider
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org', 56);

  // Use owner wallet (has BNB for gas)
  const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('ERROR: Set DEPLOYER_PRIVATE_KEY in .env (owner wallet with BNB for gas)');
    process.exit(1);
  }

  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB`);

  if (balance < ethers.parseEther('0.003')) {
    console.error('ERROR: Need at least 0.003 BNB for gas');
    process.exit(1);
  }

  // ── Encode Safe setup() call ──
  const safeInterface = new ethers.Interface(SAFE_ABI);
  const setupData = safeInterface.encodeFunctionData('setup', [
    [SAFE_OWNER],                        // owners array (1 owner)
    THRESHOLD,                            // threshold (1-of-1)
    ethers.ZeroAddress,                   // to (no delegate call)
    '0x',                                 // data (no delegate call data)
    FALLBACK_HANDLER,                     // fallbackHandler
    ethers.ZeroAddress,                   // paymentToken (no payment)
    0,                                    // payment (0)
    ethers.ZeroAddress,                   // paymentReceiver
  ]);

  console.log('\n── Creating Safe ──');
  console.log(`Owner: ${SAFE_OWNER}`);
  console.log(`Threshold: ${THRESHOLD}-of-1`);
  console.log(`Singleton: ${SAFE_SINGLETON}`);

  // ── Deploy Safe Proxy ──
  const factory = new ethers.Contract(SAFE_PROXY_FACTORY, FACTORY_ABI, deployer);
  
  // Use timestamp as salt nonce for uniqueness
  const saltNonce = BigInt(Date.now());
  
  console.log(`Salt nonce: ${saltNonce}`);
  console.log('Sending transaction...');

  const tx = await factory.createProxyWithNonce(
    SAFE_SINGLETON,
    setupData,
    saltNonce,
    {
      gasLimit: 300000,
    }
  );

  console.log(`TX hash: ${tx.hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);

  // ── Extract Safe address from ProxyCreation event ──
  const proxyCreationEvent = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
      return parsed?.name === 'ProxyCreation';
    } catch { return false; }
  });

  let safeAddress;
  if (proxyCreationEvent) {
    const parsed = factory.interface.parseLog({ topics: proxyCreationEvent.topics, data: proxyCreationEvent.data });
    safeAddress = parsed.args.proxy;
  } else {
    // Fallback: check all logs for an address
    console.log('ProxyCreation event not found in standard way, checking logs...');
    for (const log of receipt.logs) {
      if (log.topics[0] && log.topics.length >= 2) {
        // ProxyCreation event has proxy as indexed param
        const addr = '0x' + log.topics[1].slice(26);
        const code = await provider.getCode(addr);
        if (code.length > 4) {
          safeAddress = addr;
          break;
        }
      }
    }
  }

  if (!safeAddress) {
    console.error('ERROR: Could not extract Safe address from receipt');
    console.log('TX receipt logs:', JSON.stringify(receipt.logs, null, 2));
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`  ✅ SAFE CREATED SUCCESSFULLY`);
  console.log(`  Address: ${safeAddress}`);
  console.log(`  Owner:   ${SAFE_OWNER}`);
  console.log(`  Threshold: ${THRESHOLD}-of-1`);
  console.log(`  Chain:   BSC (56)`);
  console.log(`  TX:      https://bscscan.com/tx/${tx.hash}`);
  console.log(`  Safe UI: https://app.safe.global/home?safe=bnb:${safeAddress}`);
  console.log('══════════════════════════════════════════');

  // Verify the Safe is properly set up
  const GETOWNERS_ABI = ['function getOwners() view returns (address[])', 'function getThreshold() view returns (uint256)'];
  const safe = new ethers.Contract(safeAddress, GETOWNERS_ABI, provider);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  console.log(`\nVerification:`);
  console.log(`  Owners: ${owners.join(', ')}`);
  console.log(`  Threshold: ${threshold.toString()}`);
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
