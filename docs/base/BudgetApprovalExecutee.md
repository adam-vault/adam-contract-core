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

execution called by budget approval

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | target address to call |
| _data | bytes | call data |
| _value | uint256 | eth value of call |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | bytes result of call |

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

