// ═══════════════════════════════════════════════════════════════════════════════
//  ██╗  ██╗ █████╗ ██╗██████╗  ██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗
//  ██║ ██╔╝██╔══██╗██║██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║
//  █████╔╝ ███████║██║██████╔╝██║   ██║███████╗██║     ██║   ██║██║██╔██╗ ██║
//  ██╔═██╗ ██╔══██║██║██╔══██╗██║   ██║╚════██║██║     ██║   ██║██║██║╚██╗██║
//  ██║  ██╗██║  ██║██║██║  ██║╚██████╔╝███████║╚██████╗╚██████╔╝██║██║ ╚████║
//  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝
//
//  Stablecoin Backend v1.1.0
//  Real-time automated mint/burn • Proof of Reserves • Fiat On-Ramp
//  Superior to USDT/USDC — real-time, on-chain verifiable, 24/7 API access
//
//  Endpoints:
//    POST /api/mint              — Mint KAIROS (admin, 1:1 with USD deposit)
//    POST /api/burn              — Burn KAIROS (admin, on USD withdrawal)
//    GET  /api/reserves          — Proof of Reserves (public)
//    GET  /api/reserves/ratio    — Backing ratio (public)
//    GET  /api/supply            — Token supply info (public)
//    GET  /api/supply/total      — Plain text total supply
//    GET  /api/supply/circulating— Plain text circulating supply
//    GET  /api/fees              — Fee transparency (public)
//    GET  /api/health            — System health (public)
//    POST /api/fiat/create-order — Create fiat purchase order (public)
//    GET  /api/fiat/order/:id    — Get fiat order status (public)
//    POST /api/webhook/transak   — Transak webhook handler (automated)
//    POST /api/stripe/create-checkout — Create Stripe Checkout session
//    GET  /api/stripe/config      — Stripe publishable key
//    POST /api/webhook/stripe     — Stripe webhook handler (automated)
// ═══════════════════════════════════════════════════════════════════════════════

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const logger = require("./utils/logger");
const blockchain = require("./services/blockchain");
const db = require("./services/database");
const depositMonitor = require("./services/depositMonitor");
const redemptionMonitor = require("./services/redemptionMonitor");
const { generalLimiter } = require("./middleware/rateLimiter");

// ── Import Routes ────────────────────────────────────────────────────────────
const mintRoutes = require("./routes/mint");
const burnRoutes = require("./routes/burn");
const reservesRoutes = require("./routes/reserves");
const supplyRoutes = require("./routes/supply");
const healthRoutes = require("./routes/health");
const fiatRoutes = require("./routes/fiat");
const webhookRoutes = require("./routes/webhook");
const stripeRoutes = require("./routes/stripe");
const stripeWebhookRoutes = require("./routes/stripeWebhook");
const redeemRoutes = require("./routes/redeem");

// ── Express App ──────────────────────────────────────────────────────────────
const app = express();

// ── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "https://kairos-777.com",
      "https://www.kairos-777.com",
      "https://kairos-wallet.netlify.app",
      "https://global.transak.com",
      "https://staging.transak.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Transak-Signature", "Webhook-Secret"],
    maxAge: 86400,
  })
);

