// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — DEX Router Service
//  Routes perpetual trading orders to GMX V2 on Arbitrum
//
//  Architecture:
//  1. User deposits KAIROS → KairosPerps contract (Arbitrum)
//  2. User submits order → Backend validates & prepares
//  3. Relayer wallet executes on GMX V2 (real DEX)
//  4. Position confirmed → recorded on KairosPerps contract
//  5. Close/Liquidation → settled on-chain
//
//  GMX V2 flow:
//  - Send collateral to OrderVault
//  - Call ExchangeRouter.createOrder() 
//  - Keepers execute order → position opens on GMX
//  - Backend monitors via events/polling
//
//  "In God We Trust"
// ═══════════════════════════════════════════════════════════════════════════════

const { ethers } = require("ethers");
const logger = require("../utils/logger");

// ── GMX V2 Contract Addresses on Arbitrum ────────────────────────────────────
const GMX_CONTRACTS = {
  exchangeRouter: "0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8",
  orderVault:     "0x31eF83a530Fde1B38deDA89C0A6660c6E3143B3c",
  dataStore:      "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
  reader:         "0xf60becbba223EEA9495Da3f606753867eC10d139",
  orderHandler:   "0x352f684ab9e97a6321a13CF03A61316B681D9fD2",
  router:         "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",
};

// ── GMX V2 Market Addresses (Arbitrum) ───────────────────────────────────────
// Market = trading pair on GMX V2
const GMX_MARKETS = {
  "BTC/USD":  "0x47c031236e19d024b42f8AE6DA7A02043e22CF03", // BTC/USD [WBTC-USDC]
  "ETH/USD":  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336", // ETH/USD [WETH-USDC]
  "ARB/USD":  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407", // ARB/USD
  "SOL/USD":  "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9", // SOL/USD
  "DOGE/USD": "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4", // DOGE/USD
  "LINK/USD": "0x7f1fa204bb700853D36994DA19F830b6Ad18455C", // LINK/USD
  "AVAX/USD": "0xD9535bB5f58A1a75032416F2dFe7880C30575a41", // AVAX/USD
  "MATIC/USD":"0x2b3a5F8a2b8B6bDB5c0F3B2f5C1A8a8e7b8D6f9c", // MATIC/USD (if available)
};

// ── Tokens on Arbitrum ───────────────────────────────────────────────────────
const TOKENS = {
  USDC:   "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // native USDC on Arbitrum
  USDC_E: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // bridged USDC.e
  WETH:   "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  WBTC:   "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  ARB:    "0x912CE59144191C1204E64559FE8253a0e49E6548",
  KAIROS: "0x14D41707269c7D8b8DFa5095b38824a46dA05da3", // KairosCoin on Arbitrum
};

// ── KairosPerps Contract (will be set after deployment) ──────────────────────
let KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || "";

// ── Minimal ABIs ─────────────────────────────────────────────────────────────

const EXCHANGE_ROUTER_ABI = [
  "function createOrder(tuple(tuple(address receiver, address cancellationReceiver, address callbackContract, address uiFeeReceiver, address market, address initialCollateralToken, address[] swapPath) addresses, tuple(uint256 sizeDeltaUsd, uint256 initialCollateralDeltaAmount, uint256 triggerPrice, uint256 acceptablePrice, uint256 executionFee, uint256 callbackGasLimit, uint256 minOutputAmount) numbers, uint256 orderType, uint256 decreasePositionSwapType, bool isLong, bool shouldUnwrapNativeToken, bool autoCancel, bytes32 referralCode) createOrderParams) external payable returns (bytes32 key)",
  "function sendWnt(address receiver, uint256 amount) external payable",
  "function sendTokens(address token, address receiver, uint256 amount) external",
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
];

