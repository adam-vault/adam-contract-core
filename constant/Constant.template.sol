// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    address public constant WETH_ADDRESS = {{ WETH_ADDRESS }};
    address public constant UNISWAP_ROUTER = {{ UNISWAP_ROUTER }};
    address public constant FEED_REGISTRY = {{ FEED_REGISTRY }};
    uint public constant BLOCK_NUMBER_IN_SECOND = {{ BLOCK_NUMBER_IN_SECOND }};
    uint public constant STALE_PRICE_DELAY = {{ STALE_PRICE_DELAY }};
}
