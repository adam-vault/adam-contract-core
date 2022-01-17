// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../base/Manageable.sol";

contract MockManageable is Manageable {
    function initOwner(address _owner) public {
        return _initOwner(_owner);
    }

    function addManager(address _address) public {
        return _addManager(_address);
    }
}