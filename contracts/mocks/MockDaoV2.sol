// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../Dao.sol";

contract MockDaoV2 is Dao {
    function v2() public pure returns (bool) {
        return true;
    }

    function exposedCreateMemberToken(string[] calldata tokenInfo, uint amount) public {
        _createMemberToken(tokenInfo, amount);
    }
}