# Solidity API

## ITransferERC721BudgetApproval

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### AllowAddress

```solidity
event AllowAddress(address target)
```

### AllowAmount

```solidity
event AllowAmount(uint256 amount)
```

### AllowToken

```solidity
event AllowToken(address token)
```

### ApproveTransaction

```solidity
event ApproveTransaction(uint256 id, address approver)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateTransaction

```solidity
event CreateTransaction(uint256 id, bytes[] data, uint256 deadline, uint8 status)
```

### ExecuteTransaction

```solidity
event ExecuteTransaction(uint256 id, bytes[] data)
```

### RevokeTransaction

```solidity
event RevokeTransaction(uint256 id)
```

### SetApprover

```solidity
event SetApprover(address approver)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### ETH_ADDRESS

```solidity
function ETH_ADDRESS() external view returns (address)
```

### addressesMapping

```solidity
function addressesMapping(address) external view returns (bool)
```

### afterInitialized

```solidity
function afterInitialized() external
```

### allowAllAddresses

```solidity
function allowAllAddresses() external view returns (bool)
```

### allowAnyAmount

```solidity
function allowAnyAmount() external view returns (bool)
```

### allowUnlimitedUsageCount

```solidity
function allowUnlimitedUsageCount() external view returns (bool)
```

### approveTransaction

```solidity
function approveTransaction(uint256 id) external
```

### approvedCountOf

```solidity
function approvedCountOf(uint256 id) external view returns (uint256)
```

### approversMapping

```solidity
function approversMapping(address) external view returns (bool)
```

### createTransaction

```solidity
function createTransaction(bytes[] _data, uint256 _deadline, bool _isExecute) external returns (uint256)
```

### dao

```solidity
function dao() external view returns (address)
```

### deadlineOf

```solidity
function deadlineOf(uint256 id) external view returns (uint256)
```

### endTime

```solidity
function endTime() external view returns (uint256)
```

### executeParams

```solidity
function executeParams() external pure returns (string[])
```

### executeTransaction

```solidity
function executeTransaction(uint256 id) external
```

### executee

```solidity
function executee() external view returns (address)
```

### executor

```solidity
function executor() external view returns (address)
```

### initialize

```solidity
function initialize(struct ICommonBudgetApproval.InitializeParams params, bool _allowAllAddresses, address[] _toAddresses, address[] _tokens, bool _allowAnyAmount, uint256 _totalAmount) external
```

### minApproval

```solidity
function minApproval() external view returns (uint256)
```

### name

```solidity
function name() external view returns (string)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### revokeTransaction

```solidity
function revokeTransaction(uint256 id) external
```

### startTime

```solidity
function startTime() external view returns (uint256)
```

### statusOf

```solidity
function statusOf(uint256 id) external view returns (uint8)
```

### text

```solidity
function text() external view returns (string)
```

### tokens

```solidity
function tokens(uint256) external view returns (address)
```

### tokensMapping

```solidity
function tokensMapping(address) external view returns (bool)
```

### totalAmount

```solidity
function totalAmount() external view returns (uint256)
```

### transactionType

```solidity
function transactionType() external view returns (string)
```

### transactions

```solidity
function transactions(uint256) external view returns (uint256 id, uint8 status, uint256 deadline, uint256 approvedCount, bool isExist)
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

### usageCount

```solidity
function usageCount() external view returns (uint256)
```

## ICommonBudgetApproval

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

