// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../DaoV2.sol";

contract MockDaoV2 is DaoV2 {
    function v2() public pure returns (bool) {
        return true;
    }
    function exposedCreateMemberToken(address imple, string calldata name, string calldata symbol, uint amount) public {
        _createMemberToken(imple, name, symbol);
    }
    function exposedMintMemberToken(uint amount) public {
        _mintMemberToken(amount);
    }

    function exposedTransferMemberToken(address to, uint amount) public {
        _transferMemberToken(to, amount);
    }
}