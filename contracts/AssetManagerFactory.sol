// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interface/IAssetManagerFactory.sol";
import "./base/AdamOwned.sol";
import "./AssetManager.sol";

contract AssetManagerFactory is AdamOwned, Initializable, UUPSUpgradeable {
    function initialize() public initializer {
    }
    function create(address _creator, string calldata _name) public onlyAdam returns (address) {
        return address(new AssetManager(adam(), _creator, _name));
    }
    function _authorizeUpgrade(address) internal override onlyAdam {}

}