// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "hardhat/console.sol";


contract SelfClaimERC20BudgetApproval is Initializable {
  using BytesLib for bytes;
  using Counters for Counters.Counter;

  string public constant name = "SelfClaim ERC20 Budget Approval";

  // !!Caution Approved and Cancelled should not be used in this budgetApproval
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
  }

  event CreateTransaction(
    uint256 indexed id,
    bytes[] data,
    uint256 deadline,
    Status status,
    string comment,
    address creator
  );

  event ExecuteTransaction(
    uint256 indexed id,
    bytes[] data,
    address _executor
  );

  event AllowAddress(address target);
  event AllowToken(address token);
  event AllowAmount(uint256 amount);
  event ExecuteSelfClaimERC20Transaction(
    uint256 indexed id,
    address indexed executor,
    address indexed toAddress,
    address token,
    uint256 amount
  );
  
  Counters.Counter private _transactionIds;

  mapping(uint256 => Transaction) public transactions;

  address private _executee;
  string private _text;
  string private _transactionType;

  bool private _allowUnlimitedUsageCount;
  uint256 private _usageCount;

  uint256 private _startTime;
  uint256 private _endTime;

  // Any receiver
  bool public allowAllAddresses;
  mapping(address => bool) public addressesMapping;
  // only support single ERC20 token
  address public token;
  bool public allowAnyAmount;
  uint256 public totalAmount;
  uint256 public fixClaimAmount;

  mapping(address => bool) private claimedAddrMapping;

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
    address team; // TODO: Get team from IBudgetApprovalExecutee
  }

  modifier onlyExecutee() {
    require(msg.sender == executee(), "Executee not whitelisted in budget");
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

  constructor() {
    _disableInitializers();
  }

  function initialize(
    InitializeParams calldata params,
      bool _allowAllAddresses,
      address[] memory _toAddresses,
      address _token,
      bool _allowAnyAmount,
      uint256 _totalAmount,
      uint256 _fixClaimAmount
  ) external initializer {
    __BudgetApproval_init(params);

    allowAllAddresses = _allowAllAddresses;
    for (uint256 i = 0; i < _toAddresses.length; i++) {
      _addToAddress(_toAddresses[i]);
    }

    token = _token;
    allowAnyAmount = _allowAnyAmount;
    totalAmount = _totalAmount;
    fixClaimAmount = _fixClaimAmount;
  }

  function executeParams() external pure returns (string[] memory) {
    string[] memory arr = new string[](2);
    arr[0] = "address token";
    arr[1] = "address to";
    return arr;
  }

  function _execute(uint256 transactionId, bytes memory data) internal
  {
    require(claimedAddrMapping[msg.sender] == false, "Address already claimed");

    (address token, address to) = abi.decode(
        data,
        (address, address)
    );
    uint256 _totalAmount = totalAmount;
    bool _allowAnyAmount = allowAnyAmount;

    if (token == Denominations.ETH) {
      IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
        to,
        "",
        fixClaimAmount
      );
    } else {
      bytes memory executeData = abi.encodeWithSelector(
        IERC20.transfer.selector,
        to,
        fixClaimAmount
      );
      IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
        token,
        executeData,
        0
      );
    }

    claimedAddrMapping[msg.sender] = true;
    require(allowAllAddresses || addressesMapping[to], "Recipient not whitelisted in budget");
    require(token != address(0), "Token not whitelisted in budget");
    require(
        _allowAnyAmount || fixClaimAmount <= _totalAmount,
        "Exceeded max budget transferable amount"
    );

    if (!_allowAnyAmount) {
        totalAmount = _totalAmount - fixClaimAmount;
    }

    emit ExecuteSelfClaimERC20Transaction(
      transactionId,
      msg.sender,
      to,
      token,
      fixClaimAmount
    );
  }

  function executor() public view returns (address) {
    return address(0);
  }

  function executorTeamId() public view returns (uint256) {
    return 0;
  }

  function executee() public view returns (address) {
    return _executee;
  }

  function approversMapping(address eoa) public view returns (bool) {
    return false;
  }

  function approverTeamId() public view returns (uint256) {
    return 0;
  }

  function minApproval() public view returns (uint256) {
    return 0;
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
    return address(0);
  }

  function __BudgetApproval_init(InitializeParams calldata params)
    internal
    onlyInitializing
  {
    _executee = msg.sender;
    _text = params.text;
    _transactionType = params.transactionType;

    _startTime = params.startTime;
    _endTime = params.endTime;

    _allowUnlimitedUsageCount = params.allowUnlimitedUsageCount;
    _usageCount = params.usageCount;
  }

  function afterInitialized() external virtual onlyExecutee {}

  function executeTransaction(uint256 id)
    public
    checkTime(id)
  {
    bool unlimited = allowUnlimitedUsageCount();
    uint256 count = usageCount();
    bytes[] memory data = transactions[id].data;

    for (uint256 i = 0; i < data.length; i++) {
      require(unlimited || count > 0, "Exceeded budget usage limit");
      if (!unlimited) {
        count --;
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
  ) external returns (uint256) {
    _transactionIds.increment();
    uint256 id = _transactionIds.current();

    // workaround when have mapping in Struct
    Transaction storage newTransaction = transactions[id];
    newTransaction.id = id;
    newTransaction.data = _data;
    newTransaction.deadline = _deadline;
    newTransaction.isExist = true;
    
    transactions[id].status = Status.Pending;

    emit CreateTransaction(
      id,
      _data,
      _deadline,
      newTransaction.status,
      comment,
      msg.sender
    );

    // Ignore _isExecute as it must be true, keep param for the sake of interface unitization
    executeTransaction(id);
    
    return id;
  }

  function _addToAddress(address to) internal {
    require(
      !addressesMapping[to],
      "Duplicated address in target address list"
    );
    addressesMapping[to] = true;
    emit AllowAddress(to);
  }
}
