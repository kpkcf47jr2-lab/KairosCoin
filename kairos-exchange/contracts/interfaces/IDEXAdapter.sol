// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IDEXAdapter
 * @notice Interface for DEX-specific adapters (PancakeSwap, Uniswap, SushiSwap, etc.)
 * @dev Each supported DEX gets its own adapter implementing this interface
 */
interface IDEXAdapter {
    /// @notice Returns the name of this DEX adapter
    function name() external view returns (string memory);

    /// @notice Get a quote for swapping tokenIn → tokenOut
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of tokenIn to swap
    /// @return amountOut Expected amount of tokenOut
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    /// @notice Execute a swap through this DEX
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of tokenIn
    /// @param minAmountOut Minimum acceptable output
    /// @param recipient Address to receive tokenOut
    /// @param data Additional adapter-specific data
    /// @return amountOut Actual amount received
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external payable returns (uint256 amountOut);
}
