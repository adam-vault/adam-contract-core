// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/utils/Address.sol";
import "./lib/Constant.sol";


contract DaoBeacon {
    using Address for address;

    string public name;
    mapping(bytes32 => address) public implementation;

    struct ContractImpl {
        bytes32 contractName;
        address impl;
    }

    event DaoBeaconInit(string name, ContractImpl[] contractImpl);
    error InvalidContract(address _contract);
    error DaoImplementationNotExist();
    constructor(string memory _name, ContractImpl[] memory _contractImpl) {
        name = _name;
        for (uint256 i; i < _contractImpl.length; i++) {
            ContractImpl memory _ci = _contractImpl[i];
            address _impl = _ci.impl;
            if (!_impl.isContract()) {
                revert InvalidContract(_impl);
            }
            implementation[_ci.contractName] = _impl;
        }
        if (implementation[Constant.BEACON_NAME_DAO] == address(0)) {
            revert DaoImplementationNotExist();
        }
        emit DaoBeaconInit(name, _contractImpl);
    }
}
