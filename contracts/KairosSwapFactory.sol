// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ═══════════════════════════════════════════════════════════════════════════════
//
//   KairosSwap Factory — Creates and manages trading pairs
//   Owner: Kairos 777 Inc. — Mario Isaac
//   "In God We Trust"
//
//   The Factory creates new KairosSwapPair contracts for each token pair.
//   feeTo receives 0.05% of all swap fees (1/6 of the 0.30% total).
//   feeToSetter (owner) can change the fee recipient.
//
// ═══════════════════════════════════════════════════════════════════════════════

import "./KairosSwapPair.sol";

contract KairosSwapFactory {
    // ── State ────────────────────────────────────────────────────────────
    address public feeTo;          // Kairos 777 Treasury — receives protocol fees
    address public feeToSetter;    // Admin who can change feeTo

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    // ── Events ───────────────────────────────────────────────────────────
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex);

    // ── Constructor ──────────────────────────────────────────────────────
    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
        feeTo = _feeToSetter; // Initially, protocol fees go to deployer/owner
    }

    // ── Views ────────────────────────────────────────────────────────────
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    // ── Create pair ──────────────────────────────────────────────────────
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "KairosSwap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "KairosSwap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "KairosSwap: PAIR_EXISTS");

        // Deploy new pair via CREATE2 for deterministic addresses
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        KairosSwapPair newPair = new KairosSwapPair{salt: salt}();
        newPair.initialize(token0, token1);

        pair = address(newPair);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate both directions
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // ── Admin functions ──────────────────────────────────────────────────
    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "KairosSwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "KairosSwap: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
