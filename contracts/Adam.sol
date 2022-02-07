// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";
import "./interface/IManageable.sol";
import "./interface/IAdam.sol";
import "./interface/ITreasury.sol";
import "hardhat/console.sol";

contract Adam is IAdam, Initializable, UUPSUpgradeable {
    IBeacon public strategyBeacon;
    IBeacon public assetManagerBeacon;

    address[] public assetManagers;
    address[] private _strategies;
    address[] public publicStrategies;

    mapping(address => bool) public override assetManagerRegistry;
    mapping(address => bool) public strategyRegistry;

    event CreateAssetManager(address assetManager, string name, address creator);
    event CreateStrategy(address assetManager, address strategy, string name, address creator, bool isPrivate);
    
    function initialize(address _assetManager, address _strategy) public initializer {
        assetManagerBeacon = new UpgradeableBeacon(_assetManager);
        strategyBeacon = new UpgradeableBeacon(_strategy);
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
        BeaconProxy _am = new BeaconProxy(address(assetManagerBeacon), "");
        address amAddress = address(_am);
        IAssetManager(amAddress).initialize(address(this), msg.sender, _name);

        assetManagers.push(amAddress);
        assetManagerRegistry[amAddress] = true;
        emit CreateAssetManager(amAddress, _name, msg.sender);
        return amAddress;
    }

    function createStrategy(address _assetManager, string calldata _name, bool _private) public returns (address) {
        require(assetManagerRegistry[_assetManager], "not assetManager");
        require(IManageable(_assetManager).isOwner(msg.sender), "access denied");
        
        BeaconProxy _s = new BeaconProxy(address(strategyBeacon), "");
        address strategyAddress = address(_s);
        IStrategy(strategyAddress).initialize(_assetManager, _name);

        _strategies.push(strategyAddress);
        strategyRegistry[strategyAddress] = true;
        IAssetManager(_assetManager).addStrategy(strategyAddress);
        if (!_private) {
            publicStrategies.push(strategyAddress);
        }
        emit CreateStrategy(_assetManager, strategyAddress, _name, msg.sender, _private);
        return strategyAddress;
    }

    function setTreasury(address treasury) external override {
        _treasury = ITreasury(treasury);
    }

    function getTreasury() external view override returns (address) {
        require(assetManagerRegistry[msg.sender], "not assetManager");
        
        return address(_treasury);
    }
}