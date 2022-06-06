# Solidity API

## UniswapBudgetApproval

### AllowToToken

```solidity
event AllowToToken(address token)
```

### name

```solidity
string name
```

### allowAllAddresses

```solidity
bool allowAllAddresses
```

### fromTokens

```solidity
address[] fromTokens
```

### fromTokensMapping

```solidity
mapping(address => bool) fromTokensMapping
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

### allowAllToTokens

```solidity
bool allowAllToTokens
```

### toTokensMapping

```solidity
mapping(address => bool) toTokensMapping
```

### initialize

```solidity
function initialize(struct CommonBudgetApproval.InitializeParams params, address[] _fromTokens, bool _allowAllToTokens, address[] _toTokens, bool _allowAnyAmount, uint256 _totalAmount, uint8 _amountPercentage) public
```

### afterInitialized

```solidity
function afterInitialized() external
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

### _addFromToken

```solidity
function _addFromToken(address token) internal
```

### _addToToken

```solidity
function _addToToken(address token) internal
```

