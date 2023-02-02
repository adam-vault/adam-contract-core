// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

interface IPriceGateway {
    function isSupportedPair(address asset, address base)
        external
        view
        returns (bool);

    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) external view returns (uint256);
}