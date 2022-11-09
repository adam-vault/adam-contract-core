// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../interface/IPriceRouter.sol";
import "../base/PriceResolver.sol";

contract MockPriceResolver is PriceResolver {
    IPriceRouter private _priceRouter;

    function initialize(
        address __priceRouter, address __baseCurrency
    ) external initializer {
        __PriceResolver_init(__priceRouter, __baseCurrency);
    }
}