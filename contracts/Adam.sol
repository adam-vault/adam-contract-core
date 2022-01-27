// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interface/IAssetManagerFactory.sol";
import "./interface/IStrategyFactory.sol";
import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";
import "./interface/IAdamOwned.sol";
import "./interface/IManageable.sol";
import "./interface/IAdam.sol";
import "hardhat/console.sol";

contract Adam is IAdam, Initializable, UUPSUpgradeable {
    IAssetManagerFactory public assetManagerFactory;
    IStrategyFactory public strategyFactory;

    address[] public assetManagers;
    address[] private _strategies;
    address[] public publicStrategies;

    mapping(address => bool) public override assetManagerRegistry;
    mapping(address => bool) public strategyRegistry;

    event CreateAssetManager(address assetManager, string name, address creator);
    event CreateStrategy(address assetManager, address strategy, string name, address creator, bool isPrivate);
    
    function initialize(address _assetManagerFactory, address _strategyFactory) public initializer {
        assetManagerFactory = IAssetManagerFactory(_assetManagerFactory);
        strategyFactory = IStrategyFactory(_strategyFactory);
        IAdamOwned(_assetManagerFactory).setAdam(address(this));
        IAdamOwned(_strategyFactory).setAdam(address(this));
    }
    function _authorizeUpgrade(address) internal override initializer {}

    function countAssetManagers() public view returns (uint256) {
        return assetManagers.length;
    }
    function countStrategies() public view returns (uint256) {
        return _strategies.length;
    }
    function countPublicStrategies() public view returns (uint256) {
        return publicStrategies.length;
    }

    function createAssetManager(string calldata _name) public returns (address) {
        address _am = assetManagerFactory.create(msg.sender, _name);
        assetManagers.push(_am);
        assetManagerRegistry[_am] = true;
        emit CreateAssetManager(_am, _name, msg.sender);
        return _am;
    }

    function createStrategy(address _assetManager, string calldata _name, bool _private) public returns (address) {
        require(assetManagerRegistry[_assetManager], "not assetManager");
        require(IManageable(_assetManager).isOwner(msg.sender), "access denied");

        address _s = strategyFactory.create(_assetManager, _name);
        _strategies.push(_s);
        strategyRegistry[_s] = true;
        IAssetManager(_assetManager).addStrategy(_s);
        if (!_private) {
            publicStrategies.push(_s);
        }
        emit CreateStrategy(_assetManager, _s, _name, msg.sender, _private);
        return _s;
    }
}