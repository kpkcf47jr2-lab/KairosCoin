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

  // Auto Mint/Burn Engine
  depositAddress: process.env.DEPOSIT_ADDRESS || "",          // Address that receives stablecoin deposits
  redemptionAddress: process.env.REDEMPTION_ADDRESS || "",    // Address that receives KAIROS for redemption
  depositPollInterval: parseInt(process.env.DEPOSIT_POLL_INTERVAL || "15000", 10),
  redemptionPollInterval: parseInt(process.env.REDEMPTION_POLL_INTERVAL || "15000", 10),
  autoEngineEnabled: process.env.AUTO_ENGINE_ENABLED !== "false", // Enabled by default

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  // Transak Fiat On-Ramp
  transakApiKey: process.env.TRANSAK_API_KEY || "",
  transakApiSecret: process.env.TRANSAK_API_SECRET || "",
  transakWebhookSecret: process.env.TRANSAK_WEBHOOK_SECRET || "",
  transakEnvironment: process.env.TRANSAK_ENV || "STAGING",  // STAGING or PRODUCTION

  // Notifications
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",

  // Turso (persistent cloud SQLite)
  tursoMainUrl: process.env.TURSO_MAIN_URL || "",
  tursoMainToken: process.env.TURSO_MAIN_TOKEN || "",
  tursoAuthUrl: process.env.TURSO_AUTH_URL || "",
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || "",

  // Paths (fallback for local dev without Turso)
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
