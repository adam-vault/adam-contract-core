// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IAdam.sol";
import "./interface/IDao.sol";
import "./interface/IMembership.sol";
import "./interface/IMultiToken.sol";
import "hardhat/console.sol";

contract Adam is Initializable, UUPSUpgradeable {
    address public daoImplementation;
    address public membershipImplementation;
    address public multiTokenImplementation;
    address public governFactory;
    address public governImplementation;
    address public memberTokenImplementation;
    address public constantState;

    address[] public budgetApprovals;
    mapping(address => bool) public budgetApprovalRegistry;

    address[] public daos;
    mapping(address => bool) public daoRegistry;

    event CreateDao(address dao, string name, string description, address creator);
    event WhitelistBudgetApproval(address budgetApproval);

    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address _multiTokenImplementation,
        address _memberTokenImplementation,
        address[] calldata _budgetApprovalImplementations,
        address _governFactory,
        address _constantState
    ) public initializer {
        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
        multiTokenImplementation = _multiTokenImplementation;
        memberTokenImplementation = _memberTokenImplementation;
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        governFactory = _governFactory;
        constantState = _constantState;
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function setDaoImplementation(address _daoImplementation) public {
        daoImplementation = _daoImplementation;
    }
    function setMembershipImplementation(address _membershipImplementation) public {
        membershipImplementation = _membershipImplementation;
    }
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

    function createDao(IAdam.CreateDaoParams calldata params) public returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");
        ERC1967Proxy _multiToken = new ERC1967Proxy(multiTokenImplementation, "");
        IMembership(address(_membership)).initialize(address(_dao), params._name);
        IMultiToken(address(_multiToken)).initialize(address(_dao));

        IDao(payable(address(_dao))).initialize(
            IDao.InitializeParams(
                msg.sender,
                address(_membership),
                address(_multiToken),
                address(governFactory),
                address(memberTokenImplementation),
                params._name,
                params._description,
                params._locktime,
                params.isCreateToken,
                params.budgetApproval,
                params.revokeBudgetApproval,
                params.general,
                params.daoSettingApproval,
                params.tokenInfo,
                params.tokenAmount,
                IDao.DaoSetting(
                    params.minDepositAmount,
                    params.minMemberTokenToJoin
                )
            )
        );

        daos.push(address(_dao));
        daoRegistry[address(_dao)] = true;
        emit CreateDao(address(_dao), params._name, params._description, msg.sender);
        return address(_dao);
    }
}