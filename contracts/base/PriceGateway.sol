// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

contract PriceGateway {
    function isSupportedPair(address asset, address base) public virtual {}

    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) public virtual {}

    uint256[50] private __gap;
}
