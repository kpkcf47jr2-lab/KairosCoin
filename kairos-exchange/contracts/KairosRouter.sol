// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IKairosRouter.sol";
import "./interfaces/IDEXAdapter.sol";
import "./FeeModule.sol";

/**
 * @title KairosRouter
 * @notice Main router contract for Kairos Exchange DEX Aggregator
 * @dev Executes swaps through registered DEX adapters with fee collection
 *
 * Architecture:
 * 1. User calls executeSwap() or executeMultiRouteSwap()
 * 2. Router delegates to DEX adapter(s)
 * 3. FeeModule calculates and deducts fees
 * 4. Net output sent to recipient
 *
 * Security:
 * - ReentrancyGuard on all swap functions
 * - Pausable (circuit breaker)
 * - AccessControl (admin, guardian roles)
 * - Deadline check on all swaps
 * - Min output enforcement
 */
contract KairosRouter is IKairosRouter, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant ADAPTER_MANAGER_ROLE = keccak256("ADAPTER_MANAGER_ROLE");

    /// @notice Fee module for calculating and collecting fees
    FeeModule public feeModule;

    /// @notice WETH/WBNB address for native token wrapping
    address public wrappedNative;

    /// @notice Registered DEX adapters
    mapping(bytes32 => address) public adapters; // keccak256(name) => adapter address
    bytes32[] public adapterIds;

    /// @notice Adapter enabled status
    mapping(bytes32 => bool) public adapterEnabled;

    // ── Events ──
    event AdapterRegistered(bytes32 indexed id, address adapter, string name);
    event AdapterToggled(bytes32 indexed id, bool enabled);
    event AdapterRemoved(bytes32 indexed id);
    event FeeModuleUpdated(address oldModule, address newModule);
    event NativeReceived(address sender, uint256 amount);
    event EmergencyWithdraw(address token, uint256 amount, address to);

    // ── Errors ──
    error DeadlineExpired();
    error InsufficientOutput(uint256 actual, uint256 minimum);
    error AdapterNotFound(bytes32 id);
    error AdapterDisabled(bytes32 id);
    error InvalidProportion();
    error ZeroAmount();
    error TransferFailed();

    constructor(
        address _feeModule,
        address _wrappedNative,
        address _admin
    ) {
        feeModule = FeeModule(_feeModule);
        wrappedNative = _wrappedNative;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(ADAPTER_MANAGER_ROLE, _admin);
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    // ═══════════════════════════════════════════════
    //  SWAP EXECUTION
    // ═══════════════════════════════════════════════

    /**
     * @notice Execute a single-route swap through a specific DEX adapter
     * @param params Swap parameters including route data
     * @return amountOut Actual output amount after fees
     */
    function executeSwap(SwapParams calldata params)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 amountOut)
    {
        // Validations
        if (block.timestamp > params.deadline) revert DeadlineExpired();
        if (params.amountIn == 0) revert ZeroAmount();

        // Decode adapter ID from routeData
        bytes32 adapterId = abi.decode(params.routeData, (bytes32));
        address adapter = _getAdapter(adapterId);

        // Transfer tokenIn from user to this contract
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Approve adapter to spend
        IERC20(params.tokenIn).forceApprove(adapter, params.amountIn);

        // Execute swap through adapter
        uint256 rawOut = IDEXAdapter(adapter).swap(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            0, // adapter handles internal slippage; we check final
            address(this),
            params.routeData
        );

        // Calculate and collect fee
        (uint256 feeAmount, uint256 netAmount) = feeModule.calculateFee(rawOut, msg.sender);
        amountOut = netAmount;

        // Enforce minimum output
        if (amountOut < params.minAmountOut) {
            revert InsufficientOutput(amountOut, params.minAmountOut);
        }

        // Transfer fee to treasury
        if (feeAmount > 0) {
            IERC20(params.tokenOut).safeTransfer(feeModule.treasury(), feeAmount);
        }

        // Transfer output to recipient
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        emit SwapExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            feeAmount,
            feeModule.treasury()
        );
    }

    /**
     * @notice Execute a multi-route swap (split across multiple DEXes)
     * @dev Proportions must sum to 10000 (100%)
     * @param steps Array of route steps with proportions
     * @param params Overall swap parameters
     * @return amountOut Total output after fees
     */
    function executeMultiRouteSwap(
        RouteStep[] calldata steps,
        SwapParams calldata params
    )
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 amountOut)
    {
        // Validations
        if (block.timestamp > params.deadline) revert DeadlineExpired();
        if (params.amountIn == 0) revert ZeroAmount();
        if (steps.length == 0) revert ZeroAmount();

        // Verify proportions sum to 10000
        uint256 totalProportion;
        for (uint256 i = 0; i < steps.length; i++) {
            totalProportion += steps[i].proportion;
        }
        if (totalProportion != 10000) revert InvalidProportion();

        // Transfer tokenIn from user
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Execute each route step
        uint256 totalOut;
        for (uint256 i = 0; i < steps.length; i++) {
            RouteStep calldata step = steps[i];

            // Verify adapter
            bytes32 adapterId = keccak256(abi.encodePacked(IDEXAdapter(step.adapter).name()));
            if (!adapterEnabled[adapterId]) revert AdapterDisabled(adapterId);

            // Calculate input for this step
            uint256 stepAmountIn;
            if (i == steps.length - 1) {
                // Last step gets remainder (avoid rounding dust)
                stepAmountIn = IERC20(params.tokenIn).balanceOf(address(this));
            } else {
                stepAmountIn = params.amountIn * step.proportion / 10000;
            }

            // Approve and swap
            IERC20(step.tokenIn).forceApprove(step.adapter, stepAmountIn);

            uint256 stepOut = IDEXAdapter(step.adapter).swap(
                step.tokenIn,
                step.tokenOut,
                stepAmountIn,
                0,
                address(this),
                step.adapterData
            );

            totalOut += stepOut;
        }

        // Calculate and collect fee
        (uint256 feeAmount, uint256 netAmount) = feeModule.calculateFee(totalOut, msg.sender);
        amountOut = netAmount;

        // Enforce minimum output
        if (amountOut < params.minAmountOut) {
            revert InsufficientOutput(amountOut, params.minAmountOut);
        }

        // Transfer fee
        if (feeAmount > 0) {
            IERC20(params.tokenOut).safeTransfer(feeModule.treasury(), feeAmount);
        }

        // Transfer output
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        emit RouteExecuted(msg.sender, steps.length, params.amountIn, amountOut);
        emit SwapExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            feeAmount,
            feeModule.treasury()
        );
    }

    // ═══════════════════════════════════════════════
    //  ADAPTER MANAGEMENT
    // ═══════════════════════════════════════════════

    function registerAdapter(address _adapter)
        external
        onlyRole(ADAPTER_MANAGER_ROLE)
    {
        string memory adapterName = IDEXAdapter(_adapter).name();
        bytes32 id = keccak256(abi.encodePacked(adapterName));
        adapters[id] = _adapter;
        adapterEnabled[id] = true;
        adapterIds.push(id);
        emit AdapterRegistered(id, _adapter, adapterName);
    }

    function toggleAdapter(bytes32 _id, bool _enabled)
        external
        onlyRole(ADAPTER_MANAGER_ROLE)
    {
        if (adapters[_id] == address(0)) revert AdapterNotFound(_id);
        adapterEnabled[_id] = _enabled;
        emit AdapterToggled(_id, _enabled);
    }

    function getAdapterCount() external view returns (uint256) {
        return adapterIds.length;
    }

    // ═══════════════════════════════════════════════
    //  ADMIN / GUARDIAN
    // ═══════════════════════════════════════════════

    /// @notice Emergency pause — callable by guardian
    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setFeeModule(address _feeModule) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit FeeModuleUpdated(address(feeModule), _feeModule);
        feeModule = FeeModule(_feeModule);
    }

    /// @notice Emergency withdraw stuck tokens (safety)
    function emergencyWithdraw(address _token, uint256 _amount, address _to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20(_token).safeTransfer(_to, _amount);
        emit EmergencyWithdraw(_token, _amount, _to);
    }

    /// @notice Emergency withdraw stuck native (BNB/ETH)
    function emergencyWithdrawNative(address payable _to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 balance = address(this).balance;
        (bool ok,) = _to.call{value: balance}("");
        if (!ok) revert TransferFailed();
        emit EmergencyWithdraw(address(0), balance, _to);
    }

    // ── Internal ──

    function _getAdapter(bytes32 _id) internal view returns (address) {
        address adapter = adapters[_id];
        if (adapter == address(0)) revert AdapterNotFound(_id);
        if (!adapterEnabled[_id]) revert AdapterDisabled(_id);
        return adapter;
    }
}
