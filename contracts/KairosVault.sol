// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ═══════════════════════════════════════════════════════════════════════════════
//
//   KAIROS VAULT — Liquidity Provider Vault for Leverage Trading
//
//   ┌─────────────────────────────────────────────────────┐
//   │  Purpose  : Provide liquidity for leverage traders   │
//   │  Token    : kKAIROS (vault share token)              │
//   │  Yield    : Trading fees from Kairos Broker          │
//   │  Owner    : Kairos 777 Inc. (Mario Isaac)            │
//   │  Network  : BSC (Binance Smart Chain)                │
//   └─────────────────────────────────────────────────────┘
//
//   HOW IT WORKS:
//   1. Users deposit KAIROS tokens into the vault
//   2. They receive kKAIROS shares proportional to their deposit
//   3. Trading fees from leverage positions flow into the vault
//   4. When users withdraw, their kKAIROS is burned and they
//      receive KAIROS + their share of accumulated fees (yield)
//   5. The vault's KAIROS backs leverage positions on Kairos Trade
//
//   Fee Distribution:
//   - 70% of trading fees → Vault (LP rewards)
//   - 20% of trading fees → Kairos 777 Treasury
//   - 10% of trading fees → Insurance Fund (covers bad liquidations)
//
// ═══════════════════════════════════════════════════════════════════════════════

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract KairosVault is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═════════════════════════════════════════════════════════════════════════
    //                           STATE VARIABLES
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice The KAIROS token (underlying asset)
    IERC20 public immutable kairosToken;

    /// @notice Treasury address for protocol fees
    address public treasury;

    /// @notice Insurance fund address
    address public insuranceFund;

    /// @notice Fee split percentages (basis points, 10000 = 100%)
    uint256 public vaultFeeBps = 7000;      // 70% to vault LPs
    uint256 public treasuryFeeBps = 2000;   // 20% to treasury
    uint256 public insuranceFeeBps = 1000;  // 10% to insurance

    /// @notice Minimum deposit amount (1 KAIROS = 1e18)
    uint256 public minDeposit = 1e18;

    /// @notice Maximum total vault capacity
    uint256 public maxVaultCapacity = 10_000_000e18; // 10M KAIROS

    /// @notice Withdrawal cooldown period (prevents flash loan attacks)
    uint256 public withdrawalCooldown = 1 hours;

    /// @notice Track when each user last deposited (for cooldown)
    mapping(address => uint256) public lastDepositTime;

    /// @notice Total fees distributed to the vault (for APY tracking)
    uint256 public totalFeesDistributed;

    /// @notice Total fees sent to treasury
    uint256 public totalTreasuryFees;

    /// @notice Total fees sent to insurance
    uint256 public totalInsuranceFees;

    /// @notice Cumulative deposits (for TVL history tracking)
    uint256 public totalDeposited;

    /// @notice Cumulative withdrawals
    uint256 public totalWithdrawn;

    /// @notice Epoch tracker for yield snapshots
    uint256 public currentEpoch;

    /// @notice Whether the vault accepts new deposits
    bool public depositsEnabled = true;

    // ═════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═════════════════════════════════════════════════════════════════════════

    event Deposited(address indexed user, uint256 kairosAmount, uint256 sharesReceived);
    event Withdrawn(address indexed user, uint256 sharesRedeemed, uint256 kairosReturned);
    event FeesDistributed(uint256 totalFees, uint256 vaultShare, uint256 treasuryShare, uint256 insuranceShare, uint256 epoch);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event InsuranceFundUpdated(address oldFund, address newFund);
    event FeeSplitUpdated(uint256 vaultBps, uint256 treasuryBps, uint256 insuranceBps);
    event VaultCapacityUpdated(uint256 oldCapacity, uint256 newCapacity);
    event DepositsToggled(bool enabled);

    // ═════════════════════════════════════════════════════════════════════════
    //                            CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════════════

    constructor(
        address _kairosToken,
        address _treasury,
        address _insuranceFund
    )
        ERC20("Kairos Vault Share", "kKAIROS")
        Ownable(msg.sender)
    {
        require(_kairosToken != address(0), "Invalid KAIROS address");
        require(_treasury != address(0), "Invalid treasury");
        require(_insuranceFund != address(0), "Invalid insurance fund");

        kairosToken = IERC20(_kairosToken);
        treasury = _treasury;
        insuranceFund = _insuranceFund;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                         CORE VAULT LOGIC
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Deposit KAIROS tokens into the vault and receive kKAIROS shares
     * @param amount Amount of KAIROS to deposit (18 decimals)
     *
     * The share calculation follows the standard vault pattern:
     *   shares = (amount * totalShares) / totalAssets
     *
     * If vault is empty (first deposit), shares = amount (1:1)
     * As fees accumulate, each kKAIROS becomes worth more than 1 KAIROS
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(depositsEnabled, "Deposits paused");
        require(amount >= minDeposit, "Below min deposit");

        uint256 vaultBalance = kairosToken.balanceOf(address(this));
        require(vaultBalance + amount <= maxVaultCapacity, "Vault capacity exceeded");

        uint256 sharesToMint;
        uint256 currentSupply = totalSupply();

        if (currentSupply == 0 || vaultBalance == 0) {
            // First deposit: 1 KAIROS = 1 kKAIROS
            sharesToMint = amount;
        } else {
            // Subsequent deposits: proportional to existing pool
            sharesToMint = (amount * currentSupply) / vaultBalance;
        }

        require(sharesToMint > 0, "Zero shares");

        // Transfer KAIROS from user to vault
        kairosToken.safeTransferFrom(msg.sender, address(this), amount);

        // Mint vault shares
        _mint(msg.sender, sharesToMint);

        // Track
        lastDepositTime[msg.sender] = block.timestamp;
        totalDeposited += amount;

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @notice Withdraw KAIROS by burning kKAIROS shares
     * @param shares Amount of kKAIROS shares to redeem
     *
     * Returns proportional KAIROS based on vault's total value:
     *   kairosOut = (shares * totalAssets) / totalShares
     *
     * If fees have accumulated, user gets more KAIROS than they deposited
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "Zero shares");
        require(balanceOf(msg.sender) >= shares, "Insufficient shares");
        require(
            block.timestamp >= lastDepositTime[msg.sender] + withdrawalCooldown,
            "Withdrawal cooldown active"
        );

        uint256 vaultBalance = kairosToken.balanceOf(address(this));
        uint256 currentSupply = totalSupply();

        // Calculate KAIROS amount to return
        uint256 kairosAmount = (shares * vaultBalance) / currentSupply;
        require(kairosAmount > 0, "Zero withdrawal");

        // Burn shares first (CEI pattern)
        _burn(msg.sender, shares);

        // Transfer KAIROS to user
        kairosToken.safeTransfer(msg.sender, kairosAmount);

        totalWithdrawn += kairosAmount;

        emit Withdrawn(msg.sender, shares, kairosAmount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                        FEE DISTRIBUTION
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Distribute trading fees into the vault ecosystem
     * @param totalFees Total KAIROS fees collected from leverage trading
     *
     * Called by the Kairos backend (or a keeper bot) after collecting fees.
     * Splits fees according to the configured percentages:
     *   70% → vault (increases kKAIROS value for LPs)
     *   20% → treasury (Kairos 777 revenue)
     *   10% → insurance fund (covers bad debt from liquidations)
     *
     * The vault's share stays in the contract, automatically increasing
     * the value of all kKAIROS shares (no claim needed — it's automatic).
     */
    function distributeFees(uint256 totalFees) external nonReentrant {
        require(totalFees > 0, "Zero fees");

        // Transfer all fees from sender to this contract first
        kairosToken.safeTransferFrom(msg.sender, address(this), totalFees);

        // Calculate splits
        uint256 vaultShare = (totalFees * vaultFeeBps) / 10000;
        uint256 treasuryShare = (totalFees * treasuryFeeBps) / 10000;
        uint256 insuranceShare = totalFees - vaultShare - treasuryShare; // Remainder to insurance

        // vault share stays in contract (auto-compounds for LPs)
        // Transfer treasury & insurance shares
        if (treasuryShare > 0) {
            kairosToken.safeTransfer(treasury, treasuryShare);
        }
        if (insuranceShare > 0) {
            kairosToken.safeTransfer(insuranceFund, insuranceShare);
        }

        // Track
        totalFeesDistributed += vaultShare;
        totalTreasuryFees += treasuryShare;
        totalInsuranceFees += insuranceShare;
        currentEpoch++;

        emit FeesDistributed(totalFees, vaultShare, treasuryShare, insuranceShare, currentEpoch);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Total KAIROS locked in the vault (TVL)
     */
    function totalAssets() public view returns (uint256) {
        return kairosToken.balanceOf(address(this));
    }

    /**
     * @notice Price per share: how much KAIROS 1 kKAIROS is worth
     * @dev Returns value with 18 decimals. If > 1e18, LPs are in profit.
     */
    function pricePerShare() public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        if (currentSupply == 0) return 1e18; // 1:1 when empty
        return (kairosToken.balanceOf(address(this)) * 1e18) / currentSupply;
    }

    /**
     * @notice How much KAIROS a user would receive for their shares
     */
    function getUserValue(address user) external view returns (uint256) {
        uint256 userShares = balanceOf(user);
        if (userShares == 0) return 0;
        uint256 currentSupply = totalSupply();
        if (currentSupply == 0) return 0;
        return (userShares * kairosToken.balanceOf(address(this))) / currentSupply;
    }

    /**
     * @notice Estimate how many shares a deposit would receive
     */
    function previewDeposit(uint256 amount) external view returns (uint256) {
        uint256 currentSupply = totalSupply();
        uint256 vaultBalance = kairosToken.balanceOf(address(this));
        if (currentSupply == 0 || vaultBalance == 0) return amount;
        return (amount * currentSupply) / vaultBalance;
    }

    /**
     * @notice Estimate how much KAIROS a withdrawal would return
     */
    function previewWithdraw(uint256 shares) external view returns (uint256) {
        uint256 currentSupply = totalSupply();
        if (currentSupply == 0) return 0;
        return (shares * kairosToken.balanceOf(address(this))) / currentSupply;
    }

    /**
     * @notice Time remaining on withdrawal cooldown for a user
     */
    function cooldownRemaining(address user) external view returns (uint256) {
        uint256 unlockTime = lastDepositTime[user] + withdrawalCooldown;
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                         ADMIN FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setInsuranceFund(address _fund) external onlyOwner {
        require(_fund != address(0), "Invalid address");
        emit InsuranceFundUpdated(insuranceFund, _fund);
        insuranceFund = _fund;
    }

    function setFeeSplit(uint256 _vaultBps, uint256 _treasuryBps, uint256 _insuranceBps) external onlyOwner {
        require(_vaultBps + _treasuryBps + _insuranceBps == 10000, "Must total 100%");
        require(_vaultBps >= 5000, "Vault min 50%"); // LPs must always get majority
        vaultFeeBps = _vaultBps;
        treasuryFeeBps = _treasuryBps;
        insuranceFeeBps = _insuranceBps;
        emit FeeSplitUpdated(_vaultBps, _treasuryBps, _insuranceBps);
    }

    function setMaxVaultCapacity(uint256 _capacity) external onlyOwner {
        emit VaultCapacityUpdated(maxVaultCapacity, _capacity);
        maxVaultCapacity = _capacity;
    }

    function setMinDeposit(uint256 _min) external onlyOwner {
        minDeposit = _min;
    }

    function setWithdrawalCooldown(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Max 7 days");
        withdrawalCooldown = _seconds;
    }

    function toggleDeposits(bool _enabled) external onlyOwner {
        depositsEnabled = _enabled;
        emit DepositsToggled(_enabled);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency: recover accidentally sent tokens (NOT KAIROS)
     */
    function rescueToken(address token, uint256 amount) external onlyOwner {
        require(token != address(kairosToken), "Cannot rescue KAIROS");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
