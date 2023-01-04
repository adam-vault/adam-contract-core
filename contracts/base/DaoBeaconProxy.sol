// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import "../lib/Constant.sol";
import "../DaoBeacon.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "../interface/IDaoBeacon.sol";

contract DaoBeaconProxy is Proxy {
    bytes32 private constant _BEACON_SLOT = bytes32(keccak256("adam.proxy.beacon.slot"));

    constructor(address _daoBeacon, bytes memory _data) payable {
        _setBeacon(_daoBeacon);
        address impl = IDaoBeacon(_daoBeacon).implementation(Constant.BEACON_NAME_DAO);
        require(impl != address(0), "impl not found");

        if (_data.length > 0) {
            Address.functionDelegateCall(impl, _data);
        }
    }

    function _setBeacon(address newBeacon) private {
        require(Address.isContract(newBeacon), "ERC1967: new beacon is not a contract");
        StorageSlot.getAddressSlot(_BEACON_SLOT).value = newBeacon;
    }

    function _getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(_BEACON_SLOT).value;
    }

    function daoBeacon() external view returns (address) {
        return _getBeacon();
    }

    function _implementation() internal view virtual override returns (address) {
        return IDaoBeacon(_getBeacon()).implementation(Constant.BEACON_NAME_DAO);
    }
}