// ── Stripe Webhook (must be before express.json() for raw body verification) ─
app.use("/api/webhook/stripe", stripeWebhookRoutes);

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Global Rate Limiting ─────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Request Logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const elapsed = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[logLevel](`${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      elapsed,
      ip: req.ip,
    });
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Root — API info
app.get("/", (req, res) => {
  res.json({
    service: "KairosCoin Stablecoin Backend",
    version: "1.0.0",
    description:
      "Real-time automated mint/burn system with transparent Proof of Reserves",
    token: {
      name: "KairosCoin",
      symbol: "KAIROS",
      network: "BNB Smart Chain (BSC)",
      contract: config.contractAddress,
    },
    endpoints: {
      public: {
        "GET /api/supply": "Token supply information",
        "GET /api/supply/total": "Total supply (plain text)",
        "GET /api/supply/circulating": "Circulating supply (plain text)",
        "GET /api/supply/balance/:address": "Check address balance",
        "GET /api/fees": "Fee transparency",
        "GET /api/reserves": "Proof of Reserves",
        "GET /api/reserves/ratio": "Backing ratio",
        "GET /api/reserves/snapshots": "Historical snapshots",
        "GET /api/health": "System health",
        "GET /api/health/ping": "Simple ping",
        "GET /api/health/stats": "Operation statistics",
        "GET /api/engine/status": "Auto mint/burn engine status",
      },
      admin: {
        "POST /api/mint": "Mint KAIROS (requires master API key)",
        "POST /api/burn": "Burn KAIROS (requires master API key)",
        "GET  /api/mint/history": "Mint history (requires master API key)",
        "GET  /api/burn/history": "Burn history (requires master API key)",
        "POST /api/reserves": "Record reserve change (requires master API key)",
        "POST /api/reserves/snapshot": "Create audit snapshot (requires master API key)",
        "GET  /api/reserves/history": "Reserve history (requires master API key)",
        "GET  /api/fiat/stats": "Fiat purchase statistics (requires master API key)",
      },
      fiat: {
        "POST /api/fiat/create-order": "Create fiat purchase order",
        "GET  /api/fiat/order/:id": "Get fiat order status",
        "GET  /api/fiat/orders?wallet=0x...": "List orders for a wallet",
        "POST /api/webhook/transak": "Transak webhook (automated)",
      },
    },
    documentation: "https://kairos-777.com",
    social: {
      twitter: "https://x.com/777_inc13680",
      telegram: "https://t.me/KairosCoin_777",
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use("/api/mint", mintRoutes);
app.use("/api/burn", burnRoutes);
app.use("/api/reserves", reservesRoutes);
app.use("/api/supply", supplyRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/fiat", fiatRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/redeem", redeemRoutes);
// Note: Stripe webhook is mounted earlier (before express.json) for raw body

// Fee endpoint (defined as /fees in supply router, so mount at /api)
const { feesRouter } = require("./routes/supply");
app.use("/api", feesRouter);

// ── Auto Engine Status ───────────────────────────────────────────────────────
app.get("/api/engine/status", (req, res) => {
  res.json({
    success: true,
    data: {
      engine: "KairosCoin Auto Mint/Burn Engine",
      version: "1.0.0",
      enabled: config.autoEngineEnabled,
      depositMonitor: depositMonitor.getStatus(),
      redemptionMonitor: redemptionMonitor.getStatus(),
      description: {
        mint: "USDT/BUSD/USDC deposits are detected automatically → KAIROS minted 1:1 to depositor",
        burn: "KAIROS sent to redemption address → Auto-burned → USDT sent back to user",
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `${req.method} ${req.path} does not exist`,
    hint: "GET / for available endpoints",
  });
});

// ── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STARTUP SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║            KairosCoin Stablecoin Backend v1.0.0             ║
  ║        Real-time Mint/Burn • Proof of Reserves • API        ║
  ╚══════════════════════════════════════════════════════════════╝
  `);

  try {
    // 1. Validate configuration
    logger.info("Validating configuration...");
    config.validate();
    logger.info("Configuration valid ✓");

    // 2. Initialize database
    logger.info("Initializing database...");
    db.initialize();
    logger.info("Database initialized ✓");

    // 3. Initialize blockchain connection
    logger.info("Connecting to BSC mainnet...");
    await blockchain.initialize();
    logger.info("Blockchain connected ✓");

    // 4. Get initial state
    const supply = await blockchain.getSupplyInfo();
    const gasBalance = await blockchain.getOwnerGasBalance();

    console.log(`
  ┌──────────────────────────────────────────────────────────────┐
  │  Token: ${supply.totalSupply} KAIROS (total supply)
  │  Circulating: ${supply.circulatingSupply} KAIROS
  │  Owner Gas: ${gasBalance} BNB
  │  Contract: ${config.contractAddress}
  │  Network: BSC Mainnet (Chain ID: ${config.chainId})
  └──────────────────────────────────────────────────────────────┘
    `);

    // 5. Start event listener
    logger.info("Starting blockchain event listener...");
    blockchain.startEventListener();
    logger.info("Event listener started ✓");

    // 6. Start auto mint/burn monitors
    if (config.autoEngineEnabled) {
      logger.info("Starting auto mint/burn engine...");
      await depositMonitor.start();
      await redemptionMonitor.start();
      logger.info("Auto mint/burn engine started ✓");
    } else {
      logger.info("Auto mint/burn engine DISABLED");
    }

    // 7. Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      console.log(`
  ═══════════════════════════════════════════════════════════════
    🟢 Server live at http://localhost:${config.port}
    🔗 API docs at http://localhost:${config.port}/
    📊 Health at http://localhost:${config.port}/api/health
    💰 Reserves at http://localhost:${config.port}/api/reserves
    🔄 Auto Engine: ${config.autoEngineEnabled ? 'ENABLED' : 'DISABLED'}
  ═══════════════════════════════════════════════════════════════
      `);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      depositMonitor.stop();
      redemptionMonitor.stop();
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
      // Force close after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    });
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled rejection", { reason: String(reason) });
    });
  } catch (error) {
    logger.error("STARTUP FAILED", { error: error.message, stack: error.stack });
    console.error("\n  ❌ STARTUP FAILED:", error.message);
    console.error("  Check your .env configuration and try again.\n");
    process.exit(1);
  }
}

start();
