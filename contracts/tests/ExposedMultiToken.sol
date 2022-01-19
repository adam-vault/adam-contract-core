// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "../base/MultiToken.sol";

contract ExposedMultiToken is MultiToken {
    constructor(string memory _postfix) MultiToken(_postfix) {}
    function createToken(address _contractAddress, string memory _name, uint256 _decimal) public returns (uint) {
        return _createToken(_contractAddress, _name, _decimal);
    }
}