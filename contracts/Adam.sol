// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IDao.sol";
import "./interface/IMembership.sol";
import "./interface/ILiquidPool.sol";
import "./interface/IDepositPool.sol";
import "hardhat/console.sol";

contract Adam is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    struct CreateDaoParams {
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] budgetApproval;
        uint256[4] revokeBudgetApproval;
        uint256[4] general;
        uint256[4] daoSettingApproval;
        string[] tokenInfo;
        uint256 tokenAmount;
        uint256 minDepositAmount;
        uint256 minTokenToAdmit;
        address admissionToken;
        address[] depositTokens;
        bool mintMemberToken;
        address baseCurrency;
    }

    address public feedRegistry;
    address public daoImplementation;
    address public membershipImplementation;
    address public liquidPoolImplementation;
    address public depositPoolImplementation;
    address public optInPoolImplementation;
    address public governFactory;
    address public team;
    address public governImplementation;
    address public memberTokenImplementation;
    address public constantState;
    mapping(address => bool) public budgetApprovals;
    mapping(address => bool) public daos;

    event CreateDao(address dao, string name, string description, address creator);
    event WhitelistBudgetApproval(address budgetApproval);

    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _depositPoolImplementation,
        address _optInPoolImplementation,
        address[] calldata _budgetApprovalImplementations,
        address _governFactory,
        address _constantState,
        address _feedRegistry,
        address _team
    )
        public initializer
    {
        __Ownable_init();

        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
        liquidPoolImplementation = _liquidPoolImplementation;
        memberTokenImplementation = _memberTokenImplementation;
        depositPoolImplementation = _depositPoolImplementation;
        optInPoolImplementation = _optInPoolImplementation;
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        governFactory = _governFactory;
        constantState = _constantState;
        feedRegistry = _feedRegistry;
        team = _team;
    }

    function setDaoImplementation(address _daoImplementation) public {
        daoImplementation = _daoImplementation;
    }

    function setMembershipImplementation(address _membershipImplementation) public {
        membershipImplementation = _membershipImplementation;
    }
    function setDepositPoolImplementation(address _depositPoolImplementation) public {
        depositPoolImplementation = _depositPoolImplementation;
    }

    function setOptInPoolImplementation(address _optInPoolImplementation) public {
        optInPoolImplementation = _optInPoolImplementation;
    }

    function whitelistBudgetApprovals(address[] calldata _budgetApprovals) public {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovals[_budgetApprovals[i]] == false, "budget approval already whitelisted");
            budgetApprovals[_budgetApprovals[i]] = true;
            emit WhitelistBudgetApproval(_budgetApprovals[i]);
        }
    }

    function createDao(CreateDaoParams calldata params) public returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");
        ERC1967Proxy _liquidPool = new ERC1967Proxy(liquidPoolImplementation, "");
        ERC1967Proxy _depositPool = new ERC1967Proxy(depositPoolImplementation, "");

        daos[address(_dao)] = true;

        IMembership(address(_membership)).initialize(
            address(_dao),
            params._name
        );
        ILiquidPool(payable(address(_liquidPool))).initialize(
            address(_dao),
            params.depositTokens,
            params.baseCurrency
        );
        IDepositPool(payable(address(_depositPool))).initialize(
            address(_dao),
            params.depositTokens,
            params.baseCurrency
        );
        IDao(payable(address(_dao))).initialize(
            IDao.InitializeParams(
                msg.sender,
                address(_membership),
                address(_liquidPool),
                address(_depositPool),
                address(params.admissionToken),
                address(governFactory),
                address(team),
                address(memberTokenImplementation),
                address(optInPoolImplementation),
                params._name,
                params._description,
                params._locktime,
                params.budgetApproval,
                params.revokeBudgetApproval,
                params.general,
                params.daoSettingApproval,
                params.tokenInfo,
                params.tokenAmount,
                IDao.DaoSetting(
                    params.minDepositAmount,
                    params.minTokenToAdmit
                ),
                params.depositTokens,
                params.mintMemberToken
            )
        );

        emit CreateDao(address(_dao), params._name, params._description, msg.sender);
        return address(_dao);
    }
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}