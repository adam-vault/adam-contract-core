// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../base/PriceResolver.sol";

contract MockPriceResolver is PriceResolver {
    address private _baseCurrency;
    function baseCurrency() public view override returns (address) {
        return _baseCurrency;
    }
    function setBaseCurrency(address asset) public {
        _baseCurrency = asset;
    }
}