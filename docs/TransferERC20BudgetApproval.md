# Solidity API

## TransferERC20BudgetApproval

### name

```solidity
string name
```

### allowAllAddresses

```solidity
bool allowAllAddresses
```

### addressesMapping

```solidity
mapping(address => bool) addressesMapping
```

### tokens

```solidity
address[] tokens
```

### tokensMapping

```solidity
mapping(address => bool) tokensMapping
```

### allowAnyAmount

```solidity
bool allowAnyAmount
```

### totalAmount

```solidity
uint256 totalAmount
```

### amountPercentage

```solidity
uint8 amountPercentage
```

### initialize

```solidity
function initialize(struct CommonBudgetApproval.InitializeParams params, bool _allowAllAddresses, address[] _toAddresses, address[] _tokens, bool _allowAnyAmount, uint256 _totalAmount, uint8 _amountPercentage) public
```

_[0] dao: address of dao \
     [1] executor: address of EOA \
     [2] approvers: address of approvers \
     [3] minApproval: minimum approval needed to execute \
     [4] text: name of budget approval \
     [5] transactionType: type of budget approval \
     [6] startTime: not able to use budget approval before startTime \
     [7] endTime: not able to use budget approval after endTime \
     [8] allowUnlimitedUsageCount: allow unlimited usage count \
     [9] usageCount: number of usage count_

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct CommonBudgetApproval.InitializeParams | see above |
| _allowAllAddresses | bool | allow all receipent address |
| _toAddresses | address[] | allowed address of receipents |
| _tokens | address[] | allowed address of using tokens |
| _allowAnyAmount | bool | allow any amount |
| _totalAmount | uint256 | allowed amount |
| _amountPercentage | uint8 | percentage of allowed amount |

### executeParams

```solidity
function executeParams() public pure returns (string[])
```

check params of execute function

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string[] | string array of params |

### _execute

```solidity
function _execute(bytes data) internal
```

### checkAmountPercentageValid

```solidity
function checkAmountPercentageValid(uint256 amount) internal view returns (bool)
```

### _addToken

```solidity
function _addToken(address token) internal
```

### _addToAddress

```solidity
function _addToAddress(address to) internal
```

