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

contract Blanket is Initializable, UUPSUpgradeable {
    address public executor;
    address public dao;
    address public to;

    function initialize(address _dao, address _executor) public initializer {
        dao = _dao;
        executor = _executor;
    }
    function _authorizeUpgrade(address) internal override initializer {}
    function execute(uint256 amount) public {
        require(msg.sender == executor, "not executor");
        // uint256 count = IMembership(IDao(dao).membership()).totalSupply();
        
        
    }
}