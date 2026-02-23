const { ethers } = require("ethers");
require("dotenv").config();

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const WALLET = "0xCee44904A6aA94dEa28754373887E07D4B6f4968";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const nonce = await provider.getTransactionCount(WALLET);
  const pendingNonce = await provider.getTransactionCount(WALLET, "pending");
  const balance = await provider.getBalance(WALLET);

  console.log("Confirmed nonce:", nonce);
  console.log("Pending nonce:", pendingNonce);
  console.log("Balance:", ethers.formatEther(balance), "POL");

  if (pendingNonce > nonce) {
    console.log(`\nStuck TX at nonce ${nonce} — replacing with cancel...`);
    const feeData = await provider.getFeeData();
    console.log("Gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");

    const tx = await wallet.sendTransaction({
      to: WALLET,
      value: 0,
      nonce: nonce,
      gasLimit: 21000,
      maxFeePerGas: feeData.gasPrice * 5n,
      maxPriorityFeePerGas: feeData.gasPrice * 3n,
    });
    console.log("Cancel TX:", tx.hash);
    const receipt = await tx.wait();
    console.log("Done! Block:", receipt.blockNumber);
    const newNonce = await provider.getTransactionCount(WALLET);
    console.log("New nonce:", newNonce);
  } else {
    console.log("No stuck tx. Nonce is clean at", nonce);
  }
}

main().catch(console.error);
