// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../lib/BytesLib.sol";
import "../lib/RevertMsg.sol";

import "../interface/IMembership.sol";

abstract contract CommonBudgetApproval is Initializable, UUPSUpgradeable {

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
        bytes data;
        Status status;
        uint256 deadline;
        mapping(address => bool) approved;
        uint256 approvedCount;
        bool isExist;
    }

    event CreateTransaction(uint256 id, bytes data, uint256 deadline, Status status);
    event ApproveTransaction(uint256 id, address approver);
    event ExecuteTransaction(uint256 id, bytes data);
    event RevokeTransaction(uint256 id);
    event AllowAddress(address target);
    event AllowToken(address token);
    event AllowAmount(uint256 amount);
    event SetApprover(address approver);

    Counters.Counter private _transactionIds;

    mapping(uint256 => Transaction) public transactions;

    address constant public ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address public executor;
    address payable public dao;
    address public executee;

    mapping(address => bool) public approversMapping;
    uint256 public minApproval;

    string public text;
    string public transactionType;

    bool public allowUnlimitedUsageCount;
    uint256 public usageCount;

    uint256 public startTime;
    uint256 public endTime;

    modifier onlyApprover () {
        require(approversMapping[msg.sender], "access denied");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "access denied");
        _;
    }

    modifier onlyExecutor() {
        require(msg.sender == executor, "access denied");
        _;
    }

    modifier onlyExecutee() {
        require(msg.sender == executee, "access denied");
        _;
    }

    modifier matchStatus(uint256 _transactionId, Status _status) {
        require(transactions[_transactionId].status == _status, "status invalid");
        _;
    }

    modifier checkTime(uint256 _transactionId) {
        require(block.timestamp <= transactions[_transactionId].deadline, "transaction expired");
        require(block.timestamp >= startTime, "budget approval not yet started");
        if(endTime != 0) {
            require(block.timestamp < endTime, "budget approval ended");
        }
        _;
    }

    struct InitializeParams {
        address dao;
        address executor;
        address[] approvers;
        uint256 minApproval;
        string text;
        string transactionType;
        bool allowAllAddresses;
        address[] addresses;
        address[] tokens;
        bool allowAnyAmount;
        uint256 totalAmount;
        uint8 amountPercentage;
        uint256 startTime;
        uint256 endTime;
        bool allowUnlimitedUsageCount;
        uint256 usageCount;
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
        require(minApproval <= params.approvers.length, "minApproval invalid");

        startTime = params.startTime;
        endTime = params.endTime;

        allowUnlimitedUsageCount = params.allowUnlimitedUsageCount;
        usageCount = params.usageCount;
    }

    function afterInitialized() virtual external onlyExecutee {}

    function NAME() external virtual returns (string calldata);

    function executeTransaction(uint256 _transactionId) public matchStatus(_transactionId, Status.Approved) checkTime(_transactionId) onlyExecutor {
        (bool success, bytes memory result) = address(this).call(transactions[_transactionId].data);
        require(success, RevertMsg.ToString(result));

        transactions[_transactionId].status = Status.Completed;
        emit ExecuteTransaction(_transactionId, transactions[_transactionId].data);
    }

    function createTransaction(bytes memory _data, uint256 _deadline, bool _execute) external {
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

        if (_execute) {
            executeTransaction(id);
        }
    }

    function approveTransaction(uint256 id) external onlyApprover {
        require(transactions[id].status == Status.Pending
            || transactions[id].status == Status.Approved,
            "tx cannot be approved");
        require(!transactions[id].approved[msg.sender], "cannot approve twice");

        transactions[id].approved[msg.sender] = true;
        transactions[id].approvedCount++;

        if(transactions[id].approvedCount >= minApproval) {
            transactions[id].status = Status.Approved;
        }

        emit ApproveTransaction(id, msg.sender);
    }

    function revokeTransaction(uint256 id) external onlyExecutor {
        require(transactions[id].status != Status.Completed, "transaction already completed");
        transactions[id].status = Status.Cancelled;

        emit RevokeTransaction(id);
    }

    function execute(address, bytes memory, uint256) public virtual;

    // TODO
    function checkUsageCountValid() public view returns (bool) {
        return allowUnlimitedUsageCount || usageCount > 0;
    }

    function _updateUsageCount() internal {
        if(!allowUnlimitedUsageCount) {
            usageCount--;
        }
    }

    function _authorizeUpgrade(address) internal override initializer {}
}