// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Margin Trading API Routes
//
//  PUBLIC (wallet auth):
//    POST /api/margin/deposit        — Deposit KAIROS collateral
//    POST /api/margin/withdraw       — Withdraw available collateral
//    GET  /api/margin/account        — Get margin account summary
//    POST /api/margin/open           — Open a leveraged position
//    POST /api/margin/close          — Close an open position
//    GET  /api/margin/positions      — Get open positions (live P&L)
//    GET  /api/margin/history        — Get closed positions
//    GET  /api/margin/trades         — Get trade history
//    GET  /api/margin/liquidations   — Get liquidation history
//    GET  /api/margin/prices         — Get current prices
//    GET  /api/margin/pairs          — Get supported trading pairs
//
//  ADMIN:
//    GET  /api/margin/admin/stats    — Global margin statistics
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const logger = require("../utils/logger");
const marginEngine = require("../services/marginEngine");
const priceOracle = require("../services/priceOracle");

const router = express.Router();

// ── Wallet authentication middleware ─────────────────────────────────────────
// Users authenticate by providing their wallet address
// In production, this would verify a signed message (EIP-712) to prove ownership
function requireWallet(req, res, next) {
  const wallet = req.body?.wallet || req.query?.wallet;
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: "Valid wallet address required (query param or body field 'wallet')" });
  }
  req.wallet = wallet.toLowerCase();
  next();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/prices — Current prices for all supported pairs
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/prices", (req, res) => {
  const prices = priceOracle.getAllPrices();
  res.json({ success: true, data: prices, timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/pairs — Supported trading pairs with tier info
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/pairs", (req, res) => {
  const pairs = priceOracle.getSupportedPairs().map(symbol => {
    const priceData = priceOracle.getPrice(symbol);
    return {
      symbol: symbol.replace('USDT', '/USDT'),
      binanceSymbol: symbol,
      price: priceData?.price || null,
      change24h: priceData?.change24h || null,
      high24h: priceData?.high24h || null,
      low24h: priceData?.low24h || null,
      volume24h: priceData?.volume24h || null,
    };
  });

  res.json({
    success: true,
    data: {
      pairs,
      leverageTiers: marginEngine.LEVERAGE_TIERS,
      fees: {
        maker: marginEngine.MAKER_FEE_PCT,
        taker: marginEngine.TAKER_FEE_PCT,
      },
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/leverage-tiers — Standalone leverage tiers endpoint
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/leverage-tiers", (req, res) => {
  res.json({
    success: true,
    data: {
      tiers: marginEngine.LEVERAGE_TIERS,
      fees: {
        maker: marginEngine.MAKER_FEE_PCT,
        taker: marginEngine.TAKER_FEE_PCT,
      },
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/account — Get margin account summary with live P&L
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/account", requireWallet, (req, res) => {
  try {
    const summary = marginEngine.getAccountSummary(req.wallet);
    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error("Get account failed", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/margin/deposit — Deposit KAIROS as collateral
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/deposit", requireWallet, (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    if (numAmount < 1) {
      return res.status(400).json({ error: "Minimum deposit: 1 KAIROS" });
    }

    const result = marginEngine.depositCollateral(req.wallet, numAmount);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Deposit failed", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/margin/withdraw — Withdraw available collateral
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/withdraw", requireWallet, (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const result = marginEngine.withdrawCollateral(req.wallet, numAmount);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Withdraw failed", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/margin/open — Open a leveraged position
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/open", requireWallet, (req, res) => {
  try {
    const { pair, side, leverage, collateral, orderType, limitPrice, stopLoss, takeProfit } = req.body;

    // Validation
    const errors = [];
    if (!pair) errors.push("'pair' is required (e.g. 'BTC/USDT')");
    if (!side || !['long', 'short', 'LONG', 'SHORT'].includes(side)) errors.push("'side' must be 'LONG' or 'SHORT'");
    if (!leverage || ![2, 3, 5, 10].includes(Number(leverage))) errors.push("'leverage' must be 2, 3, 5, or 10");
    if (!collateral || parseFloat(collateral) <= 0) errors.push("'collateral' must be a positive number (KAIROS)");

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const position = marginEngine.openPosition(req.wallet, {
      pair,
      side: side.toUpperCase(),
      leverage: Number(leverage),
      collateral: parseFloat(collateral),
      orderType: (orderType || 'MARKET').toUpperCase(),
      limitPrice: limitPrice ? parseFloat(limitPrice) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
    });

    res.json({ success: true, data: position });
  } catch (err) {
    logger.error("Open position failed", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/margin/close — Close an open position
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/close", requireWallet, (req, res) => {
  try {
    const { positionId } = req.body;
    if (!positionId) {
      return res.status(400).json({ error: "'positionId' is required" });
    }

    const result = marginEngine.closePosition(req.wallet, positionId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Close position failed", { wallet: req.wallet, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/positions — Get open positions with live P&L
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/positions", requireWallet, (req, res) => {
  try {
    const positions = marginEngine.getOpenPositions(req.wallet);
    res.json({ success: true, data: positions, count: positions.length });
  } catch (err) {
    logger.error("Get positions failed", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/history — Get closed/liquidated positions
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/history", requireWallet, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const positions = marginEngine.getPositionHistory(req.wallet, limit);
    res.json({ success: true, data: positions, count: positions.length });
  } catch (err) {
    logger.error("Get history failed", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/trades — Get trade audit trail
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/trades", requireWallet, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const trades = marginEngine.getTradeHistory(req.wallet, limit);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (err) {
    logger.error("Get trades failed", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/liquidations — Get liquidation history
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/liquidations", requireWallet, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const liquidations = marginEngine.getLiquidationHistory(req.wallet, limit);
    res.json({ success: true, data: liquidations, count: liquidations.length });
  } catch (err) {
    logger.error("Get liquidations failed", { wallet: req.wallet, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/margin/admin/stats — Global margin trading statistics (admin)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/stats", (req, res) => {
  // In production, require admin API key
  try {
    const stats = marginEngine.getGlobalStats();
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error("Get global stats failed", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
