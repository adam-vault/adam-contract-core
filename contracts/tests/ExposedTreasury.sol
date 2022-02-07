// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../treasury/TestTreasury.sol";

contract ExposedTreasury is TestTreasury {
    function exposedGetXUsdPrice(string memory coin) public pure returns (int256) {
        return getXUsdPrice(coin);
    }
}