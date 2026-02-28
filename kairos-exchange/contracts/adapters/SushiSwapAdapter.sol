// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IDEXAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice SushiSwap Router (Uniswap V2 fork, same interface)
interface ISushiRouter {
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function factory() external view returns (address);
    function WETH() external view returns (address);
}

interface ISushiFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

/**
 * @title SushiSwapAdapter
 * @notice DEX Adapter for SushiSwap on BSC/ETH/Polygon/Arbitrum
 */
contract SushiSwapAdapter is IDEXAdapter {
    using SafeERC20 for IERC20;

    ISushiRouter public immutable router;
    address public immutable wrappedNative;

    constructor(address _router) {
        router = ISushiRouter(_router);
        wrappedNative = router.WETH();
    }

    function name() external pure override returns (string memory) {
        return "SushiSwap";
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        address[] memory path = _buildPath(tokenIn, tokenOut);
        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch {
            amountOut = 0;
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata /* data */
    ) external payable override returns (uint256 amountOut) {
        address[] memory path = _buildPath(tokenIn, tokenOut);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            block.timestamp + 300
        );

        amountOut = amounts[amounts.length - 1];
    }

    function _buildPath(address tokenIn, address tokenOut)
        internal
        view
        returns (address[] memory path)
    {
        address factory = router.factory();
        address directPair = ISushiFactory(factory).getPair(tokenIn, tokenOut);

        if (directPair != address(0)) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            path = new address[](3);
            path[0] = tokenIn;
            path[1] = wrappedNative;
            path[2] = tokenOut;
        }
    }
}
