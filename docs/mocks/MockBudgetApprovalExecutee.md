# Solidity API

## MockBudgetApprovalExecutee

### budgetApprovals

```solidity
mapping(address => bool) budgetApprovals
```

### memberToken

```solidity
address memberToken
```

### CreateBudgetApproval

```solidity
event CreateBudgetApproval(address budgetApproval, bytes data)
```

### executeByBudgetApproval

```solidity
function executeByBudgetApproval(address _to, bytes _data, uint256 _value) external returns (bytes)
```

### _beforeCreateBudgetApproval

```solidity
function _beforeCreateBudgetApproval(address) internal
```

### createBudgetApprovals

```solidity
function createBudgetApprovals(address[] _budgetApprovals, bytes[] data) public
```

### setMemberToken

```solidity
function setMemberToken(address _memberToken) public
```

### receive

```solidity
receive() external payable
```

