# Solidity API

## BudgetApprovalExecutee

### budgetApprovals

```solidity
mapping(address => bool) budgetApprovals
```

### CreateBudgetApproval

```solidity
event CreateBudgetApproval(address budgetApproval, bytes data)
```

### onlyBudgetApproval

```solidity
modifier onlyBudgetApproval()
```

### executeByBudgetApproval

```solidity
function executeByBudgetApproval(address _to, bytes _data, uint256 _value) external returns (bytes)
```

### _beforeCreateBudgetApproval

```solidity
function _beforeCreateBudgetApproval(address) internal virtual
```

### createBudgetApprovals

```solidity
function createBudgetApprovals(address[] _budgetApprovals, bytes[] data) public
```

create budget approvals

| Name | Type | Description |
| ---- | ---- | ----------- |
| _budgetApprovals | address[] | addresses of budget approval templates |
| data | bytes[] | bytes of initialize data |

