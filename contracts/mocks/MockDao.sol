// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../Dao.sol";

contract MockDao is Dao {
    function v2() public pure returns (bool) {
        return true;
    }
}