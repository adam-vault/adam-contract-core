// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    address public constant WETH_ADDRESS = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;
    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant FEED_REGISTRY = 0xaBC30D61D30f19de38897EBA18252868B3459664;
    address public constant GMX_ROUTER = 0x0000000000000000000000000000000000000000;
    address public constant BRIDGE_CURRENCY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant ARBITRUM_L1_INBOX = 0x6BEbC4925716945D46F0Ec336D5C2564F419682C;
    address public constant ARBITRUM_L1_OUTBOX = 0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049;
    address public constant ARBITRUM_L1_GATEWAY_ROUTER = 0x4c7708168395aEa569453Fc36862D2ffcDaC588c;
    address public constant ARBITRUM_L2_GATEWAY_ROUTER = 0x0000000000000000000000000000000000000000;
    address public constant ARBITRUM_L2_ADAM = 0xC103eafa82a3F9C4a7405f7787184aA6C1848F39;

    uint public constant BLOCK_NUMBER_IN_SECOND = 13;
    uint public constant STALE_PRICE_DELAY = 86400;
}
