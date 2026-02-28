// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IDEXAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice PancakeSwap V2 Router interface (Uniswap V2 compatible)
interface IPancakeRouter {
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function factory() external view returns (address);
    function WETH() external view returns (address);
}

/// @notice PancakeSwap Factory interface
interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

/**
 * @title PancakeSwapAdapter
 * @notice DEX Adapter for PancakeSwap V2 on BSC
 * @dev Wraps PancakeSwap Router for use by KairosRouter
 */
contract PancakeSwapAdapter is IDEXAdapter {
    using SafeERC20 for IERC20;

    IPancakeRouter public immutable router;
    address public immutable WBNB;

    constructor(address _router) {
        router = IPancakeRouter(_router);
        WBNB = router.WETH();
    }

    function name() external pure override returns (string memory) {
        return "PancakeSwap_V2";
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

        // Transfer tokens from caller (KairosRouter)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            block.timestamp + 300 // 5 min deadline
        );

        amountOut = amounts[amounts.length - 1];
    }

    /**
     * @notice Build optimal path for a swap
     * @dev If direct pair exists, use it. Otherwise route through WBNB.
     */
    function _buildPath(address tokenIn, address tokenOut)
        internal
        view
        returns (address[] memory path)
    {
        // Check if direct pair exists
        address factory = router.factory();
        address directPair = IPancakeFactory(factory).getPair(tokenIn, tokenOut);

        if (directPair != address(0)) {
            // Direct path
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            // Route through WBNB
            path = new address[](3);
            path[0] = tokenIn;
            path[1] = WBNB;
            path[2] = tokenOut;
        }
    }
}
