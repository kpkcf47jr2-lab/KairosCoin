// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Limit Order Keeper Service
//  Monitors prices and marks orders as filled/expired
//  NOTE: On-chain execution is done client-side when user connects wallet.
//        This keeper only monitors and notifies — it marks orders ready to fill.
//  Kairos 777 Inc. — "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const logger = require("../utils/logger");

let db = null;
let keeperInterval = null;
const POLL_INTERVAL = 30000; // Check every 30 seconds
const PRICE_CACHE = { data: {}, ts: 0 };
const PRICE_TTL = 15000; // 15s cache

// ── RPC endpoints for on-chain price checks ──
const CHAIN_RPCS = {
  56: "https://bsc-dataseed1.binance.org",
  1: "https://eth.llamarpc.com",
  137: "https://polygon-rpc.com",
  42161: "https://arb1.arbitrum.io/rpc",
  8453: "https://mainnet.base.org",
};

// Router addresses (Uniswap V2 compatible)
const ROUTERS = {
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E",   // PancakeSwap
  1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",    // Uniswap V2
  137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",   // QuickSwap
  42161: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",  // SushiSwap
  8453: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",   // BaseSwap
};

// Wrapped native addresses
const WRAPPED_NATIVE = {
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",     // WBNB
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",      // WETH
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",     // WMATIC
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",    // WETH (Arb)
  8453: "0x4200000000000000000000000000000000000006",      // WETH (Base)
};

const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Minimal ABI for getAmountsOut
const ROUTER_ABI_FRAGMENT = "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)";

// ═════════════════════════════════════════════════════════════════════════════
//  INITIALIZE
// ═════════════════════════════════════════════════════════════════════════════

function initialize(database) {
  db = database;
  logger.info("Limit Order Keeper initialized");
}

function start() {
  if (!db) {
    logger.warn("Limit Order Keeper: database not initialized, skipping");
    return;
  }

  logger.info(`Limit Order Keeper started (polling every ${POLL_INTERVAL / 1000}s)`);

  // Run immediately then on interval
  processOrders();
  keeperInterval = setInterval(processOrders, POLL_INTERVAL);
}

