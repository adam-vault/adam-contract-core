// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract MockAggregatorV3 {
    uint8 public decimals;
    int256 private price;

    constructor() {
        decimals = 18;
    }

    function setDecimals(uint8 _decimals) public {
        decimals = _decimals;
    }

    function setPrice(int256 _price) public {
        price = _price;
    }

    function latestRoundData()
    external
    view
    returns (
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
    ) {
        return (18446744073709580067, price, 1649757960, 1649757960, 18446744073709580067);
    }
}
