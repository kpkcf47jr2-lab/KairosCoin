// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IKairosRouter
 * @notice Interface for the Kairos Exchange Router
 * @dev All DEX adapters and the main router implement this interface
 */
interface IKairosRouter {
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;     // slippage protection
        address recipient;
        uint256 deadline;
        bytes routeData;          // encoded route (adapter-specific)
    }

    struct RouteStep {
        address adapter;          // DEX adapter contract
        address tokenIn;
        address tokenOut;
        uint256 proportion;       // basis points (e.g., 5000 = 50%)
        bytes adapterData;        // adapter-specific calldata
    }

    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount,
        address feeRecipient
    );

    event RouteExecuted(
        address indexed sender,
        uint256 steps,
        uint256 totalIn,
        uint256 totalOut
    );

    function executeSwap(SwapParams calldata params) external payable returns (uint256 amountOut);
    function executeMultiRouteSwap(RouteStep[] calldata steps, SwapParams calldata params) external payable returns (uint256 amountOut);
}