function stop() {
  if (keeperInterval) {
    clearInterval(keeperInterval);
    keeperInterval = null;
    logger.info("Limit Order Keeper stopped");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PROCESS ORDERS — Main keeper loop
// ═════════════════════════════════════════════════════════════════════════════

async function processOrders() {
  try {
    // 1. Expire old orders
    expireOrders();

    // 2. Check prices for open orders
    const openOrders = db.prepare(
      "SELECT * FROM limit_orders WHERE status = 'open' ORDER BY created_at ASC LIMIT 100"
    ).all();

    if (openOrders.length === 0) return;

    logger.info(`Limit Order Keeper: checking ${openOrders.length} open orders`);

    // Group by chain for batch price checks
    const byChain = {};
    for (const order of openOrders) {
      const cid = order.chain_id || 56;
      if (!byChain[cid]) byChain[cid] = [];
      byChain[cid].push(order);
    }

    // Check each chain
    for (const [chainId, orders] of Object.entries(byChain)) {
      await checkPricesForChain(parseInt(chainId), orders);
    }
  } catch (err) {
    logger.error("Limit Order Keeper error", { error: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPIRE ORDERS
// ═════════════════════════════════════════════════════════════════════════════

function expireOrders() {
  try {
    const result = db.prepare(
      "UPDATE limit_orders SET status = 'expired', updated_at = datetime('now') WHERE status = 'open' AND expiry_at < datetime('now')"
    ).run();

    if (result.changes > 0) {
      logger.info(`Limit Order Keeper: expired ${result.changes} orders`);
    }
  } catch (err) {
    logger.error("Failed to expire orders", { error: err.message });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  CHECK PRICES ON-CHAIN
// ═════════════════════════════════════════════════════════════════════════════

async function checkPricesForChain(chainId, orders) {
  const rpc = CHAIN_RPCS[chainId];
  if (!rpc) return;

  for (const order of orders) {
    try {
      const price = await getOnChainPrice(
        chainId,
        order.sell_token,
        order.buy_token,
        order.sell_decimals || 18,
        order.buy_decimals || 18
      );

      if (price === null) continue;

      // Update current price
      db.prepare("UPDATE limit_orders SET current_price = ?, updated_at = datetime('now') WHERE id = ?")
        .run(price.toString(), order.id);

      // Check if limit price is reached
      const limitPrice = parseFloat(order.limit_price);

      // A limit buy order triggers when current price <= limit price
      // (user wants to buy at a lower price)
      if (price <= limitPrice) {
        // Mark as "filled" — the frontend will prompt user to execute
        db.prepare(
          "UPDATE limit_orders SET status = 'filled', filled_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'open'"
        ).run(order.id);

        logger.info(`Limit order FILLED: ${order.id} — ${order.sell_symbol}→${order.buy_symbol} @ ${price} (limit: ${limitPrice})`, {
          orderId: order.id,
          wallet: order.wallet,
          price,
          limitPrice,
        });
      }
    } catch (err) {
      // Skip individual order errors, don't stop the loop
      logger.warn(`Price check failed for order ${order.id}: ${err.message}`);
    }
  }
}

/**
 * Get the price of sellToken in terms of buyToken using DEX router.
 * Returns the price as a float (how many buyToken per 1 sellToken).
 */
async function getOnChainPrice(chainId, sellToken, buyToken, sellDecimals, buyDecimals) {
  const cacheKey = `${chainId}-${sellToken}-${buyToken}`;
  if (PRICE_CACHE.data[cacheKey] && Date.now() - PRICE_CACHE.ts < PRICE_TTL) {
    return PRICE_CACHE.data[cacheKey];
  }

  const rpc = CHAIN_RPCS[chainId];
  const routerAddr = ROUTERS[chainId];
  const wrapped = WRAPPED_NATIVE[chainId];
  if (!rpc || !routerAddr) return null;

  // Resolve native addresses
  const sellAddr = sellToken === NATIVE_ADDRESS ? wrapped : sellToken;
  const buyAddr = buyToken === NATIVE_ADDRESS ? wrapped : buyToken;

  // Build path
  const path = sellAddr.toLowerCase() === wrapped?.toLowerCase() || buyAddr.toLowerCase() === wrapped?.toLowerCase()
    ? [sellAddr, buyAddr]
    : [sellAddr, wrapped, buyAddr];

  // Use 1 unit of sellToken for price quote
  const oneUnit = BigInt(10) ** BigInt(sellDecimals);

  try {
    // Minimal ethers-free JSON-RPC call
    const callData = encodeGetAmountsOut(oneUnit.toString(), path);

    const response = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: routerAddr, data: callData }, "latest"],
      }),
    });

    const result = await response.json();
    if (result.error || !result.result || result.result === "0x") return null;

    // Decode the last uint256 from the result
    const hex = result.result;
    // getAmountsOut returns uint256[] — the last element is our output
    // Each uint256 is 32 bytes = 64 hex chars
    // Skip first 64 chars (offset) + 64 chars (length) then read the last 64 chars
    const dataAfterPrefix = hex.slice(2); // remove 0x
    const arrayLength = parseInt(dataAfterPrefix.slice(64, 128), 16);
    const lastElementOffset = 128 + (arrayLength - 1) * 64;
    const lastElementHex = dataAfterPrefix.slice(lastElementOffset, lastElementOffset + 64);
    const amountOut = BigInt("0x" + lastElementHex);

    // Calculate price: amountOut / 10^buyDecimals
    const price = Number(amountOut) / (10 ** buyDecimals);

    // Cache it
    PRICE_CACHE.data[cacheKey] = price;
    PRICE_CACHE.ts = Date.now();

    return price;
  } catch {
    return null;
  }
}

/**
 * Encode getAmountsOut(uint256, address[]) call data without ethers.js
 */
function encodeGetAmountsOut(amountIn, path) {
  // Function selector: getAmountsOut(uint256,address[])
  const selector = "0xd06ca61f";

  // Encode amountIn as uint256
  const amountHex = BigInt(amountIn).toString(16).padStart(64, "0");

  // Offset to path array (2 * 32 = 64 bytes = 0x40)
  const offsetHex = "0000000000000000000000000000000000000000000000000000000000000040";

  // Path array length
  const lengthHex = path.length.toString(16).padStart(64, "0");

  // Path addresses (each padded to 32 bytes)
  const pathHex = path.map(addr =>
    addr.toLowerCase().replace("0x", "").padStart(64, "0")
  ).join("");

  return selector + amountHex + offsetHex + lengthHex + pathHex;
}

// ═════════════════════════════════════════════════════════════════════════════

function getStatus() {
  const isRunning = keeperInterval !== null;
  let stats = { open: 0, filled: 0, expired: 0, cancelled: 0 };

  if (db) {
    try {
      const rows = db.prepare(
        "SELECT status, COUNT(*) as count FROM limit_orders GROUP BY status"
      ).all();
      for (const row of rows) {
        stats[row.status] = row.count;
      }
    } catch { /* ignore */ }
  }

  return { running: isRunning, pollInterval: POLL_INTERVAL, stats };
}

module.exports = { initialize, start, stop, getStatus };
