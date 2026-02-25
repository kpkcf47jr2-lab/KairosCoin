// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ═══════════════════════════════════════════════════════════════════════════════
//
//   KAIROS PERPS — Decentralized Perpetual Trading via GMX V2
//
//   ┌─────────────────────────────────────────────────────────┐
//   │  Purpose  : Lock KAIROS collateral, route to DEX perps   │
//   │  DEX      : GMX V2 (Arbitrum)                            │
//   │  Collateral: KAIROS (1 KAIROS = 1 USD)                   │
//   │  Owner    : Kairos 777 Inc. (Mario Isaac)                │
//   │  Network  : Arbitrum One                                  │
//   └─────────────────────────────────────────────────────────┘
//
//   HOW IT WORKS:
//   1. Trader deposits KAIROS tokens as collateral
//   2. Trader submits order (pair, side, leverage, size)
//   3. Authorized relayer routes the order to GMX V2
//   4. Position is tracked on-chain with entry price + GMX ref
//   5. On close, P&L is calculated from real DEX execution
//   6. Profit paid from vault reserves; losses deducted from collateral
//   7. Liquidation if margin ratio falls below maintenance level
//
//   Fee Distribution (same as KairosVault):
//   - 70% → KairosVault (LP rewards)
//   - 20% → Treasury
//   - 10% → Insurance Fund
//
//   "In God We Trust"
//
// ═══════════════════════════════════════════════════════════════════════════════

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract KairosPerps is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═════════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ═════════════════════════════════════════════════════════════════════════

    uint256 public constant PRECISION = 1e18;
    uint256 public constant USD_PRECISION = 1e30; // GMX V2 uses 30 decimals for USD
    uint256 public constant FEE_PRECISION = 10000; // basis points
    uint256 public constant MAX_LEVERAGE = 50; // 50x max (GMX allows up to 100x)
    uint256 public constant MIN_COLLATERAL = 10 * 1e18; // 10 KAIROS minimum
    
    // Fee distribution (basis points of trading fee)
    uint256 public vaultFeeBps = 7000;      // 70% to vault LPs
    uint256 public treasuryFeeBps = 2000;   // 20% to treasury  
    uint256 public insuranceFeeBps = 1000;  // 10% to insurance fund

    // Trading fees (basis points of position size)
    uint256 public openFeeBps = 10;  // 0.10% to open
    uint256 public closeFeeBps = 10; // 0.10% to close

    // Maintenance margin (basis points) - below this → liquidation
    uint256 public maintenanceMarginBps = 100; // 1%

    // ═════════════════════════════════════════════════════════════════════════
    //  STATE
    // ═════════════════════════════════════════════════════════════════════════

    IERC20 public immutable kairos;
    
    address public relayer;          // Backend relayer authorized to execute orders
    address public vault;            // KairosVault for LP fees
    address public treasury;         // Kairos 777 treasury  
    address public insuranceFund;    // Insurance fund for bad debt

    // Per-user collateral tracking
    mapping(address => uint256) public collateral;        // Total deposited
    mapping(address => uint256) public lockedCollateral;  // Locked in open positions
    
    // Position tracking
    uint256 public nextPositionId = 1;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositionIds;
    
    // Global stats
    uint256 public totalOpenInterestLong;
    uint256 public totalOpenInterestShort;
    uint256 public totalFeesCollected;
    uint256 public totalVolume;
    uint256 public totalPositionsOpened;
    uint256 public totalLiquidations;

    // ═════════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ═════════════════════════════════════════════════════════════════════════

    enum Side { LONG, SHORT }
    enum PositionStatus { OPEN, CLOSED, LIQUIDATED }

    struct Position {
        uint256 id;
        address trader;
        string pair;                  // e.g. "BTC/USD", "ETH/USD"
        Side side;
        uint256 leverage;             // 2-50x
        uint256 collateralAmount;     // KAIROS locked for this position
        uint256 sizeUsd;              // Position size in USD (collateral * leverage)
        uint256 entryPrice;           // Price at open (18 decimals)
        uint256 exitPrice;            // Price at close (18 decimals, 0 if open)
        int256 realizedPnl;           // P&L in KAIROS (18 decimals, signed)
        uint256 openFee;              // Fee paid to open
        uint256 closeFee;             // Fee paid to close
        bytes32 gmxOrderKey;          // Reference to GMX V2 order
        PositionStatus status;
        uint256 openedAt;
        uint256 closedAt;
        uint256 liquidationPrice;     // Pre-calculated liquidation price
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ═════════════════════════════════════════════════════════════════════════

    event CollateralDeposited(address indexed trader, uint256 amount, uint256 newBalance);
    event CollateralWithdrawn(address indexed trader, uint256 amount, uint256 newBalance);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        string pair,
        Side side,
        uint256 leverage,
        uint256 collateral,
        uint256 sizeUsd,
        uint256 entryPrice,
        bytes32 gmxOrderKey
    );
    event PositionClosed(
        uint256 indexed positionId,
        address indexed trader,
        uint256 exitPrice,
        int256 pnl,
        bytes32 gmxOrderKey
    );
    event PositionLiquidated(
        uint256 indexed positionId,
        address indexed trader,
        uint256 liquidationPrice,
        int256 loss
    );
    event FeesDistributed(uint256 vaultAmount, uint256 treasuryAmount, uint256 insuranceAmount);
    event RelayerUpdated(address oldRelayer, address newRelayer);

    // ═════════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ═════════════════════════════════════════════════════════════════════════

    modifier onlyRelayer() {
        require(msg.sender == relayer, "KairosPerps: not relayer");
        _;
    }

    modifier onlyRelayerOrOwner() {
        require(msg.sender == relayer || msg.sender == owner(), "KairosPerps: not authorized");
        _;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════════════

    constructor(
        address _kairos,
        address _relayer,
        address _vault,
        address _treasury,
        address _insuranceFund
    ) Ownable(msg.sender) {
        require(_kairos != address(0), "KairosPerps: invalid token");
        require(_relayer != address(0), "KairosPerps: invalid relayer");
        
        kairos = IERC20(_kairos);
        relayer = _relayer;
        vault = _vault;
        treasury = _treasury;
        insuranceFund = _insuranceFund;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  TRADER FUNCTIONS — Deposit / Withdraw Collateral
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Deposit KAIROS as trading collateral
    /// @param amount Amount of KAIROS to deposit (18 decimals)
    function depositCollateral(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_COLLATERAL, "KairosPerps: below minimum");
        
        kairos.safeTransferFrom(msg.sender, address(this), amount);
        collateral[msg.sender] += amount;
        
        emit CollateralDeposited(msg.sender, amount, collateral[msg.sender]);
    }

    /// @notice Withdraw available (unlocked) collateral
    /// @param amount Amount to withdraw
    function withdrawCollateral(uint256 amount) external nonReentrant {
        uint256 available = collateral[msg.sender] - lockedCollateral[msg.sender];
        require(amount <= available, "KairosPerps: insufficient available collateral");
        
        collateral[msg.sender] -= amount;
        kairos.safeTransfer(msg.sender, amount);
        
        emit CollateralWithdrawn(msg.sender, amount, collateral[msg.sender]);
    }

    /// @notice Get available (free) collateral for a trader
    function availableCollateral(address trader) external view returns (uint256) {
        return collateral[trader] - lockedCollateral[trader];
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  RELAYER FUNCTIONS — Open / Close / Liquidate Positions
    //  Called by authorized backend relayer after executing on GMX V2
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Record a position opened on GMX V2
    /// @dev Called by relayer after successful GMX order execution
    function openPosition(
        address trader,
        string calldata pair,
        Side side,
        uint256 leverage,
        uint256 collateralAmount,
        uint256 entryPrice,
        bytes32 gmxOrderKey
    ) external onlyRelayer nonReentrant whenNotPaused returns (uint256 positionId) {
        require(leverage >= 2 && leverage <= MAX_LEVERAGE, "KairosPerps: invalid leverage");
        require(collateralAmount >= MIN_COLLATERAL, "KairosPerps: below minimum collateral");
        
        uint256 available = collateral[trader] - lockedCollateral[trader];
        require(collateralAmount <= available, "KairosPerps: insufficient collateral");
        
        // Calculate position size and fees
        uint256 sizeUsd = collateralAmount * leverage; // KAIROS=1USD, so collateral*leverage = sizeUsd
        uint256 openFee = (sizeUsd * openFeeBps) / FEE_PRECISION;
        
        // Ensure enough collateral for position + fee
        require(collateralAmount + openFee <= available, "KairosPerps: insufficient for fee");
        
        // Lock collateral
        lockedCollateral[trader] += collateralAmount;
        // Deduct fee from available collateral
        collateral[trader] -= openFee;
        
        // Calculate liquidation price
        uint256 liquidationPrice = _calcLiquidationPrice(
            side, entryPrice, leverage, maintenanceMarginBps
        );
        
        // Create position
        positionId = nextPositionId++;
        positions[positionId] = Position({
            id: positionId,
            trader: trader,
            pair: pair,
            side: side,
            leverage: leverage,
            collateralAmount: collateralAmount,
            sizeUsd: sizeUsd,
            entryPrice: entryPrice,
            exitPrice: 0,
            realizedPnl: 0,
            openFee: openFee,
            closeFee: 0,
            gmxOrderKey: gmxOrderKey,
            status: PositionStatus.OPEN,
            openedAt: block.timestamp,
            closedAt: 0,
            liquidationPrice: liquidationPrice
        });
        
        userPositionIds[trader].push(positionId);
        
        // Update open interest
        if (side == Side.LONG) {
            totalOpenInterestLong += sizeUsd;
        } else {
            totalOpenInterestShort += sizeUsd;
        }
        
        totalVolume += sizeUsd;
        totalPositionsOpened++;
        
        // Distribute opening fee
        _distributeFees(openFee);
        
        emit PositionOpened(
            positionId, trader, pair, side, leverage,
            collateralAmount, sizeUsd, entryPrice, gmxOrderKey
        );
    }

    /// @notice Close a position and settle P&L
    /// @dev Called by relayer after closing the GMX position
    function closePosition(
        uint256 positionId,
        uint256 exitPrice,
        bytes32 gmxCloseOrderKey
    ) external onlyRelayer nonReentrant returns (int256 pnl) {
        Position storage pos = positions[positionId];
        require(pos.status == PositionStatus.OPEN, "KairosPerps: not open");
        
        // Calculate P&L
        pnl = _calculatePnl(pos, exitPrice);
        
        // Calculate close fee
        uint256 closeFee = (pos.sizeUsd * closeFeeBps) / FEE_PRECISION;
        
        // Update position
        pos.exitPrice = exitPrice;
        pos.realizedPnl = pnl;
        pos.closeFee = closeFee;
        pos.status = PositionStatus.CLOSED;
        pos.closedAt = block.timestamp;
        pos.gmxOrderKey = gmxCloseOrderKey;
        
        // Settle P&L
        _settlePnl(pos.trader, pos.collateralAmount, pnl, closeFee);
        
        // Update open interest
        if (pos.side == Side.LONG) {
            totalOpenInterestLong -= pos.sizeUsd;
        } else {
            totalOpenInterestShort -= pos.sizeUsd;
        }
        
        totalVolume += pos.sizeUsd;
        
        // Distribute closing fee
        _distributeFees(closeFee);
        
        emit PositionClosed(positionId, pos.trader, exitPrice, pnl, gmxCloseOrderKey);
    }

    /// @notice Liquidate a position whose margin fell below maintenance
    /// @dev Called by relayer when liquidation condition detected
    function liquidatePosition(
        uint256 positionId,
        uint256 currentPrice
    ) external onlyRelayerOrOwner nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.status == PositionStatus.OPEN, "KairosPerps: not open");
        
        // Verify liquidation condition
        bool shouldLiquidate = _checkLiquidation(pos, currentPrice);
        require(shouldLiquidate, "KairosPerps: not liquidatable");
        
        // Calculate loss (entire collateral is lost on liquidation)
        int256 loss = -int256(pos.collateralAmount);
        
        // Update position
        pos.exitPrice = currentPrice;
        pos.realizedPnl = loss;
        pos.status = PositionStatus.LIQUIDATED;
        pos.closedAt = block.timestamp;
        
        // Liquidation: entire collateral goes to insurance fund
        lockedCollateral[pos.trader] -= pos.collateralAmount;
        collateral[pos.trader] -= pos.collateralAmount;
        
        // Send liquidated collateral to insurance fund
        if (insuranceFund != address(0)) {
            kairos.safeTransfer(insuranceFund, pos.collateralAmount);
        }
        
        // Update open interest
        if (pos.side == Side.LONG) {
            totalOpenInterestLong -= pos.sizeUsd;
        } else {
            totalOpenInterestShort -= pos.sizeUsd;
        }
        
        totalLiquidations++;
        
        emit PositionLiquidated(positionId, pos.trader, currentPrice, loss);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Get all position IDs for a trader
    function getUserPositionIds(address trader) external view returns (uint256[] memory) {
        return userPositionIds[trader];
    }

    /// @notice Get a position by ID
    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    /// @notice Get trader's account summary
    function getAccount(address trader) external view returns (
        uint256 totalCollateral_,
        uint256 lockedCollateral_,
        uint256 availableCollateral_,
        uint256 openPositionCount
    ) {
        totalCollateral_ = collateral[trader];
        lockedCollateral_ = lockedCollateral[trader];
        availableCollateral_ = totalCollateral_ - lockedCollateral_;
        
        // Count open positions
        uint256[] memory ids = userPositionIds[trader];
        for (uint256 i = 0; i < ids.length; i++) {
            if (positions[ids[i]].status == PositionStatus.OPEN) {
                openPositionCount++;
            }
        }
    }

    /// @notice Calculate unrealized P&L for a position at a given price
    function getUnrealizedPnl(uint256 positionId, uint256 currentPrice) external view returns (int256) {
        Position memory pos = positions[positionId];
        if (pos.status != PositionStatus.OPEN) return int256(0);
        return _calculatePnl(pos, currentPrice);
    }

    /// @notice Check if a position should be liquidated
    function isLiquidatable(uint256 positionId, uint256 currentPrice) external view returns (bool) {
        Position memory pos = positions[positionId];
        if (pos.status != PositionStatus.OPEN) return false;
        return _checkLiquidation(pos, currentPrice);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  INTERNAL FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    /// @dev Calculate P&L for a position at a given exit price
    /// @return pnl Signed P&L in KAIROS tokens (18 decimals)
    function _calculatePnl(Position memory pos, uint256 exitPrice) internal pure returns (int256 pnl) {
        // pnl = (exitPrice - entryPrice) / entryPrice * sizeUsd * direction
        // Since KAIROS = 1 USD, pnl in KAIROS = pnl in USD
        
        if (pos.side == Side.LONG) {
            // Long: profit when price goes up
            if (exitPrice >= pos.entryPrice) {
                uint256 gain = ((exitPrice - pos.entryPrice) * pos.sizeUsd) / pos.entryPrice;
                pnl = int256(gain);
            } else {
                uint256 loss = ((pos.entryPrice - exitPrice) * pos.sizeUsd) / pos.entryPrice;
                pnl = -int256(loss);
            }
        } else {
            // Short: profit when price goes down
            if (exitPrice <= pos.entryPrice) {
                uint256 gain = ((pos.entryPrice - exitPrice) * pos.sizeUsd) / pos.entryPrice;
                pnl = int256(gain);
            } else {
                uint256 loss = ((exitPrice - pos.entryPrice) * pos.sizeUsd) / pos.entryPrice;
                pnl = -int256(loss);
            }
        }
    }

    /// @dev Check if liquidation conditions are met
    function _checkLiquidation(Position memory pos, uint256 currentPrice) internal view returns (bool) {
        int256 pnl = _calculatePnl(pos, currentPrice);
        
        // If loss exceeds (100% - maintenanceMarginBps%) of collateral → liquidate
        // Maintenance margin = 1% by default → liquidate when loss > 99% of collateral
        // But practically, liquidate when remaining margin < maintenance level
        int256 remainingMargin = int256(pos.collateralAmount) + pnl;
        uint256 maintenanceRequired = (pos.sizeUsd * maintenanceMarginBps) / FEE_PRECISION;
        
        return remainingMargin <= int256(maintenanceRequired);
    }

    /// @dev Calculate liquidation price for a position
    function _calcLiquidationPrice(
        Side side,
        uint256 entryPrice,
        uint256 leverage,
        uint256 _maintenanceMarginBps
    ) internal pure returns (uint256) {
        // For LONG: liqPrice = entryPrice * (1 - (1/leverage) + maintenanceMargin%)
        // For SHORT: liqPrice = entryPrice * (1 + (1/leverage) - maintenanceMargin%)
        
        uint256 marginFraction = PRECISION / leverage; // e.g., 5x → 0.2
        uint256 maintenanceFraction = (PRECISION * _maintenanceMarginBps) / FEE_PRECISION;
        
        if (side == Side.LONG) {
            uint256 dropFraction = marginFraction - maintenanceFraction;
            return entryPrice - (entryPrice * dropFraction / PRECISION);
        } else {
            uint256 riseFraction = marginFraction - maintenanceFraction;
            return entryPrice + (entryPrice * riseFraction / PRECISION);
        }
    }

    /// @dev Settle P&L: unlock collateral, pay profit or deduct loss
    function _settlePnl(address trader, uint256 posCollateral, int256 pnl, uint256 fee) internal {
        // Unlock the position's collateral
        lockedCollateral[trader] -= posCollateral;
        
        if (pnl >= 0) {
            // Profit: trader gets collateral back + profit - fee
            uint256 profit = uint256(pnl);
            uint256 payout = posCollateral + profit - fee;
            
            // Collateral already in contract, need to add profit from vault/insurance
            if (profit > 0) {
                // Profit comes from contract's KAIROS balance (funded by vault)
                uint256 contractBalance = kairos.balanceOf(address(this));
                uint256 userTotalCollateral = collateral[trader];
                uint256 availableForPayout = contractBalance > userTotalCollateral 
                    ? contractBalance - userTotalCollateral 
                    : 0;
                
                // Cap profit at available funds
                if (profit > availableForPayout) {
                    profit = availableForPayout;
                    payout = posCollateral + profit - fee;
                }
                collateral[trader] += profit;
            }
            
            // Deduct fee from collateral
            collateral[trader] -= fee;
        } else {
            // Loss: deduct from collateral
            uint256 loss = uint256(-pnl);
            
            // Cap loss at collateral amount
            if (loss > posCollateral) {
                loss = posCollateral; // Bad debt absorbed by insurance
            }
            
            collateral[trader] -= (loss + fee);
        }
    }

    /// @dev Distribute fees to vault, treasury, insurance
    function _distributeFees(uint256 feeAmount) internal {
        if (feeAmount == 0) return;
        
        uint256 vaultFee = (feeAmount * vaultFeeBps) / FEE_PRECISION;
        uint256 treasuryFee = (feeAmount * treasuryFeeBps) / FEE_PRECISION;
        uint256 insuranceFee = feeAmount - vaultFee - treasuryFee;
        
        if (vault != address(0) && vaultFee > 0) {
            kairos.safeTransfer(vault, vaultFee);
        }
        if (treasury != address(0) && treasuryFee > 0) {
            kairos.safeTransfer(treasury, treasuryFee);
        }
        if (insuranceFund != address(0) && insuranceFee > 0) {
            kairos.safeTransfer(insuranceFund, insuranceFee);
        }
        
        totalFeesCollected += feeAmount;
        
        emit FeesDistributed(vaultFee, treasuryFee, insuranceFee);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Update the authorized relayer address
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "KairosPerps: zero address");
        address old = relayer;
        relayer = _relayer;
        emit RelayerUpdated(old, _relayer);
    }

    /// @notice Update fee recipient addresses
    function setFeeRecipients(address _vault, address _treasury, address _insuranceFund) external onlyOwner {
        vault = _vault;
        treasury = _treasury;
        insuranceFund = _insuranceFund;
    }

    /// @notice Update trading fees (in basis points)
    function setTradingFees(uint256 _openFeeBps, uint256 _closeFeeBps) external onlyOwner {
        require(_openFeeBps <= 100, "KairosPerps: open fee too high"); // max 1%
        require(_closeFeeBps <= 100, "KairosPerps: close fee too high");
        openFeeBps = _openFeeBps;
        closeFeeBps = _closeFeeBps;
    }

    /// @notice Update maintenance margin (in basis points)
    function setMaintenanceMargin(uint256 _maintenanceMarginBps) external onlyOwner {
        require(_maintenanceMarginBps >= 50 && _maintenanceMarginBps <= 2000, "KairosPerps: invalid margin");
        maintenanceMarginBps = _maintenanceMarginBps;
    }

    /// @notice Fund the contract with KAIROS for paying out profits
    /// @dev Vault or owner sends KAIROS to cover trader profits
    function fundContract(uint256 amount) external {
        kairos.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Emergency withdraw stuck tokens (non-user collateral)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @notice Pause all trading in emergency
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause trading
    function unpause() external onlyOwner {
        _unpause();
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  GLOBAL STATS VIEW
    // ═════════════════════════════════════════════════════════════════════════

    function globalStats() external view returns (
        uint256 openInterestLong,
        uint256 openInterestShort,
        uint256 totalFees,
        uint256 volume,
        uint256 positionsOpened,
        uint256 liquidations,
        uint256 contractBalance
    ) {
        return (
            totalOpenInterestLong,
            totalOpenInterestShort,
            totalFeesCollected,
            totalVolume,
            totalPositionsOpened,
            totalLiquidations,
            kairos.balanceOf(address(this))
        );
    }
}