const READER_ABI = [
  "function getMarketTokenPrice(address dataStore, tuple(address marketToken, address indexToken, address longToken, address shortToken) market, tuple(uint256 min, uint256 max) indexTokenPrice, tuple(uint256 min, uint256 max) longTokenPrice, tuple(uint256 min, uint256 max) shortTokenPrice, bytes32 pnlFactorType, bool maximize) external view returns (int256, tuple(int256 poolValue, int256 longPnl, int256 shortPnl, int256 netPnl, uint256 longTokenAmount, uint256 shortTokenAmount, uint256 longTokenUsd, uint256 shortTokenUsd, uint256 totalBorrowingFees, uint256 borrowingFeePoolFactor, uint256 impactPoolAmount))",
  "function getAccountPositions(address dataStore, address account, uint256 start, uint256 end) external view returns (tuple(tuple(address account, address market, address collateralToken) addresses, tuple(uint256 sizeInUsd, uint256 sizeInTokens, uint256 collateralAmount, uint256 borrowingFactor, uint256 fundingFeeAmountPerSize, uint256 longTokenClaimableFundingAmountPerSize, uint256 shortTokenClaimableFundingAmountPerSize, uint256 increasedAtTime, uint256 decreasedAtTime, bool isLong) numbers, tuple(bytes32 key) flags)[])",
];

