// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IAdam {
    error BudgetApprovalAlreadyInitialized(address budgetApproval);
    error BudgetApprovalNotFound(address budgetApproval);
    error DaoBeaconAlreadyInitialized(address _daoBeacon);
    error InvalidContract(address _contract);
    error PriceGatewayAlreadyInitialized(address priceGateway);
    error PriceGatewayNotFound(address priceGateway);
    event AbandonBudgetApproval(address budgetApproval);
    event AbandonPriceGateway(address priceGateway);
    event AdminChanged(address previousAdmin, address newAdmin);
    event BeaconUpgraded(address indexed beacon);
    event CreateDao(address indexed dao, address creator, address referer);
    event Initialized(uint8 version);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event SetDaoBeacon(
        address indexed _daoBeacon,
        uint256 indexed _index,
        string _name
    );
    event Upgraded(address indexed implementation);
    event WhitelistBudgetApproval(address budgetApproval);
    event WhitelistPriceGateway(address priceGateway);

    function abandonBudgetApprovals(address[] memory _budgetApprovals) external;

    function abandonPriceGateways(address[] memory _priceGateways) external;

    function budgetApprovals(address) external view returns (bool);

    function createDao(
        string memory _name,
        string memory _description,
        address _baseCurrency,
        bytes[] memory _data,
        address _referer
    ) external returns (address);

    function daoBeacon() external view returns (address);

    function daoBeaconIndex(address) external view returns (uint256);

    function daos(address) external view returns (bool);

    function initialize(
        address _daoBeacon,
        address[] memory _budgetApprovalImplementations,
        address[] memory _priceGatewayImplementations
    ) external;

    function owner() external view returns (address);

    function priceGateways(address) external view returns (bool);

    function proxiableUUID() external view returns (bytes32);

    function renounceOwnership() external;

    function setDaoBeacon(address _daoBeacon) external;

    function transferOwnership(address newOwner) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function whitelistBudgetApprovals(address[] memory _budgetApprovals)
        external;

    function whitelistPriceGateways(address[] memory _priceGateways) external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"}],"name":"BudgetApprovalAlreadyInitialized","type":"error"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"}],"name":"BudgetApprovalNotFound","type":"error"},{"inputs":[{"internalType":"address","name":"_daoBeacon","type":"address"}],"name":"DaoBeaconAlreadyInitialized","type":"error"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"}],"name":"InvalidContract","type":"error"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"PriceGatewayAlreadyInitialized","type":"error"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"PriceGatewayNotFound","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"AbandonBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"priceGateway","type":"address"}],"name":"AbandonPriceGateway","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"dao","type":"address"},{"indexed":false,"internalType":"address","name":"creator","type":"address"},{"indexed":false,"internalType":"address","name":"referer","type":"address"}],"name":"CreateDao","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_daoBeacon","type":"address"},{"indexed":true,"internalType":"uint256","name":"_index","type":"uint256"},{"indexed":false,"internalType":"string","name":"_name","type":"string"}],"name":"SetDaoBeacon","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"WhitelistBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"priceGateway","type":"address"}],"name":"WhitelistPriceGateway","type":"event"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"}],"name":"abandonBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_priceGateways","type":"address[]"}],"name":"abandonPriceGateways","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"address","name":"_baseCurrency","type":"address"},{"internalType":"bytes[]","name":"_data","type":"bytes[]"},{"internalType":"address","name":"_referer","type":"address"}],"name":"createDao","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"daoBeacon","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"daoBeaconIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"daos","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_daoBeacon","type":"address"},{"internalType":"address[]","name":"_budgetApprovalImplementations","type":"address[]"},{"internalType":"address[]","name":"_priceGatewayImplementations","type":"address[]"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"priceGateways","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_daoBeacon","type":"address"}],"name":"setDaoBeacon","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"}],"name":"whitelistBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_priceGateways","type":"address[]"}],"name":"whitelistPriceGateways","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/
