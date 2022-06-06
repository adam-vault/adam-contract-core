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

