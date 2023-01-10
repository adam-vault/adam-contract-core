// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./interface/IDao.sol";

import "./interface/IMembership.sol";
import "./interface/ILiquidPool.sol";
import "./base/DaoBeaconProxy.sol";
import "./DaoBeacon.sol";

import "./base/DaoChildBeaconProxy.sol";
import "./lib/Constant.sol";

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
    }
    
    mapping(address => bool) public budgetApprovals;
    mapping(address => bool) public daos;

    mapping(address => uint256) public daoBeaconIndex;
    address public daoBeacon; // latest daoBeacon;

    event CreateDao(address indexed dao, string name, string description, address creator, address referer);
    event WhitelistBudgetApproval(address budgetApproval);
    event AbandonBudgetApproval(address budgetApproval);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }
    
    function initialize(address _daoBeacon, address[] calldata _budgetApprovalImplementations)
        external initializer
    {
        __Ownable_init();
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        _setDaoBeacon(_daoBeacon);
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

    function createDao(CreateDaoParams memory params, bytes[] memory data) external returns (address) {
        DaoBeaconProxy _dao = new DaoBeaconProxy(daoBeacon, "");
        DaoChildBeaconProxy _membership = new DaoChildBeaconProxy(address(_dao), Constant.BEACON_NAME_MEMBERSHIP, "");
        DaoChildBeaconProxy _liquidPool = new DaoChildBeaconProxy(address(_dao), Constant.BEACON_NAME_LIQUID_POOL, "");
        DaoChildBeaconProxy _team = new DaoChildBeaconProxy(address(_dao), Constant.BEACON_NAME_TEAM, "");

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
                address(_team),
                params._name,
                params._description,
                params.baseCurrency,
                params._memberTokenName,
                params._memberTokenSymbol,
                params.depositTokens
            ),
            data
        );

        emit CreateDao(address(_dao), params._name, params._description, msg.sender, params._referer);
        return address(_dao);
    }
    
    function setDaoBeacon(address _daoBeacon) public onlyOwner {
        _setDaoBeacon(_daoBeacon);
    }
    function _setDaoBeacon(address _daoBeacon) internal {
        require(AddressUpgradeable.isContract(_daoBeacon), "not a contract");
        address lastDaoBeacon = daoBeacon;
        daoBeacon = _daoBeacon;
        if (lastDaoBeacon == address(0)) {
            daoBeaconIndex[_daoBeacon] = 1;
        } else {
            daoBeaconIndex[_daoBeacon] = daoBeaconIndex[lastDaoBeacon] + 1;
        }
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}

    uint256[50] private __gap;
}