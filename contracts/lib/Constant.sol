// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    address public constant WETH_ADDRESS = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant FEED_REGISTRY = 0xf948fC3D6c2c2C866f622c79612bB4E8708883cF;
    uint public constant BLOCK_NUMBER_IN_SECOND = 13;
    uint public constant STALE_PRICE_DELAY = 86400;
}
