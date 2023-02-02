// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

import "../lib/Constant.sol";
import "../interface/IDaoBeacon.sol";

contract DaoBeaconProxy is Proxy {
    bytes32 private constant _BEACON_SLOT = bytes32(keccak256("adam.proxy.beacon.slot"));
    
    error InvalidContract(address _contract);
    constructor(address _daoBeacon, bytes memory _data) payable {
        _setBeacon(_daoBeacon);
        address impl = IDaoBeacon(_daoBeacon).implementation(Constant.BEACON_NAME_DAO);

        if (!Address.isContract(impl)) {
            revert InvalidContract(impl);
        }

        if (_data.length > 0) {
            Address.functionDelegateCall(impl, _data);
        }
    }

    function daoBeacon() external view returns (address) {
        return _getBeacon();
    }

    function _setBeacon(address newBeacon) private {
        if (!Address.isContract(newBeacon)) {
            revert InvalidContract(newBeacon);
        }
        StorageSlot.getAddressSlot(_BEACON_SLOT).value = newBeacon;
    }

    function _getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(_BEACON_SLOT).value;
    }

    function _implementation() internal view virtual override returns (address) {
        return IDaoBeacon(_getBeacon()).implementation(Constant.BEACON_NAME_DAO);
    }
}

