// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./lib/Constant.sol";
import "./interface/IDao.sol";
import "./interface/IMembership.sol";
import "./interface/ILiquidPool.sol";
import "./base/DaoBeaconProxy.sol";
import "./base/DaoChildBeaconProxy.sol";

error InvalidContract(address _contract);
error DaoBeaconAlreadyInitialized(address _daoBeacon);
error BudgetApprovalAlreadyInitialized(address _budgetApproval);
error BudgetApprovalNotFound(address _budgetApproval);

contract Adam is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using AddressUpgradeable for address;

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

    event CreateDao(address indexed dao, address creator, address referer);
    event WhitelistBudgetApproval(address budgetApproval);
    event AbandonBudgetApproval(address budgetApproval);
    event SetDaoBeacon(address _daoBeacon, uint256 _index);

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
            address ba = _budgetApprovals[i];

            if (!ba.isContract()) {
                revert InvalidContract(ba);
            }

            if (budgetApprovals[ba] == true) {
                revert BudgetApprovalAlreadyInitialized(ba);
            }

            budgetApprovals[_budgetApprovals[i]] = true;
            emit WhitelistBudgetApproval(_budgetApprovals[i]);
        }
    }

    function abandonBudgetApprovals(address[] calldata _budgetApprovals) public onlyOwner {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            address ba = _budgetApprovals[i];

            if (budgetApprovals[ba] == false) {
                revert BudgetApprovalNotFound(ba);
            }

            budgetApprovals[ba] = false;
            emit AbandonBudgetApproval(ba);
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

        emit CreateDao(address(_dao), msg.sender, params._referer);
        return address(_dao);
    }
    
    function setDaoBeacon(address _daoBeacon) public onlyOwner {
        _setDaoBeacon(_daoBeacon);
    }
    function _setDaoBeacon(address _daoBeacon) internal {
        if (!_daoBeacon.isContract()) {
            revert InvalidContract(_daoBeacon);
        }
        if (daoBeaconIndex[_daoBeacon] > 0) {
            revert DaoBeaconAlreadyInitialized(_daoBeacon);
        }

        uint256 index = daoBeaconIndex[daoBeacon] + 1;
        daoBeacon = _daoBeacon;
        daoBeaconIndex[_daoBeacon] = index;
        emit SetDaoBeacon(_daoBeacon, index);
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}

    uint256[50] private __gap;
}