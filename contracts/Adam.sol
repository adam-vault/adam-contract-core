// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";
import "./interface/IManageable.sol";
import "./interface/IAdam.sol";
import "./interface/ITreasury.sol";
import "./interface/IManagementFee.sol";
import "hardhat/console.sol";

import "./Strategy.sol";

contract Adam is IAdam, Initializable, UUPSUpgradeable {
    address public strategy;
    address public assetManager;
    address public override treasury;

    address[] public assetManagers;
    address[] private _strategies;
    address[] public publicStrategies;

    mapping(address => bool) public override assetManagerRegistry;
    mapping(address => bool) public strategyRegistry;

    event CreateAssetManager(address assetManager, string name, address creator);
    event CreateStrategy(address assetManager, address strategy, string name, address creator, bool isPrivate);
    
    function initialize(address _assetManager, address _strategy) public initializer {
        assetManager = _assetManager;
        strategy = _strategy;
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
        ERC1967Proxy _am = new ERC1967Proxy(assetManager, "");
        IAssetManager(address(_am)).initialize(address(this), msg.sender, _name);
        return address(_am);
    }

    function _initStrategy(address _assetManager, string calldata _name) internal returns (address) {
        ERC1967Proxy _s = new ERC1967Proxy(strategy, "");
        IStrategy(address(_s)).initialize(_assetManager, _name, address(this));
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

    function setTreasury(address _treasury) external override {
        treasury = _treasury;
    }

    function redeemAllManagementFee() public {
        //require(msg.sender == "Admin")

        for (uint i = 0; i < countStrategies(); i ++) {
            address mgtFeeAccount = Strategy(_strategies[i]).mtFeeAccount();

            IManagementFee(mgtFeeAccount).redemption();
        }
    }
}