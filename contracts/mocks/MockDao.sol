// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../Dao.sol";

contract MockDao is Dao {
    function v2() public pure returns (bool) {
        return true;
    }
    function exposedCreateMemberToken(address imple, string calldata name, string calldata symbol, uint amount) public {
        _createMemberToken(name, symbol);
    }
    function exposedMintMemberToken(uint amount) public {
        _mintMemberToken(amount);
    }

    function exposedTransferMemberToken(address to, uint amount) public {
       _transferMemberToken(to, amount);
    }
}