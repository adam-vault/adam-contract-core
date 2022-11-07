// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant FEED_REGISTRY = 0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf;
    address public constant GMX_ROUTER = address(0);
    address public constant BRIDGE_CURRENCY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant ARBITRUM_L1_INBOX = 0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f;
    address public constant ARBITRUM_L1_OUTBOX = 0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840;
    address public constant ARBITRUM_L1_GATEWAY_ROUTER = 0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef;
    address public constant ARBITRUM_L2_GATEWAY_ROUTER = address(0);

    uint public constant BLOCK_NUMBER_IN_SECOND = 12;
    uint public constant STALE_PRICE_DELAY = 86400;
}
