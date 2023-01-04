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
import "./interface/IAccountSystem.sol";



contract Adam is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    struct CreateDaoParams {
        string _name;
        string _description;
        address baseCurrency;
        uint256 maxMemberLimit;
        string _memberTokenName;
        string _memberTokenSymbol;
        address[] depositTokens;
        address _referer;
        address[] _priceGateways;
    }

    address public daoImplementation;
    address public membershipImplementation;
    address public liquidPoolImplementation;
    address public memberTokenImplementation;

    address public governFactory;
    address public team;

    mapping(address => bool) public budgetApprovals;
    mapping(address => bool) public daos;

    // V2
    address public accountSystemImplementation;
    mapping(address => bool) public priceGateways;

    event CreateDao(address indexed dao, string name, string description, address creator, address referer);
    event WhitelistBudgetApproval(address budgetApproval);
    event AbandonBudgetApproval(address budgetApproval);

    event WhitelistPriceGateway(address priceGateway);
    event AbandonPriceGateway(address priceGateway);

    event ImplementationUpgrade(
        uint256 indexed versionId,
        address daoImplementation,
        address membershipImplementation,
        address liquidPoolImplementation,
        address memberTokenImplementation,
        address governImplementation,
        address adamImplementation,
        address accountSystemImplementation,
        string description
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }
    
    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _accountSystemImplementation,
        address[] calldata _budgetApprovalImplementations,
        address[] calldata _priceGatewayImplementations,
        address _governFactory,
        address _team
    )
        external initializer
    {
        __Ownable_init();
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        whitelistPriceGateways(_priceGatewayImplementations);
        require(_governFactory != address(0), "governFactory is null");
        require(_team != address(0), "team is null");
        governFactory = _governFactory;
        team = _team;

        upgradeImplementations(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _accountSystemImplementation,
            IGovernFactory(governFactory).governImplementation(),
            "");
    }

    function whitelistBudgetApprovals(address[] calldata _budgetApprovals) public onlyOwner {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(_budgetApprovals[i] != address(0), "budget approval is null");
            require(budgetApprovals[_budgetApprovals[i]] == false, "budget approval already whitelisted");
            budgetApprovals[_budgetApprovals[i]] = true;
            emit WhitelistBudgetApproval(_budgetApprovals[i]);
        }
    }

    function abandonBudgetApprovals(address[] calldata _budgetApprovals) public onlyOwner {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovals[_budgetApprovals[i]] == true, "budget approval not exist");
            budgetApprovals[_budgetApprovals[i]] = false;
            emit AbandonBudgetApproval(_budgetApprovals[i]);
        }
    }

    function whitelistPriceGateways(address[] calldata _priceGateways) public onlyOwner {
        for(uint i = 0; i < _priceGateways.length; i++) {
            require(_priceGateways[i] != address(0), "Price Gateway is null");
            require(priceGateways[_priceGateways[i]] == false, "Price Gateway already whitelisted");
            priceGateways[_priceGateways[i]] = true;
            emit WhitelistPriceGateway(_priceGateways[i]);
        }
    }

    function abandonPriceGateways(address[] calldata _priceGateways) public onlyOwner {
        for(uint i = 0; i < _priceGateways.length; i++) {
            require(priceGateways[_priceGateways[i]] == true, "budget approval not exist");
            priceGateways[_priceGateways[i]] = false;
            emit AbandonPriceGateway(_priceGateways[i]);
        }
    }


    function createDao(CreateDaoParams memory params, bytes[] memory data) external returns (address) {
        ERC1967Proxy _dao = new ERC1967Proxy(daoImplementation, "");
        ERC1967Proxy _membership = new ERC1967Proxy(membershipImplementation, "");
        ERC1967Proxy _liquidPool = new ERC1967Proxy(liquidPoolImplementation, "");
        ERC1967Proxy _accountSystem = new ERC1967Proxy(accountSystemImplementation, "");

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
        IAccountSystem(payable(address(_accountSystem))).initialize(
            address(_dao),
            params._priceGateways
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
                params.baseCurrency,
                params._memberTokenName,
                params._memberTokenSymbol,
                params.depositTokens,
                address(_accountSystem)
            ),
            data
        );

        emit CreateDao(address(_dao), params._name, params._description, msg.sender, params._referer);
        return address(_dao);
    }
    
    function hashVersion(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _governImplementation,
        address _accountSystemImplementation
    ) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _accountSystemImplementation,
            _governImplementation
       )));
    }

    function upgradeImplementations(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _accountSystemImplementation,
        address _governImplementation,
        string memory description
    ) public onlyOwner {
        require(_daoImplementation != address(0), "daoImpl is null");
        require(_membershipImplementation != address(0), "membershipImpl is null");
        require(_liquidPoolImplementation != address(0), "liquidPoolImpl is null");
        require(_memberTokenImplementation != address(0), "memberTokenImpl is null");
        require(_accountSystemImplementation != address(0), "accountSystemImpl is null");
        require(IGovernFactory(governFactory).governImplementation() == _governImplementation, "governImpl not match");

        daoImplementation = _daoImplementation;
        membershipImplementation = _membershipImplementation;
        liquidPoolImplementation = _liquidPoolImplementation;
        memberTokenImplementation = _memberTokenImplementation;
        accountSystemImplementation = _accountSystemImplementation;

        uint256 versionId = hashVersion(
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _governImplementation,
            _accountSystemImplementation
        );

        emit ImplementationUpgrade(
            versionId,
            _daoImplementation,
            _membershipImplementation,
            _liquidPoolImplementation,
            _memberTokenImplementation,
            _governImplementation,
            _accountSystemImplementation,
            _getImplementation(),
            description
        );
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}

    uint256[50] private __gap;
}