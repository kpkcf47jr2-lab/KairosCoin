// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Perpetuals API Routes (DEX-Routed)
//
//  Routes trading orders through GMX V2 on Arbitrum
//  Collateral locked on KairosPerps smart contract
//
//  PUBLIC (wallet auth):
//    POST /api/perps/open            — Open leveraged position (→ GMX V2)
//    POST /api/perps/close           — Close a position (→ GMX V2)
//    GET  /api/perps/positions       — Get open positions (on-chain)
//    GET  /api/perps/history         — Get closed/liquidated positions
//    GET  /api/perps/account         — Get margin account (on-chain)
//    GET  /api/perps/prices          — Get current prices
//    GET  /api/perps/pairs           — Get supported DEX pairs
//    GET  /api/perps/stats           — Global protocol statistics
//    GET  /api/perps/status          — DEX router status
//
//  ADMIN:
//    GET  /api/perps/admin/relayer   — Get relayer info
//
//  "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const logger = require("../utils/logger");
const dexRouter = require("../services/dexRouter");

const router = express.Router();

// ── Wallet authentication middleware ─────────────────────────────────────────
function requireWallet(req, res, next) {
  const wallet = req.body?.wallet || req.query?.wallet;
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ 
      error: "Valid wallet address required",
      hint: "Send wallet in body or query param"
    });
  }
  req.wallet = wallet.toLowerCase();
  next();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/status — DEX Router status (health check)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/status", (req, res) => {
  const status = dexRouter.getStatus();
  res.json({ 
    success: true, 
    data: status,
    message: "KairosPerps DEX Router — Orders routed to GMX V2 on Arbitrum",
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/prices — Current prices for all supported pairs
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/prices", (req, res) => {
  const prices = dexRouter.getAllPrices();
  res.json({ success: true, data: prices, timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/pairs — Supported DEX trading pairs
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/pairs", (req, res) => {
  const pairs = dexRouter.getSupportedPairs();
  const pairInfo = pairs.map(pair => ({
    pair,
    market: "GMX V2",
    network: "Arbitrum",
    maxLeverage: 50,
    minCollateral: 10,
    collateralToken: "KAIROS",
    fees: { open: "0.10%", close: "0.10%" },
  }));
  res.json({ success: true, data: pairInfo });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/account — Get trader's on-chain account
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/account", requireWallet, async (req, res) => {
  try {
    const account = await dexRouter.getAccount(req.wallet);
    
    // Also get open positions for equity calculation
    const positions = await dexRouter.getPositions(req.wallet);
    const unrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    
    res.json({
      success: true,
      data: {
        ...account,
        equity: (account.balance || 0) + unrealizedPnl,
        unrealizedPnl,
        freeMargin: (account.available || 0) + unrealizedPnl,
        openPositions: positions.length,
        execution: "Hybrid (SQLite + GMX V2)",
      },
    });
  } catch (err) {
    logger.error("Perps account error:", err.message);
    res.status(500).json({ error: "Failed to fetch account", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/perps/open — Open a leveraged position via DEX
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/open", requireWallet, async (req, res) => {
  try {
    const { pair, side, leverage, collateral } = req.body;
    
    // Validate inputs
    if (!pair || !side || !leverage || !collateral) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: { pair: "e.g. BTC/USD", side: "LONG or SHORT", leverage: "2-50", collateral: "amount in KAIROS" },
      });
    }
    
    const sideUpper = side.toUpperCase();
    if (!["LONG", "SHORT"].includes(sideUpper)) {
      return res.status(400).json({ error: "Side must be LONG or SHORT" });
    }
    
    const leverageNum = parseInt(leverage);
    if (leverageNum < 2 || leverageNum > 50) {
      return res.status(400).json({ error: "Leverage must be between 2x and 50x" });
    }
    
    const collateralNum = parseFloat(collateral);
    if (collateralNum < 10) {
      return res.status(400).json({ error: "Minimum collateral: 10 KAIROS" });
    }
    
    logger.info(`Perps: ${req.wallet} opening ${sideUpper} ${pair} ${leverageNum}x (${collateralNum} KAIROS)`);
    
    // Route to DEX
    const position = await dexRouter.openPosition(
      req.wallet,
      pair,
      sideUpper,
      leverageNum,
      collateralNum
    );
    
    res.json({
      success: true,
      data: position,
      message: `${sideUpper} ${pair} ${leverageNum}x opened — routed to GMX V2`,
      execution: {
        dex: "GMX V2",
        network: "Arbitrum",
        gmxOrderKey: position.gmxOrderKey,
        contract: "KairosPerps",
      },
    });
    
  } catch (err) {
    logger.error("Perps open error:", err.message);
    res.status(500).json({ error: "Failed to open position", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/perps/close — Close a position via DEX
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/close", requireWallet, async (req, res) => {
  try {
    const { positionId } = req.body;
    
    if (!positionId) {
      return res.status(400).json({ error: "positionId required" });
    }
    
    logger.info(`Perps: ${req.wallet} closing position #${positionId}`);
    
    const result = await dexRouter.closePosition(parseInt(positionId));
    
    // Verify the position belongs to this wallet
    if (result.trader && result.trader.toLowerCase() !== req.wallet) {
      return res.status(403).json({ error: "Not your position" });
    }
    
    res.json({
      success: true,
      data: result,
      message: `Position #${positionId} closed — P&L: ${result.pnl >= 0 ? '+' : ''}${result.pnl.toFixed(2)} KAIROS`,
      execution: {
        dex: "GMX V2",
        network: "Arbitrum", 
        gmxCloseOrderKey: result.gmxCloseOrderKey,
      },
    });
    
  } catch (err) {
    logger.error("Perps close error:", err.message);
    res.status(500).json({ error: "Failed to close position", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/positions — Open positions with live P&L
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/positions", requireWallet, async (req, res) => {
  try {
    const positions = await dexRouter.getPositions(req.wallet);
    res.json({ 
      success: true, 
      data: positions,
      count: positions.length,
      execution: "GMX V2 (Arbitrum)",
    });
  } catch (err) {
    logger.error("Perps positions error:", err.message);
    res.status(500).json({ error: "Failed to fetch positions", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/history — Closed & liquidated positions
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/history", requireWallet, async (req, res) => {
  try {
    const history = await dexRouter.getHistory(req.wallet);
    res.json({ 
      success: true, 
      data: history,
      count: history.length,
    });
  } catch (err) {
    logger.error("Perps history error:", err.message);
    res.status(500).json({ error: "Failed to fetch history", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/perps/stats — Global protocol statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const stats = await dexRouter.getGlobalStats();
    res.json({
      success: true,
      data: {
        ...stats,
        dex: "GMX V2",
        network: "Arbitrum One",
        contract: process.env.KAIROS_PERPS_ADDRESS || "Not deployed",
      },
    });
  } catch (err) {
    logger.error("Perps stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats", detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN: GET /api/perps/admin/relayer — Relayer wallet info
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/admin/relayer", (req, res) => {
  // Basic admin check (in production, use proper auth)
  const adminKey = req.headers["x-admin-key"] || req.query.adminKey;
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const status = dexRouter.getStatus();
  res.json({ success: true, data: status });
});

module.exports = router;
