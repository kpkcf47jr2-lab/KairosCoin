/**
 * Transfer KAIROS tokens to wallets
 * Usage: npx hardhat run scripts/distribute-tokens.js --network bsc
 */
const hre = require("hardhat");

const KAIROS_ADDRESS = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3";

const TRANSFERS = [
  { to: "0x26F71AAFc931512Ed74d544993d254c6763eaB2e", amount: "5000000" },
  { to: "0xB5B1d63690975a161AB29F1B1ec0a4476e17641F", amount: "3000000" },
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log(`Signer: ${signer.address}\n`);

  const bnb = await hre.ethers.provider.getBalance(signer.address);
  console.log(`BNB: ${hre.ethers.formatEther(bnb)}`);

  const kairos = await hre.ethers.getContractAt(
    ["function transfer(address to, uint256 amount) returns (bool)",
     "function balanceOf(address) view returns (uint256)"],
    KAIROS_ADDRESS,
    signer
  );

  const bal = await kairos.balanceOf(signer.address);
  console.log(`KAIROS: ${hre.ethers.formatEther(bal)}\n`);

  for (const t of TRANSFERS) {
    const amount = hre.ethers.parseEther(t.amount);
    process.stdout.write(`Sending ${t.amount} to ${t.to.slice(0,10)}...`);
    const tx = await kairos.transfer(t.to, amount, {
      gasPrice: hre.ethers.parseUnits("3", "gwei"),
    });
    await tx.wait();
    console.log(` done (${tx.hash.slice(0,16)}...)`);
  }

  console.log("\nTransfers complete.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
