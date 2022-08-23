// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../lib/BytesLib.sol";
import "../lib/RevertMsg.sol";

import "../interface/IMembership.sol";
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
        uint256 deadline;
        mapping(address => bool) approved;
        uint256 approvedCount;
        bool isExist;
    }

    event CreateTransaction(uint256 id, bytes[] data, uint256 deadline, Status status);
    event ApproveTransaction(uint256 id, address approver);
    event ExecuteTransaction(uint256 id, bytes[] data, address executor);
    event RevokeTransaction(uint256 id);
    event AllowAddress(address target);
    event AllowToken(address token);
    event AllowAmount(uint256 amount);
    event SetApprover(address approver);

    Counters.Counter private _transactionIds;

    mapping(uint256 => Transaction) public transactions;

    address public executor;
    uint256 public executorTeamId;
    address payable public dao;
    address public executee; // Must be BudgetApprovalExecutee

    mapping(address => bool) public approversMapping;
    uint256 public approverTeamId;
    uint256 public minApproval;

    string public text;
    string public transactionType;

    bool public allowUnlimitedUsageCount;
    uint256 public usageCount;

    uint256 public startTime;
    uint256 public endTime;

    address public team;

    modifier onlyApprover() {
        require(
          approversMapping[msg.sender] ||
          ITeam(team).balanceOf(msg.sender, approverTeamId) > 0, "Approver not whitelisted in budget"
        );
        _;
    }

    modifier onlyExecutor() {
        require(msg.sender == executor ||
          ITeam(team).balanceOf(msg.sender, executorTeamId) > 0, "Executor not whitelisted in budget"
        );
        _;
    }

    modifier onlyExecutee() {
        require(msg.sender == executee, "Executee not whitelisted in budget");
        _;
    }

    modifier matchStatus(uint256 id, Status status) {
        require(transactions[id].status == status, "Transaction status invalid");
        _;
    }

    modifier checkTime(uint256 id) {
        require(block.timestamp <= transactions[id].deadline, "Transaction expired");
        require(block.timestamp >= startTime, "Budget usage period not started");
        if(endTime != 0) {
            require(block.timestamp < endTime, "Budget usage period has ended");
        }
        _;
    }

    struct InitializeParams {
        address dao;
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
        address team; // TODO: Get team from IBudgetApprovalExecutee
    }

    function __BudgetApproval_init(
        InitializeParams calldata params
        ) internal onlyInitializing {
        dao = payable(params.dao);
        executee = msg.sender;
        executor = params.executor;
        text = params.text;
        transactionType = params.transactionType;

        for (uint i = 0; i < params.approvers.length; i++) {
            approversMapping[params.approvers[i]] = true;
            emit SetApprover(params.approvers[i]);
        }

        minApproval = params.minApproval;
        require(
          params.approverTeamId > 0 || (minApproval <= params.approvers.length),
          "Invalid approver list"
        );

        startTime = params.startTime;
        endTime = params.endTime;

        allowUnlimitedUsageCount = params.allowUnlimitedUsageCount;
        usageCount = params.usageCount;

        team = params.team;
        executorTeamId = params.executorTeamId;
        approverTeamId = params.approverTeamId;
    }

    function afterInitialized() virtual external onlyExecutee {}

    function executeTransaction(uint256 id) public matchStatus(id, Status.Approved) checkTime(id) onlyExecutor {
        for (uint i = 0; i < transactions[id].data.length; i++) {
            require(allowUnlimitedUsageCount || usageCount > 0, "Exceeded budget usage limit ");
            if (!allowUnlimitedUsageCount) {
                usageCount--;
            }
            _execute(id, transactions[id].data[i]);
        }

        transactions[id].status = Status.Completed;
        emit ExecuteTransaction(id, transactions[id].data, msg.sender);
    }

    function createTransaction(bytes[] memory _data, uint256 _deadline, bool _isExecute) external onlyExecutor returns (uint256) {
        _transactionIds.increment();
        uint256 id = _transactionIds.current();

        // workaround when have mapping in Struct
        Transaction storage newTransaction = transactions[id];
        newTransaction.id = id;
        newTransaction.data = _data;
        newTransaction.deadline = _deadline;
        newTransaction.isExist = true;

        if (minApproval == 0) {
            transactions[id].status = Status.Approved;
        } else {
            transactions[id].status = Status.Pending;
        }

        emit CreateTransaction(id, _data, _deadline,  newTransaction.status);

        if (_isExecute) {
            executeTransaction(id);
        }
        return id;
    }

    function approveTransaction(uint256 id) external onlyApprover {
        require(transactions[id].status == Status.Pending
            || transactions[id].status == Status.Approved,
            "Unexpected transaction status");
        require(!transactions[id].approved[msg.sender], "Transaction has been approved before");

        transactions[id].approved[msg.sender] = true;
        transactions[id].approvedCount++;

        if(transactions[id].approvedCount >= minApproval) {
            transactions[id].status = Status.Approved;
        }

        emit ApproveTransaction(id, msg.sender);
    }

    function revokeTransaction(uint256 id) external onlyExecutor {
        require(transactions[id].status != Status.Completed, "Transaction has been completed before");
        transactions[id].status = Status.Cancelled;

        emit RevokeTransaction(id);
    }

    function statusOf(uint256 id) public view returns (Status) {
        return transactions[id].status;
    }
    function approvedCountOf(uint256 id) public view returns (uint256) {
        return transactions[id].approvedCount;
    }
    function deadlineOf(uint256 id) public view returns (uint256) {
        return transactions[id].deadline;
    }

    function _execute(uint256, bytes memory) internal virtual;
    function executeParams() public pure virtual returns (string[] memory);
    function name() external virtual returns (string memory);
}