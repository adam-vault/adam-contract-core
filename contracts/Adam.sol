// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./interface/IAssetManagerFactory.sol";
import "./interface/IStrategyFactory.sol";
import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";
import "hardhat/console.sol";

contract Adam {
    IAssetManagerFactory public assetManagerFactory;
    IStrategyFactory public strategyFactory;

    address[] public assetManagers;
    address[] private strategies;
    address[] public publicStrategies;

    mapping(address => bool) public assetManagerRegistry;
    mapping(address => bool) public strategyRegistry;


    constructor (address _assetManagerFactory, address _strategyFactory) {
        assetManagerFactory = IAssetManagerFactory(_assetManagerFactory);
        strategyFactory = IStrategyFactory(_strategyFactory);
        assetManagerFactory.setAdam(address(this));
        strategyFactory.setAdam(address(this));
    }
    
    function countAssetManagers() public view returns (uint256) {
        return assetManagers.length;
    }
    function countPublicStrategies() public view returns (uint256) {
        return publicStrategies.length;
    }

    function createAssetManager(string calldata _name) public returns (address) {
        address _am = assetManagerFactory.create(msg.sender, _name);
        assetManagers.push(_am);
        assetManagerRegistry[_am] = true;
        return _am;
    }

    function createStrategy(address _assetManager, string calldata _name, bool _private) public returns (address) {
        require(assetManagerRegistry[_assetManager], "not assetManager");
        // TODO: to be fixed
        // require(IAssetManager(_assetManager).isOwner(msg.sender), "access denied");

        address _s = strategyFactory.create(_assetManager, _name);
        strategies.push(_s);
        strategyRegistry[_s] = true;
        if (!_private) {
            publicStrategies.push(_s);
        }
        return _s;
    }
}