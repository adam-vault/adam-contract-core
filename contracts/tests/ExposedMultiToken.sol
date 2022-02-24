// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "../base/MultiToken.sol";

contract ExposedMultiToken is MultiToken {    
    function createToken(address _contractAddress) public returns (uint256) {
        return _createToken(_contractAddress);
    }
}