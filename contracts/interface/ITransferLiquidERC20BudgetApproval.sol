// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface ITransferLiquidERC20BudgetApproval {
    event AllowAddress(address target);
    event AllowAmount(uint256 amount);
    event AllowToken(address token);
    event ApproveTransaction(uint256 id, address approver, string comment);
    event CreateTransaction(
        uint256 id,
        bytes[] data,
        uint256 deadline,
        uint8 status,
        string comment,
        address creator
    );
    event ExecuteTransaction(uint256 id, bytes[] data, address _executor);
    event Initialized(uint8 version);
    event RevokeTransaction(uint256 id);
    event SetApprover(address approver);
    event execute(address to, address token, uint256 amount);

    function addressesMapping(address) external view returns (bool);

    function afterInitialized() external;

    function allowAllAddresses() external view returns (bool);

    function allowAnyAmount() external view returns (bool);

    function allowUnlimitedUsageCount() external view returns (bool);

    function approveTransaction(uint256 id, string memory comment) external;

    function approverTeamId() external view returns (uint256);

    function approversMapping(address eoa) external view returns (bool);

    function assetBaseCurrencyPrice(address asset, uint256 amount)
        external
        view
        returns (uint256);

    function assetEthPrice(address asset, uint256 amount)
        external
        view
        returns (uint256);

    function baseCurrency() external view returns (address);

    function baseCurrencyDecimals() external view returns (uint8);

    function canResolvePrice(address asset) external view returns (bool);

    function createTransaction(
        bytes[] memory _data,
        uint256 _deadline,
        bool _isExecute,
        string memory comment
    ) external returns (uint256);

    function endTime() external view returns (uint256);

    function ethAssetPrice(address asset, uint256 ethAmount)
        external
        view
        returns (uint256);

    function executeParams() external pure returns (string[] memory);

    function executeTransaction(uint256 id) external;

    function executee() external view returns (address);

    function executor() external view returns (address);

    function executorTeamId() external view returns (uint256);

    function initialize(
        ICommonBudgetApproval.InitializeParams memory params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        address _baseCurrency
    ) external;

    function minApproval() external view returns (uint256);

    function name() external view returns (string memory);

    function revokeTransaction(uint256 id) external;

    function startTime() external view returns (uint256);

    function team() external view returns (address);

    function text() external view returns (string memory);

    function tokens(uint256) external view returns (address);

    function tokensMapping(address) external view returns (bool);

    function totalAmount() external view returns (uint256);

    function transactionType() external view returns (string memory);

    function transactions(uint256)
        external
        view
        returns (
            uint256 id,
            uint8 status,
            uint256 deadline,
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
        address team;
    }
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"target","type":"address"}],"name":"AllowAddress","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AllowAmount","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"address","name":"approver","type":"address"},{"indexed":false,"internalType":"string","name":"comment","type":"string"}],"name":"ApproveTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"},{"indexed":false,"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"indexed":false,"internalType":"string","name":"comment","type":"string"},{"indexed":false,"internalType":"address","name":"creator","type":"address"}],"name":"CreateTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"address","name":"_executor","type":"address"}],"name":"ExecuteTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"}],"name":"RevokeTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"approver","type":"address"}],"name":"SetApprover","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"execute","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"addressesMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"afterInitialized","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allowAllAddresses","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowAnyAmount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowUnlimitedUsageCount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"comment","type":"string"}],"name":"approveTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"approverTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"eoa","type":"address"}],"name":"approversMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"assetBaseCurrencyPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"assetEthPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseCurrency","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseCurrencyDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"}],"name":"canResolvePrice","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"_data","type":"bytes[]"},{"internalType":"uint256","name":"_deadline","type":"uint256"},{"internalType":"bool","name":"_isExecute","type":"bool"},{"internalType":"string","name":"comment","type":"string"}],"name":"createTransaction","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"endTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"ethAmount","type":"uint256"}],"name":"ethAssetPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executeParams","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"executee","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executorTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"executor","type":"address"},{"internalType":"uint256","name":"executorTeamId","type":"uint256"},{"internalType":"address[]","name":"approvers","type":"address[]"},{"internalType":"uint256","name":"approverTeamId","type":"uint256"},{"internalType":"uint256","name":"minApproval","type":"uint256"},{"internalType":"string","name":"text","type":"string"},{"internalType":"string","name":"transactionType","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"allowUnlimitedUsageCount","type":"bool"},{"internalType":"uint256","name":"usageCount","type":"uint256"},{"internalType":"address","name":"team","type":"address"}],"internalType":"struct ICommonBudgetApproval.InitializeParams","name":"params","type":"tuple"},{"internalType":"bool","name":"_allowAllAddresses","type":"bool"},{"internalType":"address[]","name":"_toAddresses","type":"address[]"},{"internalType":"address[]","name":"_tokens","type":"address[]"},{"internalType":"bool","name":"_allowAnyAmount","type":"bool"},{"internalType":"uint256","name":"_totalAmount","type":"uint256"},{"internalType":"address","name":"_baseCurrency","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"minApproval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"revokeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"text","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tokens","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"tokensMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"transactionType","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"transactions","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"isExist","type":"bool"},{"internalType":"uint256","name":"approvedCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usageCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/
