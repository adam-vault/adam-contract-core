// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    address public constant WETH_ADDRESS = {{ WETH_ADDRESS }};
    address public constant UNISWAP_ROUTER = {{ UNISWAP_ROUTER }};
    address public constant FEED_REGISTRY = {{ FEED_REGISTRY }};
    address public constant GMX_ROUTER = {{ GMX_ROUTER }};
    address public constant BRIDGE_CURRENCY = {{ BRIDGE_CURRENCY }};
    address public constant ARBITRUM_L1_INBOX = {{ ARBITRUM_L1_INBOX }};
    address public constant ARBITRUM_L1_OUTBOX = {{ ARBITRUM_L1_OUTBOX}};
    address public constant ARBITRUM_L1_GATEWAY_ROUTER = {{ ARBITRUM_L1_GATEWAY_ROUTER }};
    address public constant ARBITRUM_L2_GATEWAY_ROUTER = {{ ARBITRUM_L2_GATEWAY_ROUTER }};
    address public constant ARBITRUM_L2_ADAM = {{ ARBITRUM_L2_ADAM }};

    uint public constant BLOCK_NUMBER_IN_SECOND = {{ BLOCK_NUMBER_IN_SECOND }};
    uint public constant STALE_PRICE_DELAY = {{ STALE_PRICE_DELAY }};
}
