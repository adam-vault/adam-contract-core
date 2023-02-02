// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IVestingERC20BudgetApproval {
    event AllowAddress(address target);
    event AllowAmount(uint256 amount);
    event AllowToken(address token);
    event ApproveTransaction(
        uint256 indexed id,
        address approver,
        string comment
    );
    event CreateTransaction(
        uint256 indexed id,
        bytes[] data,
        uint256 deadline,
        uint8 status,
        string comment,
        address creator
    );
    event ExecuteTransaction(
        uint256 indexed id,
        bytes[] data,
        address _executor
    );
    event ExecuteVestingERC20Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );
    event Initialized(uint8 version);
    event RevokeTransaction(uint256 indexed id);
    event SetApprover(address approver);

    function afterInitialized() external;

    function allowUnlimitedUsageCount() external view returns (bool);

    function approveTransaction(uint256 id, string memory comment) external;

    function approverTeamId() external view returns (uint256);

    function approversMapping(address eoa) external view returns (bool);

    function cliffPeriod() external view returns (uint256);

    function createTransaction(
        bytes[] memory _data,
        uint32 _deadline,
        bool _isExecute,
        string memory comment
    ) external payable returns (uint256);

    function currentReleasableAmount() external view returns (uint256);

    function cycleCount() external view returns (uint256);

    function cyclePeriod() external view returns (uint256);

    function cycleTokenAmount() external view returns (uint256);

    function endTime() external view returns (uint256);

    function executeParams() external pure returns (string[] memory);

    function executeTransaction(uint256 id) external payable;

    function executee() external view returns (address);

    function executor() external view returns (address);

    function executorTeamId() external view returns (uint256);

    function initTokenAmount() external view returns (uint256);

    function initialize(
        ICommonBudgetApproval.InitializeParams memory params,
        address _token,
        address _toAddress,
        uint256 _cliffPeriod,
        uint256 _cyclePeriod,
        uint256 _cycleCount,
        uint256 _cycleTokenAmount,
        uint256 _initTokenAmount
    ) external;

    function isCliffPassed() external view returns (bool);

    function minApproval() external view returns (uint256);

    function name() external view returns (string memory);

    function releasedAmount() external view returns (uint256);

    function remainingAmount() external view returns (uint256);

    function revokeTransaction(uint256 id) external;

    function startTime() external view returns (uint256);

    function team() external view returns (address);

    function text() external view returns (string memory);

    function toAddress() external view returns (address);

    function token() external view returns (address);

    function totalAmount() external view returns (uint256);

    function transactionType() external view returns (string memory);

    function transactions(uint256)
        external
        view
        returns (
            uint256 id,
            uint8 status,
            uint32 deadline,
            bool isExist,
            uint256 approvedCount
        );

    function usageCount() external view returns (uint256);
}

interface ICommonBudgetApproval {
    struct InitializeParams {
        address executor;
        uint256 executorTeamId;
        address[] approvers;
        uint256 approverTeamId;
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
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"target","type":"address"}],"name":"AllowAddress","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AllowAmount","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"address","name":"approver","type":"address"},{"indexed":false,"internalType":"string","name":"comment","type":"string"}],"name":"ApproveTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"},{"indexed":false,"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"indexed":false,"internalType":"string","name":"comment","type":"string"},{"indexed":false,"internalType":"address","name":"creator","type":"address"}],"name":"CreateTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"address","name":"_executor","type":"address"}],"name":"ExecuteTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"executor","type":"address"},{"indexed":true,"internalType":"address","name":"toAddress","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ExecuteVestingERC20Transaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"RevokeTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"approver","type":"address"}],"name":"SetApprover","type":"event"},{"inputs":[],"name":"afterInitialized","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allowUnlimitedUsageCount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"comment","type":"string"}],"name":"approveTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"approverTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"eoa","type":"address"}],"name":"approversMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cliffPeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"_data","type":"bytes[]"},{"internalType":"uint32","name":"_deadline","type":"uint32"},{"internalType":"bool","name":"_isExecute","type":"bool"},{"internalType":"string","name":"comment","type":"string"}],"name":"createTransaction","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"currentReleasableAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cycleCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cyclePeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cycleTokenAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"endTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executeParams","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"executee","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executorTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"initTokenAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"executor","type":"address"},{"internalType":"uint256","name":"executorTeamId","type":"uint256"},{"internalType":"address[]","name":"approvers","type":"address[]"},{"internalType":"uint256","name":"approverTeamId","type":"uint256"},{"internalType":"uint256","name":"minApproval","type":"uint256"},{"internalType":"string","name":"text","type":"string"},{"internalType":"string","name":"transactionType","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"allowUnlimitedUsageCount","type":"bool"},{"internalType":"uint256","name":"usageCount","type":"uint256"}],"internalType":"struct ICommonBudgetApproval.InitializeParams","name":"params","type":"tuple"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"address","name":"_toAddress","type":"address"},{"internalType":"uint256","name":"_cliffPeriod","type":"uint256"},{"internalType":"uint256","name":"_cyclePeriod","type":"uint256"},{"internalType":"uint256","name":"_cycleCount","type":"uint256"},{"internalType":"uint256","name":"_cycleTokenAmount","type":"uint256"},{"internalType":"uint256","name":"_initTokenAmount","type":"uint256"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"isCliffPassed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minApproval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"releasedAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remainingAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"revokeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"text","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"transactionType","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"transactions","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"internalType":"uint32","name":"deadline","type":"uint32"},{"internalType":"bool","name":"isExist","type":"bool"},{"internalType":"uint256","name":"approvedCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usageCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/
