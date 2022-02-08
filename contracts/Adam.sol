// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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
    ITreasury public _treasury;

    mapping(address => bool) public override assetManagerRegistry;
    mapping(address => bool) public strategyRegistry;

    event CreateAssetManager(address assetManager, string name, address creator);
    event CreateStrategy(address assetManager, address strategy, string name, address creator, bool isPrivate);
    
    function initialize(address _assetManager, address _strategy) public initializer {
        assetManagerBeacon = new UpgradeableBeacon(_assetManager);
        Ownable(address(assetManagerBeacon)).transferOwnership(msg.sender);
        strategyBeacon = new UpgradeableBeacon(_strategy);
        Ownable(address(strategyBeacon)).transferOwnership(msg.sender);
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

    function _addAssetManager(address _am) internal {
        assetManagers.push(_am);
        assetManagerRegistry[_am] = true;
    }

    function _addStrategy(address _s, bool _private) internal {
        _strategies.push(_s);
        strategyRegistry[_s] = true;
        if (!_private) {
            publicStrategies.push(_s);
        }
    }

    function _initAssetManager(string calldata _name) internal returns (address) {
        BeaconProxy _am = new BeaconProxy(address(assetManagerBeacon), "");
        IAssetManager(address(_am)).initialize(address(this), msg.sender, _name);
        return address(_am);
    }

    function _initStrategy(address _assetManager, string calldata _name) internal returns (address) {
        BeaconProxy _s = new BeaconProxy(address(strategyBeacon), "");
        IStrategy(address(_s)).initialize(_assetManager, _name);
        return address(_s);
    }

    function createAssetManager(string calldata _name) public returns (address) {
        address addr = _initAssetManager(_name);
        _addAssetManager(addr);
        emit CreateAssetManager(addr, _name, msg.sender);
        return addr;
    }

    function createStrategy(address _am, string calldata _name, bool _private) public returns (address) {
        require(assetManagerRegistry[_am], "not assetManager");
        require(IManageable(_am).isOwner(msg.sender), "access denied");
        
        address addr = _initStrategy(_am,  _name);
        _addStrategy(addr, _private);
        IAssetManager(_am).addStrategy(addr);

        emit CreateStrategy(_am, addr, _name, msg.sender, _private);
        return addr;
    }

    function setTreasury(address treasury) external override {
        _treasury = ITreasury(treasury);
    }

    function getTreasury() external view override returns (address) {
        require(assetManagerRegistry[msg.sender], "not assetManager");
        
        return address(_treasury);
    }
}