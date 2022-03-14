// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IDao.sol";
import "./interface/IMembership.sol";
import "./interface/IGovernFactory.sol";
import "hardhat/console.sol";

contract Adam is Initializable, UUPSUpgradeable {
    address public daoImplementation;
    address public membershipImplementation;
    address public governFactoryImplementation;
    address public governImplementation;

    address[] public budgetApprovals;
    mapping(address => bool) public budgetApprovalRegistry;

    address[] public daos;
    mapping(address => bool) public daoRegistry;

    event CreateDao(address dao, string name, string symbol, string description, address creator);
    event WhitelistBudgetApproval(address budgetApproval);

    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address[] calldata _budgetApprovalImplementations,
        address _governFactoryImplementation,
        address _governImplementation
    ) public override initializer {
        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        governFactoryImplementation = _governFactoryImplementation;
        governImplementation = _governImplementation;
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function totalDaos() public view returns (uint256) {
        return daos.length;
    }

    function whitelistBudgetApprovals(address[] calldata _budgetApprovals) public {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovalRegistry[_budgetApprovals[i]] == false, "budget approval already whitelisted");
            budgetApprovals.push(_budgetApprovals[i]);
            budgetApprovalRegistry[_budgetApprovals[i]] = true;
            emit WhitelistBudgetApproval(_budgetApprovals[i]);
        }
    }

    function createDao(string calldata _name, string calldata _symbol, string calldata _description, uint256 _locktime, address[] calldata _depositTokens) public returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");
        ERC1967Proxy _governFactory = new ERC1967Proxy(governFactoryImplementation, "");

        IMembership(address(_membership)).initialize(address(_dao), _name, _symbol);
        IDao(address(_dao)).initialize(
            address(this), msg.sender, _name, _symbol, address(_membership), _locktime, _depositTokens, address(_governFactory)
        );
        IGovernFactory(address(_governFactory)).initialize(address(_dao), governImplementation);

        daos.push(address(_dao));
        daoRegistry[address(_dao)] = true;
        emit CreateDao(address(_dao), _name, _symbol, _description, msg.sender);
        return address(_dao);
    }
}