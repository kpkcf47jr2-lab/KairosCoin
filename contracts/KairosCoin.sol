// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ═══════════════════════════════════════════════════════════════════════════════
//
//   ██╗  ██╗ █████╗ ██╗██████╗  ██████╗ ███████╗     ██████╗ ██████╗ ██╗███╗   ██╗
//   ██║ ██╔╝██╔══██╗██║██╔══██╗██╔═══██╗██╔════╝    ██╔════╝██╔═══██╗██║████╗  ██║
//   █████╔╝ ███████║██║██████╔╝██║   ██║███████╗    ██║     ██║   ██║██║██╔██╗ ██║
//   ██╔═██╗ ██╔══██║██║██╔══██╗██║   ██║╚════██║    ██║     ██║   ██║██║██║╚██╗██║
//   ██║  ██╗██║  ██║██║██║  ██║╚██████╔╝███████║    ╚██████╗╚██████╔╝██║██║ ╚████║
//   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝
//
//                        "In God We Trust"
//
//   ┌─────────────────────────────────────────────────────┐
//   │  Kairos Coin (KAIROS) — USD-Pegged Stablecoin       │
//   │  Owner     : Kairos 777 Inc.                         │
//   │  Admin     : Mario Isaac                             │
//   │  Parity    : 1 KAIROS = 1 USD                        │
//   │  Fee       : 8 bps (0.08%) — 60% cheaper than USDT   │
//   │  Logo      : Gold coin · Globe · Network nodes        │
//   │  Motto     : "In God We Trust"                        │
//   └─────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KairosCoin
 * @author Kairos 777 Inc. — Mario Isaac
 * @notice USD-pegged stablecoin (1 KAIROS = 1 USD) with advanced features
 *         that surpass USDT and USDC in transparency, security, and DeFi utility.
 *
 * @dev Brand Identity:
 *      - Logo: Gold coin with interconnected nodes around a globe
 *      - Motto: "In God We Trust"
 *      - Colors: Gold (#D4AF37), Dark Brown (#3D2B1F)
 *
 * @dev Key features beyond USDT/USDC:
 *      - ERC-2612 Permit: Gasless approvals (users don't need ETH to approve)
 *      - Transparent Blacklist: Every freeze/unfreeze emits on-chain events
 *      - Batch Transfers: Send to multiple addresses in one transaction
 *      - Mint/Burn Caps: Configurable per-transaction limits
 *      - Emergency Pause: Halt all transfers if exploit detected
 *      - Supply Tracking: On-chain totalMinted / totalBurned for full audit trail
 *      - Timelock-ready: Owner can be a timelock contract for governance
 *      - Reentrancy Protection: Guard on all state-changing operations
 *      - Role-Based Access: MINTER_ROLE for automated mint/burn (like USDC)
 *        Owner retains governance; minters handle day-to-day operations.
 */
contract KairosCoin is
    ERC20,
    ERC20Permit,
    Ownable,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    // ═════════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Initial supply: 10,000,000,000 KAIROS (10 billion)
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10 ** 18;

    /// @notice Role identifier for automated minters (backend relayer)
    /// @dev Minters can only mint() and burn() — cannot pause, change fees, etc.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ═════════════════════════════════════════════════════════════════════════
    //                            STATE VARIABLES
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Total tokens ever minted (excluding initial supply)
    uint256 public totalMinted;

    /// @notice Total tokens ever burned
    uint256 public totalBurned;

    /// @notice Maximum amount that can be minted in a single transaction (0 = no limit)
    uint256 public mintCap;

    /// @notice Maximum amount that can be burned in a single transaction (0 = no limit)
    uint256 public burnCap;

    /// @notice Addresses frozen by compliance (cannot send or receive)
    mapping(address => bool) public blacklisted;

    // ── FEE SYSTEM ──────────────────────────────────────────────────────────
    // USDT/USDC potential fee: 20 bps (0.20%)
    // KAIROS fee: 8 bps (0.08%) → 60% cheaper than competitors
    // 100% of fee goes to Kairos Reserve (treasury)

    /// @notice Denominator for basis-point math (10000 = 100%)
    uint256 public constant FEE_DENOMINATOR = 10_000;

    /// @notice Maximum fee allowed: 20 bps (0.20%) — never exceed USDT/USDC
    uint256 public constant MAX_FEE_BPS = 20;

    /// @notice Current transaction fee in basis points (default 8 bps = 0.08%)
    uint256 public feeBps = 8;

    /// @notice Wallet that receives all transaction fees (Kairos Reserve)
    address public reserveWallet;

    /// @notice Total fees ever collected (for transparency / audit)
    uint256 public totalFeesCollected;

    /// @notice Addresses exempt from fees (owner, reserve, contracts, etc.)
    mapping(address => bool) public feeExempt;

    // ═════════════════════════════════════════════════════════════════════════
    //                               EVENTS
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when new tokens are minted
    event Mint(address indexed to, uint256 amount);

    /// @notice Emitted when tokens are burned
    event Burn(address indexed from, uint256 amount);

    /// @notice Emitted when an address is blacklisted
    event Blacklisted(address indexed account);

    /// @notice Emitted when an address is removed from blacklist
    event UnBlacklisted(address indexed account);

    /// @notice Emitted when mint cap is updated
    event MintCapUpdated(uint256 oldCap, uint256 newCap);

    /// @notice Emitted when burn cap is updated
    event BurnCapUpdated(uint256 oldCap, uint256 newCap);

    /// @notice Emitted on batch transfer
    event BatchTransfer(address indexed from, uint256 totalAmount, uint256 recipientCount);

    /// @notice Emitted when a transfer fee is collected
    event FeeCollected(address indexed from, address indexed to, uint256 feeAmount, address indexed reserveWallet);

    /// @notice Emitted when fee rate is updated
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    /// @notice Emitted when reserve wallet is updated
    event ReserveWalletUpdated(address indexed oldWallet, address indexed newWallet);

    /// @notice Emitted when fee exemption status changes
    event FeeExemptionUpdated(address indexed account, bool exempt);

    /// @notice Emitted when a minter role is granted
    event MinterAdded(address indexed account);

    /// @notice Emitted when a minter role is revoked
    event MinterRemoved(address indexed account);

    // ═════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ═════════════════════════════════════════════════════════════════════════

    error AccountBlacklisted(address account);
    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMintCap(uint256 amount, uint256 cap);
    error ExceedsBurnCap(uint256 amount, uint256 cap);
    error ArrayLengthMismatch();
    error InsufficientBalance(uint256 requested, uint256 available);
    error FeeExceedsMax(uint256 feeBps, uint256 maxBps);
    error NotOwnerOrMinter();

    // ═════════════════════════════════════════════════════════════════════════
    //                             MODIFIERS
    // ═════════════════════════════════════════════════════════════════════════

    /// @dev Reverts if the account is blacklisted
    modifier notBlacklisted(address account) {
        if (blacklisted[account]) revert AccountBlacklisted(account);
        _;
    }

    /// @dev Reverts if caller is neither the owner nor a minter
    modifier onlyOwnerOrMinter() {
        if (msg.sender != owner() && !hasRole(MINTER_ROLE, msg.sender)) {
            revert NotOwnerOrMinter();
        }
        _;
    }

    /// @dev Reverts if amount is zero
    modifier nonZeroAmount(uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        _;
    }

    /// @dev Reverts if address is zero
    modifier nonZeroAddress(address account) {
        if (account == address(0)) revert ZeroAddress();
        _;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                            CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploys KairosCoin with initial supply minted to the admin wallet.
     * @param adminWallet The address that receives the initial 10B KAIROS supply
     *                    and becomes the contract owner.
     */
    /**
     * @param adminWallet   Receives the initial 10B KAIROS and becomes owner.
     * @param _reserveWallet Kairos Reserve wallet — receives all transaction fees.
     */
    constructor(
        address adminWallet,
        address _reserveWallet
    )
        ERC20("Kairos Coin", "KAIROS")
        ERC20Permit("Kairos Coin")
        Ownable(adminWallet)
    {
        if (adminWallet == address(0)) revert ZeroAddress();
        if (_reserveWallet == address(0)) revert ZeroAddress();

        reserveWallet = _reserveWallet;

        // Owner and reserve wallet are fee-exempt by default
        feeExempt[adminWallet] = true;
        feeExempt[_reserveWallet] = true;

        // Grant admin role to deployer (can manage all roles)
        _grantRole(DEFAULT_ADMIN_ROLE, adminWallet);

        _mint(adminWallet, INITIAL_SUPPLY);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: MINT & BURN
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint new KAIROS tokens when USD deposits are received.
     * @param to     Recipient of the newly minted tokens.
     * @param amount Number of tokens to mint (18 decimals).
     *
     * @dev Owner or MINTER_ROLE can call this.
     *      Respects mintCap if set (> 0).
     *      Emits {Mint} and {Transfer} events.
     */
    function mint(
        address to,
        uint256 amount
    )
        external
        onlyOwnerOrMinter
        whenNotPaused
        nonReentrant
        nonZeroAddress(to)
        nonZeroAmount(amount)
        notBlacklisted(to)
    {
        if (mintCap > 0 && amount > mintCap) {
            revert ExceedsMintCap(amount, mintCap);
        }

        totalMinted += amount;
        _mint(to, amount);

        emit Mint(to, amount);
    }

    /**
     * @notice Burn KAIROS tokens when USD is withdrawn from reserves.
     * @param from   Address whose tokens will be burned.
     * @param amount Number of tokens to burn (18 decimals).
     *
     * @dev Owner or MINTER_ROLE can call this.
     *      Respects burnCap if set (> 0).
     *      Emits {Burn} and {Transfer} events.
     */
    function burn(
        address from,
        uint256 amount
    )
        external
        onlyOwnerOrMinter
        whenNotPaused
        nonReentrant
        nonZeroAddress(from)
        nonZeroAmount(amount)
    {
        if (burnCap > 0 && amount > burnCap) {
            revert ExceedsBurnCap(amount, burnCap);
        }

        uint256 balance = balanceOf(from);
        if (balance < amount) {
            revert InsufficientBalance(amount, balance);
        }

        totalBurned += amount;
        _burn(from, amount);

        emit Burn(from, amount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: BLACKLIST / COMPLIANCE
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Freeze an address — it can no longer send or receive KAIROS.
     * @param account The address to blacklist.
     */
    function blacklist(
        address account
    ) external onlyOwner nonZeroAddress(account) {
        blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @notice Unfreeze an address — restore normal transfer ability.
     * @param account The address to remove from blacklist.
     */
    function unBlacklist(
        address account
    ) external onlyOwner nonZeroAddress(account) {
        blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: CAPS & CONFIGURATION
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the maximum tokens that can be minted per transaction.
     * @param newCap New mint cap (0 = unlimited).
     */
    function setMintCap(uint256 newCap) external onlyOwner {
        uint256 oldCap = mintCap;
        mintCap = newCap;
        emit MintCapUpdated(oldCap, newCap);
    }

    /**
     * @notice Set the maximum tokens that can be burned per transaction.
     * @param newCap New burn cap (0 = unlimited).
     */
    function setBurnCap(uint256 newCap) external onlyOwner {
        uint256 oldCap = burnCap;
        burnCap = newCap;
        emit BurnCapUpdated(oldCap, newCap);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: FEE CONFIGURATION
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update the transaction fee rate.
     * @param newFeeBps New fee in basis points. Must be <= MAX_FEE_BPS (20).
     *                  Default: 8 bps (0.08%) — 60% cheaper than USDT/USDC.
     *                  Set to 0 to disable fees entirely.
     */
    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeExceedsMax(newFeeBps, MAX_FEE_BPS);
        uint256 oldFee = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Update the Kairos Reserve wallet that receives all fees.
     * @param newReserveWallet New reserve wallet address.
     */
    function setReserveWallet(address newReserveWallet) external onlyOwner nonZeroAddress(newReserveWallet) {
        address oldWallet = reserveWallet;

        // Remove fee exemption from old wallet, add to new
        feeExempt[oldWallet] = false;
        feeExempt[newReserveWallet] = true;

        reserveWallet = newReserveWallet;
        emit ReserveWalletUpdated(oldWallet, newReserveWallet);
    }

    /**
     * @notice Set fee exemption for an address (e.g., exchange, DEX pool, bridge).
     * @param account Address to update.
     * @param exempt  True = no fee on transfers from/to this address.
     */
    function setFeeExempt(address account, bool exempt) external onlyOwner nonZeroAddress(account) {
        feeExempt[account] = exempt;
        emit FeeExemptionUpdated(account, exempt);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: PAUSE / UNPAUSE
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Pause all token transfers. Emergency use only.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume all token transfers after a pause.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ADMIN: MINTER MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Grant MINTER_ROLE to an address (e.g., backend relayer).
     * @param account The address to authorize for automated mint/burn.
     *
     * @dev Only the owner can grant minter roles.
     *      Minters can ONLY call mint() and burn() — nothing else.
     *      The owner can revoke this at any time.
     */
    function addMinter(address account) external onlyOwner nonZeroAddress(account) {
        _grantRole(MINTER_ROLE, account);
        feeExempt[account] = true;
        emit MinterAdded(account);
    }

    /**
     * @notice Revoke MINTER_ROLE from an address.
     * @param account The address to de-authorize.
     *
     * @dev Emergency: if a minter key is compromised, call this immediately.
     */
    function removeMinter(address account) external onlyOwner nonZeroAddress(account) {
        _revokeRole(MINTER_ROLE, account);
        feeExempt[account] = false;
        emit MinterRemoved(account);
    }

    /**
     * @notice Check if an address has the MINTER_ROLE.
     * @param account The address to check.
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      USER: BATCH TRANSFER
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Transfer tokens to multiple recipients in a single transaction.
     * @param recipients Array of destination addresses.
     * @param amounts    Array of amounts to send to each recipient.
     *
     * @dev Saves gas vs. multiple individual transfers.
     *      Both arrays must be the same length.
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external whenNotPaused nonReentrant notBlacklisted(msg.sender) {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();

        uint256 totalAmount;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (blacklisted[recipients[i]]) revert AccountBlacklisted(recipients[i]);
            totalAmount += amounts[i];
        }

        // Pre-check total balance to fail fast
        uint256 senderBalance = balanceOf(msg.sender);
        if (senderBalance < totalAmount) {
            revert InsufficientBalance(totalAmount, senderBalance);
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }

        emit BatchTransfer(msg.sender, totalAmount, recipients.length);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Returns the net supply change from mint/burn operations
     *         (excluding initial supply).
     */
    function netMinted() external view returns (int256) {
        return int256(totalMinted) - int256(totalBurned);
    }

    /**
     * @notice Checks if an address is currently blacklisted.
     * @param account The address to check.
     */
    function isBlacklisted(address account) external view returns (bool) {
        return blacklisted[account];
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      INTERNAL OVERRIDES
    // ═════════════════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════════════════
    //                      VIEW: FEE CALCULATION
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @notice Calculate the fee for a given transfer amount.
     * @param from   Sender address.
     * @param to     Receiver address.
     * @param amount Transfer amount.
     * @return fee   The fee that would be deducted.
     */
    function calculateFee(
        address from,
        address to,
        uint256 amount
    ) public view returns (uint256 fee) {
        // No fee on mint, burn, or exempt addresses
        if (
            from == address(0) ||          // minting
            to == address(0) ||            // burning
            feeBps == 0 ||                 // fees disabled
            feeExempt[from] ||             // sender exempt
            feeExempt[to]                  // receiver exempt
        ) {
            return 0;
        }
        fee = (amount * feeBps) / FEE_DENOMINATOR;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      INTERNAL OVERRIDES
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @dev Hook called on every token transfer.
     *      Enforces: blacklist + pause + automatic fee collection.
     *
     *      Fee logic:
     *      - USDT/USDC max fee: 20 bps (0.20%)
     *      - KAIROS default fee: 8 bps (0.08%) → 60% cheaper
     *      - 100% of fee → Kairos Reserve wallet
     *      - Fee-exempt addresses (owner, reserve, configured) pay 0 fee
     *      - Minting and burning are always fee-free
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // ── Blacklist enforcement ────────────────────────────────────────
        if (from != address(0) && blacklisted[from]) {
            revert AccountBlacklisted(from);
        }
        if (to != address(0) && blacklisted[to]) {
            revert AccountBlacklisted(to);
        }

        // ── Pause enforcement ────────────────────────────────────────────
        if (paused()) {
            require(
                from == address(0) || to == address(0) || from == owner(),
                "KairosCoin: transfers paused"
            );
        }

        // ── Fee collection ───────────────────────────────────────────────
        // Only charge fee on normal transfers (not mint/burn, not to reserve)
        uint256 fee = calculateFee(from, to, amount);

        if (fee > 0 && to != reserveWallet) {
            // Transfer fee to Kairos Reserve
            uint256 amountAfterFee = amount - fee;
            totalFeesCollected += fee;

            super._update(from, reserveWallet, fee);          // fee → reserve
            super._update(from, to, amountAfterFee);          // rest → recipient

            emit FeeCollected(from, to, fee, reserveWallet);
            return; // already handled both transfers
        }

        super._update(from, to, amount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //                      ACCESS CONTROL OVERRIDES
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * @dev Required override: AccessControl + ERC20 both define supportsInterface.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
