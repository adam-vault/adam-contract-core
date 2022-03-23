// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../lib/BytesLib.sol";

import "../interface/IDao.sol";
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

    event CreateTransaction(uint256 _id, bytes _data, uint256 _deadline);

    Counters.Counter private _transactionIds;

    mapping(uint256 => Transaction) public transactions;

    address constant public ETH_ADDRESS = address(0x0);

    address public executor;
    address public dao;

    address[] public approvers;
    mapping(address => bool) public approversMapping;

    string public text;
    string public transactionType;

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;

    bool public allowAllTokens;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;

    bool public allowAnyAmount;
    uint256 public totalAmount;

    uint8 public amountPercentage;

    modifier onlyDao {
        require(msg.sender == dao, "access denied");
        _;
    }

    modifier onlyApprover () {
        require(approversMapping[msg.sender] == true, "access denied");
        _;
    }

    modifier onlyExecutor () {
        require(msg.sender == executor, "access denied");
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

    modifier checkDeadline(uint256 _transactionId) {
        require(block.timestamp <= transactions[_transactionId].deadline, "transaction expired");
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
        bool allowAllTokens;
        address[] tokens;
        bool allowAnyAmount;
        uint256 totalAmount;
        uint8 amountPercentage;
    }

    function initialize(
        InitializeParams calldata params
        ) public initializer {
        dao = params.dao;
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
        }

        allowAllTokens = params.allowAllTokens;
        tokens = params.tokens;
        for(uint i = 0; i < params.tokens.length; i++) {
            tokensMapping[params.tokens[i]] = true;
        }

        allowAnyAmount = params.allowAnyAmount;
        totalAmount = params.totalAmount;
        amountPercentage = params.amountPercentage;
    }

    function NAME() external virtual returns (string calldata);

    function executeTransaction(uint256 _transactionId) external onlyExecutor matchStatus(_transactionId, Status.Approved) checkDeadline(_transactionId) {
        (bool success, bytes memory result) = address(this).call(transactions[_transactionId].data);

        require(success == true, string(result));
    }

    function createTransaction(bytes memory _data, uint256 _deadline) external onlyDao returns (uint256) {
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
        return allowAllTokens || tokensMapping[token];
    }

    function checkAmountValid(uint256 amount) public view returns (bool) {
        return allowAnyAmount || amount < totalAmount;
    }

    function checkAmountPercentageValid(uint256 amount, bool executed) public view returns (bool) {

        uint256 _totalAmount;
        address[] memory ownedTokens;

        if(executed) {
            _totalAmount += amount;
        }

        if(allowAllTokens == true) {
            ownedTokens =  IDao(dao).getMintedContracts();
        } else {
            ownedTokens = tokens;
        }

        for(uint i = 0; i < ownedTokens.length; i++) {
            if(ownedTokens[i] == ETH_ADDRESS) {
                _totalAmount += dao.balance;
            } else {
                _totalAmount += IERC20(ownedTokens[i]).balanceOf(dao);
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
        address[] memory members = IMembership(_membership).getAllMembers();
        uint256[] memory amounts = new uint[](members.length);

        uint256 totalBalance = IDao(dao).tokenTotalSupply(IDao(dao).addressToId(_token));

        uint256 amountLeft = _totalAmount;
        for(uint i = 0; i < members.length - 1; i++) {
            uint256 memberBalance = IDao(dao).balanceOf(members[i], IDao(dao).addressToId(_token));
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

        // initialize((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8))
        if(_data.toBytes4(0) != 0x28746e66) {
            revert("unexpected function");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (InitializeParams));
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        // execute(address,bytes,uint256)
        if(interfaceID == 0xa04a0908) {
            return true;
        }

        return false;
    }

    receive() external payable {}
}