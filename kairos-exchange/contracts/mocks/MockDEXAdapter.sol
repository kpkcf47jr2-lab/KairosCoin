// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IDEXAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockDEXAdapter
 * @notice Mock DEX adapter for testing KairosRouter
 * @dev Returns 1:1 swap ratio for simplicity
 */
contract MockDEXAdapter is IDEXAdapter {
    using SafeERC20 for IERC20;

    string private _name;
    uint256 public exchangeRate = 1e18; // 1:1 default

    constructor(string memory adapterName) {
        _name = adapterName;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function setExchangeRate(uint256 _rate) external {
        exchangeRate = _rate;
    }

    function getAmountOut(
        address /* tokenIn */,
        address /* tokenOut */,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        amountOut = amountIn * exchangeRate / 1e18;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 /* minAmountOut */,
        address recipient,
        bytes calldata /* data */
    ) external payable override returns (uint256 amountOut) {
        // Pull tokenIn
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        amountOut = amountIn * exchangeRate / 1e18;

        // Send tokenOut (must be pre-funded)
        IERC20(tokenOut).safeTransfer(recipient, amountOut);
    }
}
