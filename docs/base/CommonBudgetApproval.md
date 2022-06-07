# Solidity API

## CommonBudgetApproval

### Status

```solidity
enum Status {
  Pending,
  Approved,
  Completed,
  Cancelled
}
```

### Transaction

```solidity
struct Transaction {
  uint256 id;
  bytes[] data;
  enum CommonBudgetApproval.Status status;
  uint256 deadline;
  mapping(address &#x3D;&gt; bool) approved;
  uint256 approvedCount;
  bool isExist;
}
```

### CreateTransaction

```solidity
event CreateTransaction(uint256 id, bytes[] data, uint256 deadline, enum CommonBudgetApproval.Status status)
```

### ApproveTransaction

```solidity
event ApproveTransaction(uint256 id, address approver)
```

### ExecuteTransaction

```solidity
event ExecuteTransaction(uint256 id, bytes[] data)
```

### RevokeTransaction

```solidity
event RevokeTransaction(uint256 id)
```

### AllowAddress

```solidity
event AllowAddress(address target)
```

### AllowToken

```solidity
event AllowToken(address token)
```

### AllowAmount

```solidity
event AllowAmount(uint256 amount)
```

### SetApprover

```solidity
event SetApprover(address approver)
```

### _transactionIds

```solidity
struct Counters.Counter _transactionIds
```

### transactions

```solidity
mapping(uint256 => struct CommonBudgetApproval.Transaction) transactions
```

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

### executor

```solidity
address executor
```

### dao

```solidity
address payable dao
```

### executee

```solidity
address executee
```

### approversMapping

```solidity
mapping(address => bool) approversMapping
```

### minApproval

```solidity
uint256 minApproval
```

### text

```solidity
string text
```

### transactionType

```solidity
string transactionType
```

### allowUnlimitedUsageCount

```solidity
bool allowUnlimitedUsageCount
```

### usageCount

```solidity
uint256 usageCount
```

### startTime

```solidity
uint256 startTime
```

### endTime

```solidity
uint256 endTime
```

### onlyApprover

```solidity
modifier onlyApprover()
```

### onlySelf

```solidity
modifier onlySelf()
```

### onlyExecutor

```solidity
modifier onlyExecutor()
```

### onlyExecutee

```solidity
modifier onlyExecutee()
```

### matchStatus

```solidity
modifier matchStatus(uint256 id, enum CommonBudgetApproval.Status status)
```

### checkTime

```solidity
modifier checkTime(uint256 id)
```

### InitializeParams

```solidity
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
```

### __BudgetApproval_init

```solidity
function __BudgetApproval_init(struct CommonBudgetApproval.InitializeParams params) internal
```

_[0] dao: address of dao \
     [1] executor: address of EOA \
     [2] approvers: address of approvers \
     [3] minApproval: minimum approval needed to execute \
     [4] text: name of budget approval \
     [5] transactionType: type of budget approval \
     [6] startTime: not able to use budget approval before startTime (timestamp in second) (0 = unlimited) \
     [7] endTime: not able to use budget approval after endTime (timestamp in second) (0 = unlimited) \
     [8] allowUnlimitedUsageCount: allow unlimited usage count \
     [9] usageCount: number of usage count_

### afterInitialized

```solidity
function afterInitialized() external virtual
```

action for budget approval after initalized

_only executee can call_

### executeTransaction

```solidity
function executeTransaction(uint256 id) public
```

execute transaction by executor

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

### createTransaction

```solidity
function createTransaction(bytes[] _data, uint256 _deadline, bool _isExecute) external returns (uint256)
```

create transaction by executor

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | bytes[] | encoded bytes of transaction |
| _deadline | uint256 | not able to execute after deadline (timestamp in second) (0 = unlimited) |
| _isExecute | bool | execute immediately after created |

### approveTransaction

```solidity
function approveTransaction(uint256 id) external
```

approve transaction by approver

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

### revokeTransaction

```solidity
function revokeTransaction(uint256 id) external
```

revoke transaction by approver

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

### statusOf

```solidity
function statusOf(uint256 id) public view returns (enum CommonBudgetApproval.Status)
```

check status of transaction

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum CommonBudgetApproval.Status | status of transaction |

### approvedCountOf

```solidity
function approvedCountOf(uint256 id) public view returns (uint256)
```

check approved count of transaction

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | number of approved count |

### deadlineOf

```solidity
function deadlineOf(uint256 id) public view returns (uint256)
```

check deadline of transaction

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | transaction id |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | deadline of transaction |

### _execute

```solidity
function _execute(bytes) internal virtual
```

### executeParams

```solidity
function executeParams() public pure virtual returns (string[])
```

check params of execute function

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string[] | string array of params |

### name

```solidity
function name() external virtual returns (string)
```

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

