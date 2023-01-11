// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import "../lib/Constant.sol";
import "../DaoBeacon.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "../interface/IDaoBeaconProxy.sol";
import "../interface/IDaoBeacon.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract DaoChildBeaconProxy is Proxy {
    bytes32 private constant _DAO_SLOT = bytes32(keccak256("adam.proxy.daoProxy.slot"));
    bytes32 private constant _CONTRACT_NAME_SLOT = bytes32(keccak256("adam.proxy.contractName.slot"));

    error InvalidContract(address _contract);
    constructor(address _daoProxy, bytes32 _contractName, bytes memory _data) payable {
        StorageSlot.getAddressSlot(_DAO_SLOT).value = _daoProxy;
        StorageSlot.getBytes32Slot(_CONTRACT_NAME_SLOT).value = _contractName;

        address impl = IDaoBeacon(IDaoBeaconProxy(_daoProxy).daoBeacon()).implementation(_contractName);
        

        if (!Address.isContract(impl)) {
            revert InvalidContract(impl);
        }

        if (_data.length > 0) {
            Address.functionDelegateCall(impl, _data);
        }
    }

    function _getDaoProxy() internal view returns (address) {
        return StorageSlot.getAddressSlot(_DAO_SLOT).value;
    }

    function _getContractName() internal view returns (bytes32) {
        return StorageSlot.getBytes32Slot(_CONTRACT_NAME_SLOT).value;
    }

    function _daoBeacon() internal view returns (address) {
        return IDaoBeaconProxy(_getDaoProxy()).daoBeacon();
    }

    function _implementation() internal view virtual override returns (address) {
        return IDaoBeacon(_daoBeacon()).implementation(_getContractName());
    }
}