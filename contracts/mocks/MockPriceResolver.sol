// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../base/PriceResolver.sol";

contract MockPriceResolver is PriceResolver {
    function setBaseCurrency(address asset) public {
        baseCurrency = asset;
    }
}