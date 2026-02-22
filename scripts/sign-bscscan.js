/**
 * Sign a BscScan verification message
 * Usage: SIGN_MSG="paste message here" npx hardhat run scripts/sign-bscscan.js --network bsc
 */
const { ethers } = require("hardhat");

async function main() {
  const message = process.env.SIGN_MSG;
  if (!message) {
    console.error("ERROR: Set SIGN_MSG environment variable with the BscScan message");
    console.error('Example: SIGN_MSG="[BscScan.com ...] I, hereby verify..." npx hardhat run scripts/sign-bscscan.js --network bsc');
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log("\n══════════════════════════════════════════════");
  console.log("  BscScan Address Ownership Verification");
  console.log("══════════════════════════════════════════════");
  console.log("Signer:", signer.address);
  console.log("Message:", message);
  
  const signature = await signer.signMessage(message);
  
  console.log("\n✅ SIGNATURE (copy this entire line):\n");
  console.log(signature);
  console.log("\nLength:", signature.length, "chars");
  console.log("══════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
