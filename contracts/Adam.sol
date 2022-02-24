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
    event CreateDao(address dao, string name, address creator);

    address public daoImplementation;
    address public membershipImplementation;

    address[] public daos;
    mapping(address => bool) public daoRegistry;

    function initialize(address _daoImplementation, address _membershipImplementation) public initializer {
        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
    }
    function _authorizeUpgrade(address) internal override initializer {}

    function totalDaos() public view returns (uint256) {
        return daos.length;
    }

    function createDao(string calldata _name) public returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");

        IMembership(address(_membership)).initialize(address(_dao), _name);
        IDao(address(_dao)).initialize(address(this),  msg.sender, _name, address(_membership));

        daos.push(address(_dao));
        daoRegistry[address(_dao)] = true;
        emit CreateDao(address(_dao), _name, msg.sender);
        return address(_dao);
    }
}