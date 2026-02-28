require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Exchange — Hardhat Configuration
//  Owner: Kairos 777 Inc. — "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

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
      viaIR: true,
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: "https://bsc-dataseed1.binance.org",
        enabled: false, // Enable for fork-based testing
      },
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 3000000000,
    },
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 10000000000,
    },
    ethereum: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1,
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 137,
    },
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 42161,
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: isValidKey ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};
