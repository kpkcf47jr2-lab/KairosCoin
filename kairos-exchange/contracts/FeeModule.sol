// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FeeModule
 * @notice Manages swap fees for Kairos Exchange
 * @dev Configurable fee with discount for KAIROS token holders
 *
 * Fee structure:
 * - Base fee: 15 bps (0.15%)
 * - KAIROS holder discount: 50% off → 7.5 bps (0.075%)
 * - Fee is taken from output tokens
 * - Fee goes to treasury wallet
 */
contract FeeModule is AccessControl, Pausable {
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    /// @notice Base fee in basis points (100 = 1%)
    uint256 public baseFee = 15; // 0.15%

    /// @notice Discount for KAIROS holders in basis points (of the fee)
    uint256 public kairosDiscount = 5000; // 50% discount

    /// @notice Minimum KAIROS balance for discount eligibility
    uint256 public kairosMinBalance = 100 * 1e18; // 100 KAIROS

    /// @notice Treasury address receiving fees
    address public treasury;

    /// @notice KAIROS token address (for discount check)
    address public kairosToken;

    /// @notice Maximum fee cap (safety: never more than 1%)
    uint256 public constant MAX_FEE = 100;

    /// @notice Fee-exempt addresses (e.g., internal contracts)
    mapping(address => bool) public feeExempt;

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event DiscountUpdated(uint256 oldDiscount, uint256 newDiscount);
    event FeeExemptSet(address indexed account, bool exempt);
    event FeeCollected(address indexed token, uint256 amount, address indexed payer, bool discounted);

    error FeeTooHigh(uint256 requested, uint256 max);
    error ZeroAddress();
    error InvalidDiscount();

    constructor(address _treasury, address _kairosToken, address _admin) {
        if (_treasury == address(0) || _admin == address(0)) revert ZeroAddress();
        treasury = _treasury;
        kairosToken = _kairosToken;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
    }

    // ── Fee Calculation ──

    /// @notice Calculate fee amount for a given swap
    /// @param amountOut The output amount before fees
    /// @param user The user executing the swap
    /// @return feeAmount The fee to be deducted
    /// @return netAmount The amount after fee deduction
    function calculateFee(uint256 amountOut, address user)
        external
        view
        returns (uint256 feeAmount, uint256 netAmount)
    {
        if (feeExempt[user] || baseFee == 0) {
            return (0, amountOut);
        }

        uint256 effectiveFee = baseFee;

        // Check KAIROS holder discount
        if (kairosToken != address(0) && kairosMinBalance > 0) {
            try IERC20Minimal(kairosToken).balanceOf(user) returns (uint256 balance) {
                if (balance >= kairosMinBalance) {
                    effectiveFee = baseFee * (10000 - kairosDiscount) / 10000;
                }
            } catch {
                // If balanceOf fails, no discount
            }
        }

        feeAmount = amountOut * effectiveFee / 10000;
        netAmount = amountOut - feeAmount;
    }

    // ── Admin Functions ──

    function setBaseFee(uint256 _fee) external onlyRole(FEE_MANAGER_ROLE) {
        if (_fee > MAX_FEE) revert FeeTooHigh(_fee, MAX_FEE);
        emit FeeUpdated(baseFee, _fee);
        baseFee = _fee;
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setKairosDiscount(uint256 _discount) external onlyRole(FEE_MANAGER_ROLE) {
        if (_discount > 10000) revert InvalidDiscount();
        emit DiscountUpdated(kairosDiscount, _discount);
        kairosDiscount = _discount;
    }

    function setKairosMinBalance(uint256 _minBalance) external onlyRole(FEE_MANAGER_ROLE) {
        kairosMinBalance = _minBalance;
    }

    function setFeeExempt(address _account, bool _exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeExempt[_account] = _exempt;
        emit FeeExemptSet(_account, _exempt);
    }

    function setKairosToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kairosToken = _token;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}

/// @dev Minimal ERC20 interface for balance check
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
}
