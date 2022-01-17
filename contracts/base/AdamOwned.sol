// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
contract AdamOwned {
    address private _adam;

    modifier onlyAdam() {
        require (_adam == msg.sender, "access denied");
        _;
    }

    function setAdam(address __adam) public {
        require (_adam == address(0), "Adam is set");
        _adam = __adam;
    }

    function adam() public view returns (address) {
        return _adam;
    }
}