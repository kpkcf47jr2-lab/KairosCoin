require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin — Hardhat Configuration
//  Owner: Kairos 777 Inc.
//  "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// Only include accounts if a valid 66-char hex private key is set
const isValidKey = DEPLOYER_PRIVATE_KEY.length === 66 && DEPLOYER_PRIVATE_KEY.startsWith("0x");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // ── BSC (Binance Smart Chain) ─────────────────────────
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 10000000000, // 10 gwei
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 3000000000, // 3 gwei
    },
    // ── Ethereum Testnets ─────────────────────────────────
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // ── Mainnet ───────────────────────────────────────────
    // ethereum: {
    //   url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
    //   chainId: 1,
    // },
    // polygon: {
    //   url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
    //   chainId: 137,
    // },
    // base: {
    //   url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
    //   chainId: 8453,
    // },
    // arbitrum: {
    //   url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
    //   chainId: 42161,
    // },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};
