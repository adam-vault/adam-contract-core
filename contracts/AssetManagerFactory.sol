// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "./interface/IAssetManagerFactory.sol";
import "./base/AdamOwned.sol";
import "./AssetManager.sol";

contract AssetManagerFactory is AdamOwned {
    function create(address _creator, string calldata _name) public onlyAdam returns (address) {
        return address(new AssetManager(adam(), _creator, _name));
    }

}