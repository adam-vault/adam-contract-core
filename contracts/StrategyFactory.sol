// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interface/IStrategyFactory.sol";
import "./base/AdamOwned.sol";
import "./Strategy.sol";

contract StrategyFactory is AdamOwned, IStrategyFactory, Initializable, UUPSUpgradeable {
    function create(address _assetManager, string calldata _name) public onlyAdam override returns (address) {
        Strategy _s = new Strategy();
        ERC1967Proxy p = new ERC1967Proxy(address(_s), "");
        Strategy(address(p)).initialize(_assetManager, _name);
        return address(p);
    }
    function _authorizeUpgrade(address) internal override onlyAdam {}

}