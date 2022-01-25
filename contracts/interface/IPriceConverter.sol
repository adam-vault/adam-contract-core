// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IPriceConverter {
    function getDerivedPrice(int256 basePrice, uint8 baseDecimals, int256 quotePrice, uint8 quoteDecimals, uint8 _decimals)
        external
        pure
        returns (int256);

    function getExchangePrice(int256 basePrice, uint8 baseDecimals, int256 quotePrice, uint8 quoteDecimals, uint8 _decimals)
        external
        pure
        returns (int256);
}
