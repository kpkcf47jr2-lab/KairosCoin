// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Fiat Order Routes
//
//  POST /api/fiat/create-order   — Create a fiat purchase order (from frontend)
//  GET  /api/fiat/order/:id      — Get order status (public)
//  GET  /api/fiat/orders         — List orders for a wallet (public)
//  GET  /api/fiat/stats          — Fiat purchase statistics (admin)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const { ethers } = require("ethers");
const { v4: uuidv4 } = require("uuid");
const db = require("../services/database");
const logger = require("../utils/logger");
const { requireMasterKey, optionalAuth } = require("../middleware/auth");
const config = require("../config");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/fiat/providers — Available fiat on-ramp providers
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/providers", (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: "transak",
        name: "Transak",
        status: "pending_kyb",
        currencies: ["USD", "EUR", "GBP"],
        paymentMethods: ["credit_card", "debit_card", "bank_transfer"],
        minAmount: 30,
        maxAmount: 5000,
        fees: "1.5% - 5.5%",
      },
    ],
    note: "Additional providers coming soon (MoonPay, Ramp Network)",
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/fiat/create-order — Frontend creates an order before opening Transak
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/create-order", async (req, res) => {
  try {
    const { walletAddress, fiatAmount, fiatCurrency = "USD", provider = "transak", paymentMethod } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    const errors = [];

    if (!walletAddress) {
      errors.push("'walletAddress' is required");
    } else if (!ethers.isAddress(walletAddress)) {
      errors.push("'walletAddress' must be a valid BSC/Ethereum address");
    }

    if (!fiatAmount) {
      errors.push("'fiatAmount' is required");
    } else {
      const num = Number(fiatAmount);
      if (isNaN(num) || num <= 0) {
        errors.push("'fiatAmount' must be a positive number");
      } else if (num < 20) {
        errors.push("Minimum purchase is $20 USD");
      } else if (num > 50000) {
        errors.push("Maximum single purchase is $50,000 USD");
      }
    }

    if (!["transak", "moonpay", "changelly"].includes(provider)) {
      errors.push("'provider' must be transak, moonpay, or changelly");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // ── Create order ──────────────────────────────────────────────────────
    const orderId = uuidv4();
    db.createFiatOrder({
      id: orderId,
      provider,
      walletAddress: ethers.getAddress(walletAddress),
      fiatAmount: String(fiatAmount),
      fiatCurrency: fiatCurrency.toUpperCase(),
      paymentMethod: paymentMethod || null,
    });

    // ── Build Transak widget URL ──────────────────────────────────────────
    let widgetUrl = null;
    if (provider === "transak" && config.transakApiKey) {
      const env = config.transakEnvironment === "PRODUCTION" ? "global" : "staging";
      const params = new URLSearchParams({
        apiKey: config.transakApiKey,
        environment: config.transakEnvironment,
        cryptoCurrencyCode: "USDT",
        network: "bsc",
        defaultFiatAmount: String(fiatAmount),
        fiatCurrency: fiatCurrency.toUpperCase(),
        walletAddress: config.depositAddress || "0xCee44904A6aA94dEa28754373887E07D4B6f4968",
        partnerOrderId: orderId,
        partnerCustomerId: walletAddress,
        disableWalletAddressForm: "true",
        themeColor: "D4AF37",
        hideMenu: "true",
      });
      widgetUrl = `https://${env}.transak.com/?${params.toString()}`;
    }

    logger.info("Fiat order created via API", {
      orderId,
      provider,
      walletAddress,
      fiatAmount,
      fiatCurrency,
    });

    res.json({
      success: true,
      order: {
        id: orderId,
        provider,
        status: "CREATED",
        fiatAmount: `${fiatAmount} ${fiatCurrency.toUpperCase()}`,
        walletAddress,
        widgetUrl,
        message: "Order created. Complete payment via the provider widget.",
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error("Create fiat order error", { error: error.message });
    res.status(500).json({ error: "Failed to create order", message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/fiat/order/:id — Check order status
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/order/:id", (req, res) => {
  try {
    const order = db.getFiatOrder(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        provider: order.provider,
        status: order.status,
        fiatAmount: `${order.fiat_amount} ${order.fiat_currency}`,
        cryptoAmount: order.crypto_amount ? `${order.crypto_amount} KAIROS` : null,
        walletAddress: order.wallet_address,
        paymentMethod: order.payment_method,
        mintTxHash: order.mint_tx_hash,
        explorer: order.mint_tx_hash ? `https://bscscan.com/tx/${order.mint_tx_hash}` : null,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        completedAt: order.completed_at,
      },
    });

  } catch (error) {
    logger.error("Get fiat order error", { error: error.message, id: req.params.id });
    res.status(500).json({ error: "Failed to get order" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/fiat/orders?wallet=0x...&status=COMPLETED — List orders
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/orders", (req, res) => {
  try {
    const { wallet, status, provider, limit = 20, offset = 0 } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "'wallet' query parameter is required" });
    }

    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const orders = db.getFiatOrders({
      walletAddress: ethers.getAddress(wallet),
      status: status || undefined,
      provider: provider || undefined,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
    });

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        provider: o.provider,
        status: o.status,
        fiatAmount: `${o.fiat_amount} ${o.fiat_currency}`,
        cryptoAmount: o.crypto_amount ? `${o.crypto_amount} KAIROS` : null,
        mintTxHash: o.mint_tx_hash,
        createdAt: o.created_at,
        completedAt: o.completed_at,
      })),
    });

  } catch (error) {
    logger.error("List fiat orders error", { error: error.message });
    res.status(500).json({ error: "Failed to list orders" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/fiat/stats — Fiat purchase statistics (admin only)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/stats", requireMasterKey, (req, res) => {
  try {
    const stats = db.getFiatOrderStats();

    res.json({
      success: true,
      stats: {
        totalOrders: stats.total_orders,
        completedOrders: stats.completed_orders,
        failedOrders: stats.failed_orders,
        pendingOrders: stats.pending_orders,
        totalFiatVolume: `$${Number(stats.total_fiat_volume).toFixed(2)} USD`,
        totalKairosMinted: `${Number(stats.total_kairos_minted).toFixed(2)} KAIROS`,
        successRate: stats.total_orders > 0
          ? `${((stats.completed_orders / stats.total_orders) * 100).toFixed(1)}%`
          : "N/A",
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Fiat stats error", { error: error.message });
    res.status(500).json({ error: "Failed to get stats" });
  }
});

module.exports = router;
