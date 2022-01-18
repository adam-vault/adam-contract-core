// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "../interface/IAdamOwned.sol";

contract AdamOwned is IAdamOwned {
    address private _adam;

    modifier onlyAdam() {
        require (_adam == msg.sender, "access denied");
        _;
    }

    function setAdam(address __adam) public override {
        require (_adam == address(0), "Adam is set");
        _adam = __adam;
    }

    function adam() public view override returns (address) {
        return _adam;
    }
}