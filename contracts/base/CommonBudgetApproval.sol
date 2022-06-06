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
        bytes[] data;
        Status status;
        uint256 deadline;
        mapping(address => bool) approved;
        uint256 approvedCount;
        bool isExist;
    }

    event CreateTransaction(uint256 id, bytes[] data, uint256 deadline, Status status);
    event ApproveTransaction(uint256 id, address approver);
    event ExecuteTransaction(uint256 id, bytes[] data);
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

    modifier matchStatus(uint256 id, Status status) {
        require(transactions[id].status == status, "status invalid");
        _;
    }

    modifier checkTime(uint256 id) {
        require(block.timestamp <= transactions[id].deadline, "transaction expired");
        require(block.timestamp >= startTime, "budget approval not yet started");
        if(endTime != 0) {
            require(block.timestamp < endTime, "budget approval ended");
        }
        _;
    }

    /**
     * @notice config for creating a budget approval 
     * @param dao address of dao
     * @param executor address of EOA
     * @param approvers address of approvers
     * @param minApproval minimum approval needed to execute
     * @param text name of budget approval
     * @param transactionType type of budget approval
     * @param startTime not able to use budget approval before startTime
     * @param endTime not able to use budget approval after endTime
     * @param allowUnlimitedUsageCount allow unlimited usage count
     * @param usageCount number of usage count 
     */
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

    /**
     * @dev [0] dao: address of dao \
     *      [1] executor: address of EOA \
     *      [2] approvers: address of approvers \
     *      [3] text: name of budget approval \
     *      [4] transactionType: type of budget approval \
     *      [5] allowAllAddresses: allow all receipent address \
     *      [6] addresses: allowed address of receipents \
     *      [7] tokens: allowed address of using tokens \
     *      [8] allowAnyAmount: allow any amount \
     *      [9] totalAmount: allowed amount \
     *      [10] amountPercentage: percentage of allowed amount \
     *      [11] startTime: not able to use budget approval before startTime \
     *      [12] endTime: not able to use budget approval after endTime \
     *      [13] allowUnlimitedUsageCount: allow unlimited usage count \
     *      [14] usageCount: number of usage count 
     */
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

    /**
     * @notice execute transaction by executor
     * @param id transaction id
     */
    function executeTransaction(uint256 id) public matchStatus(id, Status.Approved) checkTime(id) onlyExecutor {
        for (uint i = 0; i < transactions[id].data.length; i++) {
            require(allowUnlimitedUsageCount || usageCount > 0, "usage exceeded");
            if (!allowUnlimitedUsageCount) {
                usageCount--;
            }
            _execute(transactions[id].data[i]);
        }

        transactions[id].status = Status.Completed;
        emit ExecuteTransaction(id, transactions[id].data);
    }

    /**
     * @notice create transaction by executor
     * @param _data encoded bytes of transaction
     * @param _deadline not able to execute after deadline (timestamp of second)
     * @param _isExecute execute immediately after created
     */
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

    /** 
     * @notice approve transaction by approver
     * @param id transaction id
     */
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

    /**
     * @notice revoke transaction by approver
     * @param id transaction id
     */
    function revokeTransaction(uint256 id) external onlyExecutor {
        require(transactions[id].status != Status.Completed, "transaction already completed");
        transactions[id].status = Status.Cancelled;

        emit RevokeTransaction(id);
    }

    /**
     * @notice check status of transaction
     * @param id transaction id
     * @return status of transaction
     */
    function statusOf(uint256 id) public view returns (Status) {
        return transactions[id].status;
    }

    /**
     * @notice check approved count of transaction
     * @param id transaction id
     * @return number of approved count
     */
    function approvedCountOf(uint256 id) public view returns (uint256) {
        return transactions[id].approvedCount;
    }

    /**
     * @notice check deadline of transaction
     * @param id transaction id
     * @return deadline of transaction
     */
    function deadlineOf(uint256 id) public view returns (uint256) {
        return transactions[id].deadline;
    }

    function _execute(bytes memory) internal virtual;

    /**
     * @notice check params of execute function
     * @return string array of params
     */
    function executeParams() public pure virtual returns (string[] memory);
    function name() external virtual returns (string memory);

    function _authorizeUpgrade(address) internal override initializer {}
}