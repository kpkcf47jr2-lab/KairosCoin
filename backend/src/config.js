// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Configuration
//  Centralized config with validation
// ═══════════════════════════════════════════════════════════════════════════════

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  env: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  // API Security
  apiMasterKey: process.env.API_MASTER_KEY || "",
  apiPublicKey: process.env.API_PUBLIC_KEY || "",

  // Blockchain
  bscRpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
  ownerPrivateKey: process.env.OWNER_PRIVATE_KEY || "",
  contractAddress: process.env.CONTRACT_ADDRESS || "0x14D41707269c7D8b8DFa5095b38824a46dA05da3",
  chainId: parseInt(process.env.CHAIN_ID || "56", 10),

  // Rate Limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  // Notifications
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",

  // Paths
  dbPath: require("path").join(__dirname, "../data/kairos.db"),
  logsPath: require("path").join(__dirname, "../logs"),
};

// ── Validation ───────────────────────────────────────────────────────────────

function validateConfig() {
  const errors = [];

  if (!config.apiMasterKey || config.apiMasterKey === "CHANGE_ME_TO_A_STRONG_KEY") {
    errors.push("API_MASTER_KEY must be set to a strong secret");
  }

  if (!config.ownerPrivateKey || config.ownerPrivateKey === "0xCHANGE_ME") {
    errors.push("OWNER_PRIVATE_KEY must be set (contract owner wallet)");
  }

  if (!config.contractAddress) {
    errors.push("CONTRACT_ADDRESS must be set");
  }

  return errors;
}

config.validate = validateConfig;

module.exports = config;
