// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "hardhat/console.sol";

contract Adam is IAdam, Initializable, UUPSUpgradeable {
    address public daoImplementation;
    address public membershipImplementation;
    mapping(address => bool) public override blankets;
    address[] public daos;
    mapping(address => bool) public daoRegistry;

    event CreateDao(address dao, string name, string symbol, string description, address creator);
    event WhitelistBlanket(address blanket);

    function initialize(address _daoImplementation, address _membershipImplementation) public override initializer {
        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
    }
    function _authorizeUpgrade(address) internal override initializer {}

    function totalDaos() public view override returns (uint256) {
        return daos.length;
    }

    function whitelistBlanket(address blanket) public {
        require(blankets[blanket] == false, "blanket already whitelisted");
        blankets[blanket] = true;
        emit WhitelistBlanket(blanket);
    }

    function createDao(string calldata _name, string calldata _symbol, string calldata _description, uint256 _locktime, address[] calldata _depositTokens) public override returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");

        IMembership(address(_membership)).initialize(address(_dao), _name, _symbol);
        IDao(address(_dao)).initialize(address(this),  msg.sender, _name, _symbol, address(_membership), _locktime, _depositTokens);

        daos.push(address(_dao));
        daoRegistry[address(_dao)] = true;
        emit CreateDao(address(_dao), _name, _symbol, _description, msg.sender);
        return address(_dao);
    }
}