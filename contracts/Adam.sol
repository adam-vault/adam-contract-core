// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IDao.sol";
import "./interface/IMembership.sol";
import "./interface/ILiquidPool.sol";
import "./interface/IGovernFactory.sol";
import "hardhat/console.sol";

contract Adam is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    struct CreateDaoParams {
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] generalGovernSetting;
        string[] tokenInfo;
        uint256 tokenAmount;
        uint256 minDepositAmount;
        address[] depositTokens;
        bool mintMemberToken;
        IDao.AdmissionToken[] admissionTokens;
        address baseCurrency;
        string logoCID;
        uint256 maxMemberLimit;
    }

    struct AdmissionToken {
        address token;
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool isMemberToken;
    }

    address public daoImplementation;
    address public membershipImplementation;
    address public liquidPoolImplementation;
    address public memberTokenImplementation;

    address public governFactory;
    address public team;

    mapping(address => bool) public budgetApprovals;
    mapping(address => bool) public daos;

    event CreateDao(address indexed dao, string name, string description, address creator);
    event WhitelistBudgetApproval(address budgetApproval);
    event AbandonBudgetApproval(address budgetApproval);
    event ImplementationUpgrade(
        uint256 indexed versionId,
        address daoImplementation,
        address membershipImplementation,
        address liquidPoolImplementation,
        address memberTokenImplementation,
        address governImplementation,
        address adamImplementation,
        string description
    );
    
    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address[] calldata _budgetApprovalImplementations,
        address _governFactory,
        address _team
    )
        public initializer
    {
        __Ownable_init();
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        governFactory = _governFactory;
        team = _team;

        upgradeImplementations(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            IGovernFactory(governFactory).governImplementation(),
            "");
    }

    function whitelistBudgetApprovals(address[] calldata _budgetApprovals) public onlyOwner {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovals[_budgetApprovals[i]] == false, "budget approval already whitelisted");
            budgetApprovals[_budgetApprovals[i]] = true;
            emit WhitelistBudgetApproval(_budgetApprovals[i]);
        }
    }

    function abandonBudgetApprovals(address[] calldata _budgetApprovals) public onlyOwner {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovals[_budgetApprovals[i]] == true, "Budget approval not exist");
            budgetApprovals[_budgetApprovals[i]] = false;
            emit AbandonBudgetApproval(_budgetApprovals[i]);
        }
    }

    function createDao(CreateDaoParams calldata params) public returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");
        ERC1967Proxy _liquidPool = new ERC1967Proxy(liquidPoolImplementation, "");

        daos[address(_dao)] = true;

        IMembership(address(_membership)).initialize(
            address(_dao),
            params._name,
            params.maxMemberLimit
        );
        ILiquidPool(payable(address(_liquidPool))).initialize(
            address(_dao),
            params.depositTokens,
            params.baseCurrency
        );
        IDao(payable(address(_dao))).initialize(
            IDao.InitializeParams(
                msg.sender,
                address(_membership),
                address(_liquidPool),
                address(governFactory),
                address(team),
                address(memberTokenImplementation),
                params._name,
                params._description,
                params._locktime,
                params.generalGovernSetting,
                params.tokenInfo,
                params.tokenAmount,
                IDao.DaoSetting(
                    params.minDepositAmount
                ),
                params.depositTokens,
                params.mintMemberToken,
                params.admissionTokens,
                params.baseCurrency,
                params.logoCID
            )
        );

        emit CreateDao(address(_dao), params._name, params._description, msg.sender);
        return address(_dao);
    }
    
    function hashVersion(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _governImplementation
    ) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _governImplementation
       )));
    }

    function upgradeImplementations(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _governImplementation,
        string memory description
    ) public onlyOwner {
        require(IGovernFactory(governFactory).governImplementation() == _governImplementation, "governImpl not match");

        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
        liquidPoolImplementation = _liquidPoolImplementation;
        memberTokenImplementation = _memberTokenImplementation;

        uint256 versionId = hashVersion(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _governImplementation
        );

        emit ImplementationUpgrade(
            versionId,
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _governImplementation,
            _getImplementation(),
            description
        );
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}