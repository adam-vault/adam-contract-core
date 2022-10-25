// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "../Dao.sol";

contract MockDao is Dao {
    
    function exposedCreateMemberToken(address imple, string[] calldata tokenInfo, uint amount) public {
        _createMemberToken(imple, tokenInfo, amount);
    }
    function exposedMintMemberToken(uint amount) public {
        _mintMemberToken(amount);
    }

    function exposedTransferMemberToken(address to, uint amount) public {
        _transferMemberToken(to, amount);
    }
}