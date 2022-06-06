# Solidity API

## IUniswapBudgetApproval

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

### AllowToToken

```solidity
event AllowToToken(address token)
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

### ETH_TOKEN_ADDRESS

```solidity
function ETH_TOKEN_ADDRESS() external view returns (address)
```

### UNISWAP_ROUTER

```solidity
function UNISWAP_ROUTER() external view returns (address)
```

### WETH_TOKEN_ADDRESS

```solidity
function WETH_TOKEN_ADDRESS() external view returns (address)
```

### afterInitialized

```solidity
function afterInitialized() external
```

### allowAllAddresses

```solidity
function allowAllAddresses() external view returns (bool)
```

### allowAllToTokens

```solidity
function allowAllToTokens() external view returns (bool)
```

### allowAnyAmount

```solidity
function allowAnyAmount() external view returns (bool)
```

### allowUnlimitedUsageCount

```solidity
function allowUnlimitedUsageCount() external view returns (bool)
```

### amountPercentage

```solidity
function amountPercentage() external view returns (uint8)
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

### assetEthPrice

```solidity
function assetEthPrice(address asset, uint256 amount) external view returns (uint256)
```

### canResolvePrice

```solidity
function canResolvePrice(address asset) external view returns (bool)
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

### decodeUniswapDataAfterSwap

```solidity
function decodeUniswapDataAfterSwap(address to, bytes _data, uint256 amount, bytes swapResult) external view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
```

### decodeUniswapDataBeforeSwap

```solidity
function decodeUniswapDataBeforeSwap(address to, bytes _data, uint256 amount) external view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
```

### endTime

```solidity
function endTime() external view returns (uint256)
```

### exactInput

```solidity
function exactInput(struct IUniswapSwapper.ExactOutputParams params) external pure returns (address, address, uint256, uint256, bool, bool)
```

### exactInputSingle

```solidity
function exactInputSingle(struct IUniswapSwapper.ExactOutputSingleParams params) external pure returns (address, address, uint256, uint256, bool, bool)
```

### exactOutput

```solidity
function exactOutput(struct IUniswapSwapper.ExactOutputParams params) external pure returns (address, address, uint256, uint256, bool, bool)
```

### exactOutputSingle

```solidity
function exactOutputSingle(struct IUniswapSwapper.ExactOutputSingleParams params) external pure returns (address, address, uint256, uint256, bool, bool)
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

### fromTokens

```solidity
function fromTokens(uint256) external view returns (address)
```

### fromTokensMapping

```solidity
function fromTokensMapping(address) external view returns (bool)
```

### initialize

```solidity
function initialize(struct ICommonBudgetApproval.InitializeParams params, address[] _fromTokens, bool _allowAllToTokens, address[] _toTokens, bool _allowAnyAmount, uint256 _totalAmount, uint8 _amountPercentage) external
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

### registry

```solidity
function registry() external view returns (address)
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

### swapExactTokensForTokens

```solidity
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address) external pure returns (address, address, uint256, uint256, bool, bool)
```

### swapTokensForExactTokens

```solidity
function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address) external pure returns (address, address, uint256, uint256, bool, bool)
```

### text

```solidity
function text() external view returns (string)
```

### toTokensMapping

```solidity
function toTokensMapping(address) external view returns (bool)
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

## IUniswapSwapper

### ExactOutputParams

```solidity
struct ExactOutputParams {
  bytes path;
  address recipient;
  uint256 amountOut;
  uint256 amountInMaximum;
}
```

### ExactOutputSingleParams

```solidity
struct ExactOutputSingleParams {
  address tokenIn;
  address tokenOut;
  uint24 fee;
  address recipient;
  uint256 amountOut;
  uint256 amountInMaximum;
  uint160 sqrtPriceLimitX96;
}
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

