// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../lib/BytesLib.sol";
import "../interface/ITeam.sol";
import "../interface/IBudgetApprovalExecutee.sol";

abstract contract CommonBudgetApproval is Initializable {

    using Counters for Counters.Counter;
    using BytesLib for bytes;

    enum Status {
        Pending,
        Approved,
        Completed,
        Cancelled
    }

    struct Transaction {
        uint256 id;
        bytes[] data;
        Status status;
        uint32 deadline;
        bool isExist;
        uint256 approvedCount;
        mapping(address => bool) approved;
    }

    event CreateTransaction(
        uint256 indexed id,
        bytes[] data,
        uint256 deadline,
        Status status,
        string comment,
        address creator
    );
    event ApproveTransaction(
        uint256 indexed id,
        address approver,
        string comment
    );
    event ExecuteTransaction(
        uint256 indexed id,
        bytes[] data,
        address _executor
    );
    event RevokeTransaction(uint256 indexed id);
    event AllowAddress(address target);
    event AllowToken(address token);
    event AllowAmount(uint256 amount);
    event SetApprover(address approver);

    Counters.Counter private _transactionIds;

    mapping(uint256 => Transaction) public transactions;

    address private _executor;
    uint256 private _executorTeamId;
    address private _executee; // Must be BudgetApprovalExecutee

    mapping(address => bool) private _approversMapping;
    uint256 private _approverTeamId;
    uint256 private _minApproval;

    string private _text;
    string private _transactionType;

    bool private _allowUnlimitedUsageCount;
    uint256 private _usageCount;

    uint256 private _startTime;
    uint256 private _endTime;


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

    modifier onlyExecutee() {
        require(msg.sender == executee(), "Executee not whitelisted in budget");
        _;
    }

    modifier matchStatus(uint256 id, Status status) {
        require(
            transactions[id].status == status,
            "Transaction status invalid"
        );
        _;
    }

    modifier checkTime(uint256 id) {
        require(
            block.timestamp <= transactions[id].deadline,
            "Transaction expired"
        );
        require(
            block.timestamp >= startTime(),
            "Budget usage period not started"
        );

        uint256 __endtime = endTime();
        if (__endtime != 0) {
            require(
                block.timestamp < __endtime,
                "Budget usage period has ended"
            );
        }
        _;
    }

    modifier onlyApprover() {
        require(_isApprover(msg.sender), "Approver not whitelisted in budget");
        _;
    }

    modifier onlyExecutor() {
        require(_isExecutor(msg.sender), "Executor not whitelisted in budget");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function executor() public view returns (address) {
        return _executor;
    }

    function _isExecutor(address eoa) internal view virtual returns (bool) {
        return eoa == executor() ||
            _inTeam(eoa, executorTeamId());
    }

    function _isApprover(address eoa) internal view virtual returns (bool) {
        return approversMapping(eoa) ||
                _inTeam(eoa, approverTeamId());
    }

    function _inTeam(address eoa, uint256 teamId) internal view returns (bool) {
        return ITeam(team()).balanceOf(eoa, teamId) > 0;
    }

    function executorTeamId() public view returns (uint256) {
        return _executorTeamId;
    }

    function executee() public view returns (address) {
        return _executee;
    }

    function approversMapping(address eoa) public view returns (bool) {
        return _approversMapping[eoa];
    }

    function approverTeamId() public view returns (uint256) {
        return _approverTeamId;
    }

    function minApproval() public view returns (uint256) {
        return _minApproval;
    }

    function text() public view returns (string memory) {
        return _text;
    }

    function transactionType() public view returns (string memory) {
        return _transactionType;
    }

    function allowUnlimitedUsageCount() public view returns (bool) {
        return _allowUnlimitedUsageCount;
    }

    function usageCount() public view returns (uint256) {
        return _usageCount;
    }

    function startTime() public view returns (uint256) {
        return _startTime;
    }

    function endTime() public view returns (uint256) {
        return _endTime;
    }

    function team() public view returns (address) {
        return IBudgetApprovalExecutee(executee()).team();
    }

    function __BudgetApproval_init(InitializeParams calldata params)
        internal
        onlyInitializing
    {
        require(
            params.approverTeamId > 0 ||
                (params.minApproval <= params.approvers.length),
            "Invalid approver list"
        );

        _executee = msg.sender;
        _executor = params.executor;
        _text = params.text;
        _transactionType = params.transactionType;

        _minApproval = params.minApproval;
        _startTime = params.startTime;
        _endTime = params.endTime;

        _allowUnlimitedUsageCount = params.allowUnlimitedUsageCount;
        _usageCount = params.usageCount;

        _executorTeamId = params.executorTeamId;
        _approverTeamId = params.approverTeamId;

        for (uint256 i = 0; i < params.approvers.length; i++) {
            _approversMapping[params.approvers[i]] = true;
            emit SetApprover(params.approvers[i]);
        }
        require(team() != address(0), "Team is required");
    }

    function afterInitialized() external virtual onlyExecutee {}

    function executeTransaction(uint256 id)
        public
        virtual
        matchStatus(id, Status.Approved)
        checkTime(id)
        onlyExecutor
        payable
    {
        bool unlimited = allowUnlimitedUsageCount();
        uint256 count = usageCount();
        bytes[] memory data = transactions[id].data;

        for (uint256 i = 0; i < data.length; i++) {
            require(unlimited || count > 0, "Exceeded budget usage limit");
            if (!unlimited) {
                count--;
            }
            _execute(id, data[i]);
        }

        _usageCount = count;
        transactions[id].status = Status.Completed;
        emit ExecuteTransaction(id, data, msg.sender);
    }

    function createTransaction(
        bytes[] memory _data,
        uint32 _deadline,
        bool _isExecute,
        string calldata comment
    ) external virtual onlyExecutor payable returns (uint256) {
        _transactionIds.increment();
        uint256 id = _transactionIds.current();

        // workaround when have mapping in Struct
        Transaction storage newTransaction = transactions[id];
        newTransaction.id = id;
        newTransaction.data = _data;
        newTransaction.deadline = _deadline;
        newTransaction.isExist = true;

        if (minApproval() == 0) {
            transactions[id].status = Status.Approved;
        } else {
            transactions[id].status = Status.Pending;
        }

        emit CreateTransaction(
            id,
            _data,
            _deadline,
            newTransaction.status,
            comment,
            msg.sender
        );

        if (_isExecute) {
            executeTransaction(id);
        }
        return id;
    }

    function approveTransaction(uint256 id, string calldata comment)
        external
        virtual
        onlyApprover
    {
        require(_transactionIds.current() >= id, "Invaild TransactionId");

        Status _transactionStatus = transactions[id].status;
        uint256 _transactionApprovedCount = transactions[id].approvedCount + 1;

        require(
            _transactionStatus == Status.Pending ||
                _transactionStatus == Status.Approved,
            "Unexpected transaction status"
        );
        require(
            !transactions[id].approved[msg.sender],
            "Transaction has been approved before"
        );

        transactions[id].approved[msg.sender] = true;
        transactions[id].approvedCount = _transactionApprovedCount;

        if (_transactionApprovedCount >= minApproval()) {
            transactions[id].status = Status.Approved;
        }

        emit ApproveTransaction(id, msg.sender, comment);
    }

    function revokeTransaction(uint256 id) external virtual onlyExecutor {
        require(_transactionIds.current() >= id, "Invaild TransactionId");
        require(
            transactions[id].status != Status.Completed,
            "Transaction has been completed before"
        );
        transactions[id].status = Status.Cancelled;

        emit RevokeTransaction(id);
    }

    function _execute(uint256, bytes memory) internal virtual;

    function executeParams() external pure virtual returns (string[] memory);

    function name() external virtual returns (string memory);
}
