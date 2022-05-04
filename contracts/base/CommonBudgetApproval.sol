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
        Completed
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

    event CreateTransaction(uint256 id, bytes data, uint256 deadline);
    event ApproveTransaction(uint256 id, address approver);
    event ExecuteTransaction(uint256 id, bytes data);
    event AllowAddress(address target);
    event AllowToken(address token);
    event AllowAmount(uint256 amount);
    event UsageCount(uint256 count);

    Counters.Counter private _transactionIds;

    mapping(uint256 => Transaction) public transactions;

    address constant public ETH_ADDRESS = address(0x0);

    address public executor;
    address payable public dao;
    address public executee;

    mapping(address => bool) public approversMapping;
    uint256 minApproval;

    string public text;
    string public transactionType;

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;

    address[] public tokens;
    mapping(address => bool) public tokensMapping;

    bool public allowAnyAmount;
    uint256 public totalAmount;

    uint8 public amountPercentage;

    uint256 public startTime;
    uint256 public endTime;

    bool public allowUnlimitedUsageCount;
    uint256 public usageCount;

    modifier onlyApprover () {
        require(approversMapping[msg.sender], "access denied");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "access denied");
        _;
    }

    modifier matchStatus (uint256 _transactionId, Status _status) {
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
        }

        minApproval = params.minApproval;
        require(minApproval <= params.approvers.length, "minApproval invalid");

        allowAllAddresses = params.allowAllAddresses;
        for(uint i = 0; i < params.addresses.length; i++) {
            addressesMapping[params.addresses[i]] = true;
            emit AllowAddress(params.addresses[i]);
        }

        tokens = params.tokens;
        for(uint i = 0; i < params.tokens.length; i++) {
            tokensMapping[params.tokens[i]] = true;
            emit AllowToken(params.tokens[i]);
        }

        allowAnyAmount = params.allowAnyAmount;
        totalAmount = params.totalAmount;
        emit AllowAmount(totalAmount);
        amountPercentage = params.amountPercentage;

        startTime = params.startTime;
        endTime = params.endTime;

        allowUnlimitedUsageCount = params.allowUnlimitedUsageCount;
        usageCount = params.usageCount;
        emit UsageCount(usageCount);
    }

    function NAME() external virtual returns (string calldata);

    function executeTransaction(uint256 _transactionId) public matchStatus(_transactionId, Status.Approved) checkTime(_transactionId) {
        require(msg.sender == executor, "access denied");

        (bool success, bytes memory result) = address(this).call(transactions[_transactionId].data);
        require(success, RevertMsg.ToString(result));

        transactions[_transactionId].status = Status.Completed;
        emit ExecuteTransaction(_transactionId, transactions[_transactionId].data);
    }

    function createTransaction(bytes memory _data, uint256 _deadline, bool _execute) external returns (uint256) {
        _transactionIds.increment();
        uint256 _transactionId = _transactionIds.current();

        // workaround when have mapping in Struct
        Transaction storage newTransaction = transactions[_transactionId];
        newTransaction.id = _transactionId;
        newTransaction.data = _data;
        newTransaction.deadline = _deadline;
        newTransaction.isExist = true;

        if(minApproval == 0) {
            newTransaction.status = Status.Approved;
        } else {
            newTransaction.status = Status.Pending;
        }

        emit CreateTransaction(_transactionId, _data, _deadline);

        if (_execute) {
            executeTransaction(_transactionId);
        }

        return _transactionId;
    }

    function approveTransaction(uint256 _transactionId) external onlyApprover {
        if(!transactions[_transactionId].approved[msg.sender]) {
            transactions[_transactionId].approved[msg.sender] = true;
            transactions[_transactionId].approvedCount++;

            emit ApproveTransaction(_transactionId, msg.sender);

            if(transactions[_transactionId].approvedCount >= minApproval) {
                transactions[_transactionId].status = Status.Approved;
            }
        }
    }

    function lastTransactionId() public view returns (uint256) {
        return _transactionIds.current();
    }

    function checkAddressValid(address to) public view returns (bool) {
        return allowAllAddresses || addressesMapping[to];
    }

    function checkTokenValid(address token) public view returns (bool) {
        return tokensMapping[token];
    }

    function checkAmountValid(uint256 amount) public view returns (bool) {
        return allowAnyAmount || amount <= totalAmount;
    }

    function checkAmountPercentageValid(uint256 amount, bool executed) public view returns (bool) {

        uint256 _totalAmount;
        if(executed) {
            _totalAmount += amount;
        }

        for(uint i = 0; i < tokens.length; i++) {
            if(tokens[i] == ETH_ADDRESS) {
                _totalAmount += executee.balance;
            } else {
                _totalAmount += IERC20(tokens[i]).balanceOf(executee);
            }
        }

        if(_totalAmount == 0) {
            return false;
        }

        return (amount * 100 / _totalAmount) <= amountPercentage;
    }

    function _updateTotalAmount(uint256 usedAmount) internal {
        if(!allowAnyAmount) {
            totalAmount -= usedAmount;
            emit AllowAmount(totalAmount);
        }
    }

    function checkUsageCountValid() public view returns (bool) {
        return allowUnlimitedUsageCount || usageCount > 0;
    }

    function _updateUsageCount() internal {
        if(!allowUnlimitedUsageCount) {
            usageCount--;
            emit UsageCount(usageCount);
        }
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function execute(address, bytes memory, uint256) public virtual;

    function encodeTransactionData(address _to, bytes memory _data, uint256 _amount) public pure returns (bytes memory) {
        return abi.encodeWithSelector(this.execute.selector, _to, _data, _amount);
    }

    function decodeTransactionData(bytes memory _data) public pure returns (address, bytes memory, uint256) {

        if(_data.toBytes4(0) != this.execute.selector) {
            // execute(address,address,bytes,uint256)
            revert("unexpected function call");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (address, bytes, uint256));
    }

    receive() external payable {}
}