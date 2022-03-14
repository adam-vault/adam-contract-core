// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity ^0.8.0;

interface IAdam {
    event AdminChanged(address previousAdmin, address newAdmin);
    event BeaconUpgraded(address indexed beacon);
    event CreateDao(
        address dao,
        string name,
        string symbol,
        string description,
        address creator
    );
    event Upgraded(address indexed implementation);
    event WhitelistBudgetApproval(address budgetApproval);

    function budgetApprovalRegistry(address) external view returns (bool);

    function budgetApprovals(uint256) external view returns (address);

    function createDao(
        string memory _name,
        string memory _symbol,
        string memory _description,
        uint256 _locktime,
        address[] memory _depositTokens
    ) external returns (address);

    function daoImplementation() external view returns (address);

    function daoRegistry(address) external view returns (bool);

    function daos(uint256) external view returns (address);

    function governFactoryImplementation() external view returns (address);

    function governImplementation() external view returns (address);

    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address[] memory _budgetApprovalImplementations,
        address _governFactoryImplementation,
        address _governImplementation
    ) external;

    function membershipImplementation() external view returns (address);

    function proxiableUUID() external view returns (bytes32);

    function setDaoImplementation(address _daoImplementation) external;

    function setMembershipImplementation(address _membershipImplementation)
        external;

    function totalDaos() external view returns (uint256);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function whitelistBudgetApprovals(address[] memory _budgetApprovals)
        external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"dao","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"string","name":"symbol","type":"string"},{"indexed":false,"internalType":"string","name":"description","type":"string"},{"indexed":false,"internalType":"address","name":"creator","type":"address"}],"name":"CreateDao","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"WhitelistBudgetApproval","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovalRegistry","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"budgetApprovals","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_locktime","type":"uint256"},{"internalType":"address[]","name":"_depositTokens","type":"address[]"}],"name":"createDao","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"daoImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"daoRegistry","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"daos","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governFactoryImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_daoImplementation","type":"address"},{"internalType":"address","name":"_membershipImplementation","type":"address"},{"internalType":"address[]","name":"_budgetApprovalImplementations","type":"address[]"},{"internalType":"address","name":"_governFactoryImplementation","type":"address"},{"internalType":"address","name":"_governImplementation","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"membershipImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_daoImplementation","type":"address"}],"name":"setDaoImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_membershipImplementation","type":"address"}],"name":"setMembershipImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalDaos","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"}],"name":"whitelistBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/
