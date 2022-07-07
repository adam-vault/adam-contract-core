// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity ^0.8.0;

interface ITransferERC20BudgetApproval {
    event AdminChanged(address previousAdmin, address newAdmin);
    event AllowAddress(address target);
    event AllowAmount(uint256 amount);
    event AllowToken(address token);
    event ApproveTransaction(uint256 id, address approver);
    event BeaconUpgraded(address indexed beacon);
    event CreateTransaction(
        uint256 id,
        bytes[] data,
        uint256 deadline,
        uint8 status
    );
    event ExecuteTransaction(uint256 id, bytes[] data);
    event RevokeTransaction(uint256 id);
    event SetApprover(address approver);
    event Upgraded(address indexed implementation);

    function ETH_ADDRESS() external view returns (address);

    function addressesMapping(address) external view returns (bool);

    function afterInitialized() external;

    function allowAllAddresses() external view returns (bool);

    function allowAnyAmount() external view returns (bool);

    function allowUnlimitedUsageCount() external view returns (bool);

    function amountPercentage() external view returns (uint8);

    function approveTransaction(uint256 id) external;

    function approvedCountOf(uint256 id) external view returns (uint256);

    function approversMapping(address) external view returns (bool);

    function createTransaction(
        bytes[] memory _data,
        uint256 _deadline,
        bool _isExecute
    ) external returns (uint256);

    function dao() external view returns (address);

    function deadlineOf(uint256 id) external view returns (uint256);

    function endTime() external view returns (uint256);

    function executeParams() external pure returns (string[] memory);

    function executeTransaction(uint256 id) external;

    function executee() external view returns (address);

    function executor() external view returns (address);

    function initialize(
        ICommonBudgetApproval.InitializeParams memory params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address _token,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) external;

    function minApproval() external view returns (uint256);

    function name() external view returns (string memory);

    function proxiableUUID() external view returns (bytes32);

    function revokeTransaction(uint256 id) external;

    function startTime() external view returns (uint256);

    function statusOf(uint256 id) external view returns (uint8);

    function text() external view returns (string memory);

    function token() external view returns (address);

    function totalAmount() external view returns (uint256);

    function transactionType() external view returns (string memory);

    function transactions(uint256)
        external
        view
        returns (
            uint256 id,
            uint8 status,
            uint256 deadline,
            uint256 approvedCount,
            bool isExist
        );

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function usageCount() external view returns (uint256);
}

interface ICommonBudgetApproval {
    struct InitializeParams {
        address dao;
        address executor;
        address[] approvers;
        uint256 minApproval;
        string text;
        string transactionType;
        uint256 startTime;
        uint256 endTime;
        bool allowUnlimitedUsageCount;
        uint256 usageCount;
    }
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"target","type":"address"}],"name":"AllowAddress","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AllowAmount","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"address","name":"approver","type":"address"}],"name":"ApproveTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"},{"indexed":false,"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"}],"name":"CreateTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"ExecuteTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"}],"name":"RevokeTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"approver","type":"address"}],"name":"SetApprover","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[],"name":"ETH_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"addressesMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"afterInitialized","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allowAllAddresses","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowAnyAmount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowUnlimitedUsageCount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"amountPercentage","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"approveTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"approvedCountOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"approversMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"_data","type":"bytes[]"},{"internalType":"uint256","name":"_deadline","type":"uint256"},{"internalType":"bool","name":"_isExecute","type":"bool"}],"name":"createTransaction","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dao","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"deadlineOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"endTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executeParams","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"executee","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"dao","type":"address"},{"internalType":"address","name":"executor","type":"address"},{"internalType":"address[]","name":"approvers","type":"address[]"},{"internalType":"uint256","name":"minApproval","type":"uint256"},{"internalType":"string","name":"text","type":"string"},{"internalType":"string","name":"transactionType","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"allowUnlimitedUsageCount","type":"bool"},{"internalType":"uint256","name":"usageCount","type":"uint256"}],"internalType":"struct ICommonBudgetApproval.InitializeParams","name":"params","type":"tuple"},{"internalType":"bool","name":"_allowAllAddresses","type":"bool"},{"internalType":"address[]","name":"_toAddresses","type":"address[]"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"bool","name":"_allowAnyAmount","type":"bool"},{"internalType":"uint256","name":"_totalAmount","type":"uint256"},{"internalType":"uint8","name":"_amountPercentage","type":"uint8"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"minApproval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"revokeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"statusOf","outputs":[{"internalType":"enum CommonBudgetApproval.Status","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"text","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"transactionType","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"transactions","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"approvedCount","type":"uint256"},{"internalType":"bool","name":"isExist","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"usageCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/
