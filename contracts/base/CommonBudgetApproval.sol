// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../lib/BytesLib.sol";
import "../lib/RevertMsg.sol";

import "../interface/IDao.sol";
import "../interface/IMultiToken.sol";

import "../interface/IMembership.sol";

abstract contract CommonBudgetApproval is Initializable, UUPSUpgradeable {

    using Counters for Counters.Counter;
    using BytesLib for bytes;

    enum Status {
        Pending,
        Approved,
        Rejected,
        Completed
    }

    struct Transaction {
        uint256 id;
        bytes data;
        Status status;
        uint256 deadline;
        mapping(address => bool) approved;
        bool isExist;
    }

    event CreateTransaction(uint256 id, bytes data, uint256 deadline);
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

    address[] public approvers;
    mapping(address => bool) public approversMapping;

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

    modifier onlyDao {
        require(msg.sender == dao, "access denied");
        _;
    }

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

    function initialize(
        InitializeParams calldata params
        ) public initializer {
        dao = payable(params.dao);
        executor = params.executor;
        text = params.text;
        transactionType = params.transactionType;

        approvers = params.approvers;
        for (uint i = 0; i < params.approvers.length; i++) {
            approversMapping[params.approvers[i]] = true;
        }

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
        require(msg.sender == executor || msg.sender == dao, "access denied");

        (bool success, bytes memory result) = address(this).call(transactions[_transactionId].data);
        require(success, RevertMsg.ToString(result));

        emit ExecuteTransaction(_transactionId, transactions[_transactionId].data);
    }

    function createTransaction(bytes memory _data, uint256 _deadline, bool _execute) external onlyDao returns (uint256) {
        _transactionIds.increment();
        uint256 _transactionId = _transactionIds.current();

        // workaround when have mapping in Struct
        Transaction storage newTransaction = transactions[_transactionId];
        newTransaction.id = _transactionId;
        newTransaction.data = _data;
        if(approvers.length == 0) {
            newTransaction.status = Status.Approved;
        } else {
            newTransaction.status = Status.Pending;
        }
        newTransaction.deadline = _deadline;
        newTransaction.isExist = true;

        emit CreateTransaction(_transactionId, _data, _deadline);

        if (_execute) {
            executeTransaction(_transactionId);
        }

        return _transactionId;
    }

    function approveTransaction(uint256 _transactionId) external onlyApprover matchStatus(_transactionId, Status.Pending) {
        transactions[_transactionId].approved[msg.sender] = true;

        if(checkAllApproved(_transactionId)) {
            transactions[_transactionId].status = Status.Approved;
        }
    }

    function rejectTransaction(uint256 _transactionId) external onlyApprover matchStatus(_transactionId, Status.Pending) {
        transactions[_transactionId].status = Status.Rejected;
    }

    function lastTransactionId() public view returns (uint256) {
        return _transactionIds.current();
    }

    function checkAllApproved(uint256 _transactionId) public view returns (bool) {
        for(uint i = 0; i < approvers.length; i++) {
            if(transactions[_transactionId].approved[approvers[i]] == false) {
                return false;
            }
        }

        return true;
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
                _totalAmount += dao.balance;
            } else {
                _totalAmount += IERC20(tokens[i]).balanceOf(dao);
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


    function _getAmountOfMembersByRatio(uint256 _totalAmount, address[] memory members, uint256[] memory amountsForRatio, uint256 totalAmountForRatio) internal pure returns (address[] memory, uint256[] memory) {
        require(members.length == amountsForRatio.length, "invalid input");
        
        uint256[] memory amounts = new uint[](members.length);
        uint256 amountLeft = _totalAmount;
        for(uint i = 0; i < members.length - 1; i++) {
            amounts[i] = _totalAmount * amountsForRatio[i] / totalAmountForRatio;
            amountLeft -= _totalAmount * amountsForRatio[i] / totalAmountForRatio;
        }

        amounts[members.length - 1] = amountLeft;

        return (members, amounts);
    }

    function _getAmountsOfAllMembersOnProRata(address _token, uint256 _totalAmount) internal view returns (address[] memory, uint256[] memory) {
        address _membership = IDao(dao).membership();
        address mt = IDao(dao).multiToken();
        uint256 tokenId = IMultiToken(mt).addressToId(_token);
        address[] memory members = IMembership(_membership).getAllMembers();
        uint256[] memory amounts = new uint[](members.length);

        uint256 totalBalance = IMultiToken(mt).tokenTotalSupply(tokenId);

        uint256 amountLeft = _totalAmount;
        
        for(uint i = 0; i < members.length - 1; i++) {
            uint256 memberBalance = IMultiToken(mt).balanceOf(members[i], tokenId);
            amounts[i] = _totalAmount * memberBalance / totalBalance;
            amountLeft -= _totalAmount * memberBalance / totalBalance;
        }

        amounts[members.length - 1] = amountLeft;

        return (members, amounts);
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function execute(address, bytes memory, uint256) public virtual;

    function encodeTransactionData(address _to, bytes memory _data, uint256 _amount) public pure returns (bytes memory) {
        return abi.encodeWithSignature("execute(address,bytes,uint256)", _to, _data, _amount);
    }

    function decodeTransactionData(bytes memory _data) public pure returns (address, bytes memory, uint256) {

        if(_data.toBytes4(0) != 0xa04a0908) {
            // execute(address,bytes,uint256)
            revert("unexpected function call");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (address, bytes, uint256));
    }

    function encodeInitializeData(InitializeParams calldata params) public pure returns (bytes memory data) {
        return abi.encodeWithSelector(
            this.initialize.selector,
            params
        );
    }

    function decodeInitializeData(bytes memory _data) public pure returns (InitializeParams memory result) {

        if(_data.toBytes4(0) != this.initialize.selector) {
            revert("unexpected function");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (InitializeParams));
    }

    function supportsInterface(bytes4 interfaceID) external pure virtual returns (bool) {
        // execute(address,bytes,uint256)
        if(interfaceID == 0xa04a0908) {
            return true;
        }

        return false;
    }

    receive() external payable {}
}