// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interface/IStrategyFactory.sol";
import "./base/AdamOwned.sol";
import "./Strategy.sol";

contract StrategyFactory is AdamOwned, IStrategyFactory, Initializable, UUPSUpgradeable {
    function create(address _assetManager, string calldata _name) public onlyAdam override returns (address) {
        Strategy _s = new Strategy(_assetManager, _name);
        return address(_s);
    }
    function _authorizeUpgrade(address) internal override onlyAdam {}


}