const KAIROS_PERPS_ABI = [
  "function openPosition(address trader, string pair, uint8 side, uint256 leverage, uint256 collateralAmount, uint256 entryPrice, bytes32 gmxOrderKey) external returns (uint256)",
  "function closePosition(uint256 positionId, uint256 exitPrice, bytes32 gmxCloseOrderKey) external returns (int256)",
  "function liquidatePosition(uint256 positionId, uint256 currentPrice) external",
  "function getPosition(uint256 positionId) external view returns (tuple(uint256 id, address trader, string pair, uint8 side, uint256 leverage, uint256 collateralAmount, uint256 sizeUsd, uint256 entryPrice, uint256 exitPrice, int256 realizedPnl, uint256 openFee, uint256 closeFee, bytes32 gmxOrderKey, uint8 status, uint256 openedAt, uint256 closedAt, uint256 liquidationPrice))",
  "function getAccount(address trader) external view returns (uint256 totalCollateral, uint256 lockedCollateral, uint256 availableCollateral, uint256 openPositionCount)",
  "function getUserPositionIds(address trader) external view returns (uint256[])",
  "function isLiquidatable(uint256 positionId, uint256 currentPrice) external view returns (bool)",
  "function getUnrealizedPnl(uint256 positionId, uint256 currentPrice) external view returns (int256)",
  "function globalStats() external view returns (uint256 openInterestLong, uint256 openInterestShort, uint256 totalFees, uint256 volume, uint256 positionsOpened, uint256 liquidations, uint256 contractBalance)",
  "function collateral(address) external view returns (uint256)",
  "function lockedCollateral(address) external view returns (uint256)",
  "function availableCollateral(address) external view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// ═════════════════════════════════════════════════════════════════════════════
//  STATE
// ═════════════════════════════════════════════════════════════════════════════

let provider = null;
let relayerWallet = null;
let exchangeRouter = null;
let reader = null;
let kairosPerps = null;
let isInitialized = false;

// GMX order type constants
const OrderType = {
  MarketSwap: 0,
  LimitSwap: 1,
  MarketIncrease: 2,
  LimitIncrease: 3,
  MarketDecrease: 4,
  LimitDecrease: 5,
  StopLossDecrease: 6,
  Liquidation: 7,
};

// Position tracking (local cache for quick lookups)
const positionCache = new Map(); // positionId → { gmxKey, pair, side, ... }

// ═════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

function initialize() {
  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
    const relayerKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY;
    KAIROS_PERPS_ADDRESS = process.env.KAIROS_PERPS_ADDRESS || "";

    if (!relayerKey) {
      logger.warn("DEX Router: No relayer private key configured — running in read-only mode");
      provider = new ethers.JsonRpcProvider(rpcUrl);
      isInitialized = false;
      return;
    }

    provider = new ethers.JsonRpcProvider(rpcUrl);
    relayerWallet = new ethers.Wallet(relayerKey, provider);
    
    // Connect to GMX V2 contracts
    exchangeRouter = new ethers.Contract(GMX_CONTRACTS.exchangeRouter, EXCHANGE_ROUTER_ABI, relayerWallet);
    reader = new ethers.Contract(GMX_CONTRACTS.reader, READER_ABI, provider);
    
    // Connect to KairosPerps if deployed
    if (KAIROS_PERPS_ADDRESS) {
      kairosPerps = new ethers.Contract(KAIROS_PERPS_ADDRESS, KAIROS_PERPS_ABI, relayerWallet);
      logger.info(`DEX Router: Connected to KairosPerps at ${KAIROS_PERPS_ADDRESS}`);
    } else {
      logger.warn("DEX Router: KairosPerps address not set — contract functions unavailable");
    }

    isInitialized = true;
    logger.info(`DEX Router: Initialized — Relayer: ${relayerWallet.address}`);
    logger.info(`DEX Router: Connected to Arbitrum, GMX V2 Exchange Router: ${GMX_CONTRACTS.exchangeRouter}`);
    
    // Start liquidation monitor
    startLiquidationMonitor();
    
  } catch (err) {
    logger.error("DEX Router: Initialization failed:", err.message);
    isInitialized = false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PRICE FEEDS — Get real prices from GMX V2 / Chainlink via Arbitrum
// ═════════════════════════════════════════════════════════════════════════════

// Use the existing priceOracle for prices (already gets from Binance/CoinGecko)
const priceOracle = require("./priceOracle");

/// Get current price for a pair (from our existing oracle)
function getPrice(pair) {
  const prices = priceOracle.getAllPrices();
  const pairKey = pair.replace("/", "");
  return prices[pairKey]?.price || null;
}

/// Get all prices
function getAllPrices() {
  return priceOracle.getAllPrices();
}

// ═════════════════════════════════════════════════════════════════════════════
//  ORDER EXECUTION — Route to GMX V2
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Open a leveraged position on GMX V2
 * 
 * Flow:
 * 1. Validate order parameters
 * 2. Calculate execution fee + collateral needed on GMX
 * 3. Create order on GMX V2 via ExchangeRouter
 * 4. Record position on KairosPerps contract
 * 5. Return position details
 *
 * @param {string} trader - Trader's wallet address
 * @param {string} pair - Trading pair (e.g., "BTC/USD")
 * @param {string} side - "LONG" or "SHORT"
 * @param {number} leverage - 2-50x
 * @param {number} collateralKairos - Collateral in KAIROS tokens
 * @returns {Object} Position details
 */
async function openPosition(trader, pair, side, leverage, collateralKairos) {
  if (!isInitialized) throw new Error("DEX Router not initialized");
  
  logger.info(`DEX Router: Opening ${side} ${pair} ${leverage}x with ${collateralKairos} KAIROS for ${trader}`);
  
  // 1. Validate
  const marketAddress = GMX_MARKETS[pair];
  if (!marketAddress) throw new Error(`Unsupported pair: ${pair}. Available: ${Object.keys(GMX_MARKETS).join(", ")}`);
  if (leverage < 2 || leverage > 50) throw new Error("Leverage must be 2-50x");
  if (collateralKairos < 10) throw new Error("Minimum collateral: 10 KAIROS");
  
  // 2. Get current price
  const currentPrice = getPrice(pair);
  if (!currentPrice) throw new Error(`Price unavailable for ${pair}`);
  
  const isLong = side === "LONG";
  const sizeUsd = collateralKairos * leverage;
  const entryPrice18 = ethers.parseUnits(currentPrice.toString(), 18);
  
  // 3. Prepare GMX V2 order
  // The relayer uses USDC as collateral on GMX (since KAIROS isn't listed on GMX)
  // KAIROS collateral is locked in KairosPerps contract, relayer mirrors with USDC on GMX
  const collateralToken = TOKENS.USDC;
  const collateralDecimals = 6; // USDC has 6 decimals
  const collateralAmountGMX = ethers.parseUnits(collateralKairos.toFixed(6), collateralDecimals);
  
  // Size in USD with 30 decimals (GMX V2 format)
  const sizeDeltaUsd = ethers.parseUnits(sizeUsd.toString(), 30);
  
  // Execution fee (ETH for keepers) — typically ~0.001 ETH
  const executionFee = ethers.parseEther("0.0012");
  
  // Acceptable price: for longs allow 0.5% slippage up, for shorts 0.5% down
  const slippageBps = 50; // 0.5%
  const priceWith30Dec = ethers.parseUnits(currentPrice.toString(), 30); 
  const acceptablePrice = isLong
    ? priceWith30Dec + (priceWith30Dec * BigInt(slippageBps) / 10000n)
    : priceWith30Dec - (priceWith30Dec * BigInt(slippageBps) / 10000n);

  let gmxOrderKey = ethers.ZeroHash; // Will be filled if GMX execution succeeds

  try {
    // 4. Check relayer has enough USDC + ETH
    const relayerUsdcBalance = await getRelayerBalance(TOKENS.USDC, collateralDecimals);
    const relayerEthBalance = await provider.getBalance(relayerWallet.address);
    
    if (relayerUsdcBalance < parseFloat(collateralKairos)) {
      logger.warn(`DEX Router: Relayer USDC insufficient (${relayerUsdcBalance} < ${collateralKairos}). Recording position without GMX execution.`);
      // Still record on KairosPerps — GMX execution can happen later
    } else if (relayerEthBalance < executionFee) {
      logger.warn(`DEX Router: Relayer ETH insufficient for execution fee`);
    } else {
      // 5. Execute on GMX V2 via multicall
      gmxOrderKey = await executeGMXOrder(
        marketAddress,
        collateralToken,
        collateralAmountGMX,
        sizeDeltaUsd,
        isLong,
        acceptablePrice,
        executionFee
      );
      logger.info(`DEX Router: GMX order submitted — key: ${gmxOrderKey}`);
    }
    
    // 6. Record on KairosPerps contract
    let positionId = 0;
    if (kairosPerps) {
      const tx = await kairosPerps.openPosition(
        trader,
        pair,
        isLong ? 0 : 1, // Side enum: 0=LONG, 1=SHORT
        leverage,
        ethers.parseUnits(collateralKairos.toString(), 18),
        entryPrice18,
        gmxOrderKey
      );
      const receipt = await tx.wait();
      
      // Extract positionId from event
      const event = receipt.logs.find(l => {
        try {
          const parsed = kairosPerps.interface.parseLog(l);
          return parsed?.name === "PositionOpened";
        } catch { return false; }
      });
      
      if (event) {
        const parsed = kairosPerps.interface.parseLog(event);
        positionId = Number(parsed.args.positionId);
      }
      
      logger.info(`DEX Router: Position #${positionId} recorded on KairosPerps`);
    }
    
    // 7. Cache position locally
    const position = {
      id: positionId,
      trader,
      pair,
      side,
      leverage,
      collateral: collateralKairos,
      sizeUsd,
      entryPrice: currentPrice,
      gmxOrderKey,
      status: "OPEN",
      openedAt: new Date().toISOString(),
      liquidationPrice: calculateLiquidationPrice(isLong, currentPrice, leverage),
    };
    
    positionCache.set(positionId, position);
    
    return position;
    
  } catch (err) {
    logger.error(`DEX Router: Failed to open position — ${err.message}`);
    throw err;
  }
}

/**
 * Close an existing position
 */
async function closePosition(positionId) {
  if (!isInitialized) throw new Error("DEX Router not initialized");
  
  logger.info(`DEX Router: Closing position #${positionId}`);
  
  // Get position from contract
  let position;
  if (kairosPerps) {
    const pos = await kairosPerps.getPosition(positionId);
    position = {
      id: Number(pos.id),
      trader: pos.trader,
      pair: pos.pair,
      side: pos.side === 0n ? "LONG" : "SHORT",
      leverage: Number(pos.leverage),
      collateral: parseFloat(ethers.formatUnits(pos.collateralAmount, 18)),
      sizeUsd: parseFloat(ethers.formatUnits(pos.sizeUsd, 18)),
      entryPrice: parseFloat(ethers.formatUnits(pos.entryPrice, 18)),
      gmxOrderKey: pos.gmxOrderKey,
      status: ["OPEN", "CLOSED", "LIQUIDATED"][pos.status],
    };
  } else {
    position = positionCache.get(positionId);
  }
  
  if (!position || position.status !== "OPEN") {
    throw new Error(`Position #${positionId} not found or not open`);
  }
  
  // Get current exit price
  const exitPrice = getPrice(position.pair);
  if (!exitPrice) throw new Error(`Price unavailable for ${position.pair}`);
  
  const exitPrice18 = ethers.parseUnits(exitPrice.toString(), 18);
  let gmxCloseKey = ethers.ZeroHash;
  
  try {
    // Close on GMX V2 if original order was placed
    if (position.gmxOrderKey !== ethers.ZeroHash) {
      const marketAddress = GMX_MARKETS[position.pair];
      if (marketAddress) {
        const sizeDeltaUsd = ethers.parseUnits(position.sizeUsd.toString(), 30);
        const executionFee = ethers.parseEther("0.0012");
        const isLong = position.side === "LONG";
        
        // Acceptable price for closing
        const priceWith30Dec = ethers.parseUnits(exitPrice.toString(), 30);
        const slippageBps = 50;
        const acceptablePrice = isLong
          ? priceWith30Dec - (priceWith30Dec * BigInt(slippageBps) / 10000n)
          : priceWith30Dec + (priceWith30Dec * BigInt(slippageBps) / 10000n);
        
        gmxCloseKey = await executeGMXCloseOrder(
          marketAddress,
          TOKENS.USDC,
          sizeDeltaUsd,
          isLong,
          acceptablePrice,
          executionFee
        );
        logger.info(`DEX Router: GMX close order — key: ${gmxCloseKey}`);
      }
    }
    
    // Record close on KairosPerps
    let pnl = 0;
    if (kairosPerps) {
      const tx = await kairosPerps.closePosition(positionId, exitPrice18, gmxCloseKey);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(l => {
        try {
          const parsed = kairosPerps.interface.parseLog(l);
          return parsed?.name === "PositionClosed";
        } catch { return false; }
      });
      
      if (event) {
        const parsed = kairosPerps.interface.parseLog(event);
        pnl = parseFloat(ethers.formatUnits(parsed.args.pnl, 18));
      }
      
      logger.info(`DEX Router: Position #${positionId} closed — P&L: ${pnl} KAIROS`);
    } else {
      // Calculate P&L locally
      pnl = calculatePnl(position.side, position.entryPrice, exitPrice, position.sizeUsd);
    }
    
    // Update cache
    const closedPosition = {
      ...position,
      exitPrice,
      pnl,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      gmxCloseOrderKey: gmxCloseKey,
    };
    
    positionCache.set(positionId, closedPosition);
    
    return closedPosition;
    
  } catch (err) {
    logger.error(`DEX Router: Failed to close position #${positionId} — ${err.message}`);
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  GMX V2 ORDER EXECUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Execute a market increase order on GMX V2
 * Uses multicall: sendWnt (execution fee) + sendTokens (collateral) + createOrder
 */
async function executeGMXOrder(market, collateralToken, collateralAmount, sizeDeltaUsd, isLong, acceptablePrice, executionFee) {
  // Approve USDC spending by GMX Router if needed
  const usdcContract = new ethers.Contract(collateralToken, ERC20_ABI, relayerWallet);
  const allowance = await usdcContract.allowance(relayerWallet.address, GMX_CONTRACTS.router);
  if (allowance < collateralAmount) {
    const approveTx = await usdcContract.approve(GMX_CONTRACTS.router, ethers.MaxUint256);
    await approveTx.wait();
    logger.info("DEX Router: USDC approved for GMX Router");
  }

  // Build multicall data
  const sendWntData = exchangeRouter.interface.encodeFunctionData("sendWnt", [
    GMX_CONTRACTS.orderVault,
    executionFee,
  ]);

  const sendTokensData = exchangeRouter.interface.encodeFunctionData("sendTokens", [
    collateralToken,
    GMX_CONTRACTS.orderVault,
    collateralAmount,
  ]);

  const createOrderParams = {
    addresses: {
      receiver: relayerWallet.address,
      cancellationReceiver: relayerWallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: market,
      initialCollateralToken: collateralToken,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralAmount,
      triggerPrice: 0,
      acceptablePrice: acceptablePrice,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0,
    },
    orderType: OrderType.MarketIncrease,
    decreasePositionSwapType: 0,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
  };

  const createOrderData = exchangeRouter.interface.encodeFunctionData("createOrder", [createOrderParams]);

  // Execute multicall
  const tx = await exchangeRouter.multicall(
    [sendWntData, sendTokensData, createOrderData],
    { value: executionFee, gasLimit: 3000000 }
  );

  const receipt = await tx.wait();
  
  // Extract order key from events
  const orderKey = extractOrderKey(receipt);
  return orderKey;
}

/**
 * Execute a market decrease order on GMX V2 (close position)
 */
async function executeGMXCloseOrder(market, collateralToken, sizeDeltaUsd, isLong, acceptablePrice, executionFee) {
  const sendWntData = exchangeRouter.interface.encodeFunctionData("sendWnt", [
    GMX_CONTRACTS.orderVault,
    executionFee,
  ]);

  const createOrderParams = {
    addresses: {
      receiver: relayerWallet.address,
      cancellationReceiver: relayerWallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: market,
      initialCollateralToken: collateralToken,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd,
      initialCollateralDeltaAmount: 0, // Not adding/removing collateral
      triggerPrice: 0,
      acceptablePrice: acceptablePrice,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0,
    },
    orderType: OrderType.MarketDecrease,
    decreasePositionSwapType: 0,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
  };

  const createOrderData = exchangeRouter.interface.encodeFunctionData("createOrder", [createOrderParams]);

  const tx = await exchangeRouter.multicall(
    [sendWntData, createOrderData],
    { value: executionFee, gasLimit: 3000000 }
  );

  const receipt = await tx.wait();
  return extractOrderKey(receipt);
}

/**
 * Extract order key from GMX V2 transaction receipt
 */
function extractOrderKey(receipt) {
  // GMX V2 emits OrderCreated event with the order key
  // The key is typically the first topic of the event
  for (const log of receipt.logs) {
    try {
      // OrderCreated event topic
      if (log.topics && log.topics.length > 1) {
        // Try to extract order key — it's usually in the event data
        return log.topics[1] || ethers.ZeroHash;
      }
    } catch { /* skip */ }
  }
  return ethers.id(receipt.hash); // Fallback: use tx hash as reference
}

// ═════════════════════════════════════════════════════════════════════════════
//  LIQUIDATION MONITOR
// ═════════════════════════════════════════════════════════════════════════════

let liquidationInterval = null;

function startLiquidationMonitor() {
  if (liquidationInterval) clearInterval(liquidationInterval);
  
  liquidationInterval = setInterval(async () => {
    try {
      await checkLiquidations();
    } catch (err) {
      logger.error("DEX Router: Liquidation check error:", err.message);
    }
  }, 10000); // Check every 10 seconds
  
  logger.info("DEX Router: Liquidation monitor started (10s interval)");
}

async function checkLiquidations() {
  if (!kairosPerps) return;
  
  // Check cached open positions
  for (const [posId, pos] of positionCache) {
    if (pos.status !== "OPEN") continue;
    
    const currentPrice = getPrice(pos.pair);
    if (!currentPrice) continue;
    
    try {
      const currentPrice18 = ethers.parseUnits(currentPrice.toString(), 18);
      const isLiquidatable = await kairosPerps.isLiquidatable(posId, currentPrice18);
      
      if (isLiquidatable) {
        logger.warn(`DEX Router: LIQUIDATING position #${posId} (${pos.pair} ${pos.side}) at $${currentPrice}`);
        
        const tx = await kairosPerps.liquidatePosition(posId, currentPrice18);
        await tx.wait();
        
        pos.status = "LIQUIDATED";
        pos.exitPrice = currentPrice;
        pos.closedAt = new Date().toISOString();
        
        logger.info(`DEX Router: Position #${posId} liquidated successfully`);
      }
    } catch (err) {
      // Don't log for "not liquidatable" — just for real errors
      if (!err.message.includes("not liquidatable")) {
        logger.error(`DEX Router: Liquidation check error for #${posId}: ${err.message}`);
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  ACCOUNT FUNCTIONS — Read from KairosPerps contract
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get trader's account from KairosPerps contract
 */
async function getAccount(traderAddress) {
  if (!kairosPerps) {
    return {
      totalCollateral: 0,
      lockedCollateral: 0,
      availableCollateral: 0,
      openPositionCount: 0,
      source: "offline",
    };
  }
  
  try {
    const [total, locked, available, openCount] = await kairosPerps.getAccount(traderAddress);
    return {
      totalCollateral: parseFloat(ethers.formatUnits(total, 18)),
      lockedCollateral: parseFloat(ethers.formatUnits(locked, 18)),
      availableCollateral: parseFloat(ethers.formatUnits(available, 18)),
      openPositionCount: Number(openCount),
      source: "on-chain",
    };
  } catch (err) {
    logger.error(`DEX Router: getAccount error: ${err.message}`);
    return { totalCollateral: 0, lockedCollateral: 0, availableCollateral: 0, openPositionCount: 0, source: "error" };
  }
}

/**
 * Get all positions for a trader
 */
async function getPositions(traderAddress) {
  if (!kairosPerps) return [];
  
  try {
    const ids = await kairosPerps.getUserPositionIds(traderAddress);
    const positions = [];
    
    for (const id of ids) {
      const pos = await kairosPerps.getPosition(id);
      if (pos.status === 0n) { // OPEN
        const currentPrice = getPrice(pos.pair);
        const unrealizedPnl = currentPrice 
          ? calculatePnl(
              pos.side === 0n ? "LONG" : "SHORT",
              parseFloat(ethers.formatUnits(pos.entryPrice, 18)),
              currentPrice,
              parseFloat(ethers.formatUnits(pos.sizeUsd, 18))
            )
          : 0;
        
        positions.push({
          id: Number(pos.id),
          pair: pos.pair,
          side: pos.side === 0n ? "LONG" : "SHORT",
          leverage: Number(pos.leverage),
          collateral: parseFloat(ethers.formatUnits(pos.collateralAmount, 18)),
          sizeUsd: parseFloat(ethers.formatUnits(pos.sizeUsd, 18)),
          entryPrice: parseFloat(ethers.formatUnits(pos.entryPrice, 18)),
          currentPrice: currentPrice || 0,
          unrealizedPnl,
          unrealizedPnlPct: unrealizedPnl / parseFloat(ethers.formatUnits(pos.collateralAmount, 18)) * 100,
          liquidationPrice: parseFloat(ethers.formatUnits(pos.liquidationPrice, 18)),
          gmxOrderKey: pos.gmxOrderKey,
          openedAt: new Date(Number(pos.openedAt) * 1000).toISOString(),
          status: "OPEN",
          source: "on-chain",
        });
      }
    }
    
    return positions;
  } catch (err) {
    logger.error(`DEX Router: getPositions error: ${err.message}`);
    return [];
  }
}

/**
 * Get position history (closed + liquidated)
 */
async function getHistory(traderAddress) {
  if (!kairosPerps) return [];
  
  try {
    const ids = await kairosPerps.getUserPositionIds(traderAddress);
    const history = [];
    
    for (const id of ids) {
      const pos = await kairosPerps.getPosition(id);
      if (pos.status !== 0n) { // CLOSED or LIQUIDATED
        history.push({
          id: Number(pos.id),
          pair: pos.pair,
          side: pos.side === 0n ? "LONG" : "SHORT",
          leverage: Number(pos.leverage),
          collateral: parseFloat(ethers.formatUnits(pos.collateralAmount, 18)),
          sizeUsd: parseFloat(ethers.formatUnits(pos.sizeUsd, 18)),
          entryPrice: parseFloat(ethers.formatUnits(pos.entryPrice, 18)),
          exitPrice: parseFloat(ethers.formatUnits(pos.exitPrice, 18)),
          pnl: parseFloat(ethers.formatUnits(pos.realizedPnl, 18)),
          openFee: parseFloat(ethers.formatUnits(pos.openFee, 18)),
          closeFee: parseFloat(ethers.formatUnits(pos.closeFee, 18)),
          status: pos.status === 1n ? "CLOSED" : "LIQUIDATED",
          openedAt: new Date(Number(pos.openedAt) * 1000).toISOString(),
          closedAt: new Date(Number(pos.closedAt) * 1000).toISOString(),
          source: "on-chain",
        });
      }
    }
    
    return history.reverse(); // Most recent first
  } catch (err) {
    logger.error(`DEX Router: getHistory error: ${err.message}`);
    return [];
  }
}

/**
 * Get global protocol stats
 */
async function getGlobalStats() {
  if (!kairosPerps) {
    return {
      openInterestLong: 0,
      openInterestShort: 0,
      totalFees: 0,
      volume: 0,
      positionsOpened: 0,
      liquidations: 0,
      contractBalance: 0,
      source: "offline",
    };
  }
  
  try {
    const stats = await kairosPerps.globalStats();
    return {
      openInterestLong: parseFloat(ethers.formatUnits(stats.openInterestLong, 18)),
      openInterestShort: parseFloat(ethers.formatUnits(stats.openInterestShort, 18)),
      totalFees: parseFloat(ethers.formatUnits(stats.totalFees, 18)),
      volume: parseFloat(ethers.formatUnits(stats.volume, 18)),
      positionsOpened: Number(stats.positionsOpened),
      liquidations: Number(stats.liquidations),
      contractBalance: parseFloat(ethers.formatUnits(stats.contractBalance, 18)),
      source: "on-chain",
    };
  } catch (err) {
    logger.error(`DEX Router: getGlobalStats error: ${err.message}`);
    return { openInterestLong: 0, openInterestShort: 0, totalFees: 0, volume: 0, positionsOpened: 0, liquidations: 0, contractBalance: 0, source: "error" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function calculatePnl(side, entryPrice, exitPrice, sizeUsd) {
  if (side === "LONG") {
    return ((exitPrice - entryPrice) / entryPrice) * sizeUsd;
  } else {
    return ((entryPrice - exitPrice) / entryPrice) * sizeUsd;
  }
}

function calculateLiquidationPrice(isLong, entryPrice, leverage) {
  const marginFraction = 1 / leverage;
  const maintenanceMargin = 0.01; // 1%
  
  if (isLong) {
    return entryPrice * (1 - marginFraction + maintenanceMargin);
  } else {
    return entryPrice * (1 + marginFraction - maintenanceMargin);
  }
}

async function getRelayerBalance(tokenAddress, decimals) {
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(relayerWallet.address);
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch {
    return 0;
  }
}

function getRelayerAddress() {
  return relayerWallet?.address || null;
}

function getSupportedPairs() {
  return Object.keys(GMX_MARKETS);
}

function getStatus() {
  return {
    initialized: isInitialized,
    relayer: relayerWallet?.address || null,
    kairosPerps: KAIROS_PERPS_ADDRESS || null,
    gmxExchangeRouter: GMX_CONTRACTS.exchangeRouter,
    supportedPairs: Object.keys(GMX_MARKETS),
    network: "Arbitrum One (42161)",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  openPosition,
  closePosition,
  getAccount,
  getPositions,
  getHistory,
  getGlobalStats,
  getPrice,
  getAllPrices,
  getSupportedPairs,
  getRelayerAddress,
  getStatus,
};
