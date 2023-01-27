// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./lib/Constant.sol";
import "./interface/IDao.sol";
import "./interface/IDaoBeacon.sol";
import "./interface/IMembership.sol";
import "./interface/ILiquidPool.sol";
import "./interface/IAccountingSystem.sol";
import "./base/DaoBeaconProxy.sol";
import "./base/DaoChildBeaconProxy.sol";

contract Adam is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using AddressUpgradeable for address;

    address public daoBeacon; // latest daoBeacon;
    mapping(address => uint256) public daoBeaconIndex;
    mapping(address => bool) public daos;
    mapping(address => bool) public budgetApprovals;
    mapping(address => bool) public priceGateways;

    event CreateDao(address indexed dao, address creator, address referer);
    event SetDaoBeacon(address indexed _daoBeacon, uint256 indexed _index, string _name);
    event WhitelistBudgetApproval(address budgetApproval);
    event AbandonBudgetApproval(address budgetApproval);
    event WhitelistPriceGateway(address priceGateway);
    event AbandonPriceGateway(address priceGateway);


    error InvalidContract(address _contract);
    error DaoBeaconAlreadyInitialized(address _daoBeacon);
    error BudgetApprovalAlreadyInitialized(address budgetApproval);
    error BudgetApprovalNotFound(address budgetApproval);
    error PriceGatewayAlreadyInitialized(address priceGateway);
    error PriceGatewayNotFound(address priceGateway);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }
    
    function initialize(address _daoBeacon, address[] calldata _budgetApprovalImplementations, address[] calldata _priceGatewayImplementations)
        external initializer
    {
        __Ownable_init();
        whitelistBudgetApprovals(_budgetApprovalImplementations);
        whitelistPriceGateways(_priceGatewayImplementations);
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

    function whitelistPriceGateways(address[] calldata _priceGateways) public onlyOwner {
        for(uint i = 0; i < _priceGateways.length; i++) {
            address pg = _priceGateways[i];

            if (!pg.isContract()) {
                revert InvalidContract(pg);
            }
            if (priceGateways[pg] == true) {
                revert PriceGatewayAlreadyInitialized(pg);
            }

            priceGateways[pg] = true;
            emit WhitelistPriceGateway(pg);
        }
    }

    function abandonPriceGateways(address[] calldata _priceGateways) public onlyOwner {
        for(uint i = 0; i < _priceGateways.length; i++) {
            address pg = _priceGateways[i];

            if (priceGateways[pg] == false) {
                revert PriceGatewayNotFound(pg);
            }

            priceGateways[pg] = false;
            emit AbandonPriceGateway(pg);
        }
    }

    function createDao(
        string calldata  _name,
        string calldata _description,
        address _baseCurrency,
        bytes[] calldata _data,
        address _referer
    ) external returns (address) {

        DaoBeaconProxy _dao = new DaoBeaconProxy(daoBeacon, "");
        IDao(payable(address(_dao))).initialize(
            msg.sender,
            _name,
            _description,
            _baseCurrency,
            _data
        );

        daos[address(_dao)] = true;

        emit CreateDao(address(_dao), msg.sender, _referer);
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
        emit SetDaoBeacon(_daoBeacon, index, IDaoBeacon(_daoBeacon).name());
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}

    uint256[50] private __gap;
}