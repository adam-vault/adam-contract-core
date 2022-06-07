# Solidity API

## UniswapSwapper

### decodeUniswapDataBeforeSwap

```solidity
function decodeUniswapDataBeforeSwap(address to, bytes _data, uint256 amount) public view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
```

decode uniswap bytes data without result

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | "to" field from uniswap |
| _data | bytes | "data" field from uniswap |
| amount | uint256 | "value" field from uniswap |

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | token used to swap |
| tokenOut | address | token received from swap |
| amountIn | uint256 | amount of tokenIn |
| amountOut | uint256 | amount of tokenOut |
| estimatedIn | bool | tokenIn amount is estimated |
| estimatedOut | bool | tokenOut amount is estimated |

### decodeUniswapDataAfterSwap

```solidity
function decodeUniswapDataAfterSwap(address to, bytes _data, uint256 amount, bytes swapResult) public view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
```

decode uniswap bytes data without result

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | "to" field from uniswap |
| _data | bytes | "data" field from uniswap |
| amount | uint256 | "value" field from uniswap |
| swapResult | bytes | execution result from uniswap |

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | token used to swap |
| tokenOut | address | token received from swap |
| amountIn | uint256 | amount of tokenIn |
| amountOut | uint256 | amount of tokenOut |
| estimatedIn | bool | tokenIn amount is estimated |
| estimatedOut | bool | tokenOut amount is estimated |

### _decodeWETH9

```solidity
function _decodeWETH9(bytes _data, uint256 amount) internal pure returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)
```

### _decodeUniswapRouter

```solidity
function _decodeUniswapRouter(bytes _data, uint256 amount) internal view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
```

### _decodeUniswapRouter

```solidity
function _decodeUniswapRouter(bytes _data, uint256 amount, bytes[] decodedResults) internal view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut)
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

### exactOutputSingle

```solidity
function exactOutputSingle(struct UniswapSwapper.ExactOutputSingleParams params) public pure returns (address, address, uint256, uint256, bool, bool)
```

### ExactInputSingleParams

```solidity
struct ExactInputSingleParams {
  address tokenIn;
  address tokenOut;
  uint24 fee;
  address recipient;
  uint256 amountIn;
  uint256 amountOutMinimum;
  uint160 sqrtPriceLimitX96;
}
```

### exactInputSingle

```solidity
function exactInputSingle(struct UniswapSwapper.ExactInputSingleParams params) public pure returns (address, address, uint256, uint256, bool, bool)
```

### ExactOutputParams

```solidity
struct ExactOutputParams {
  bytes path;
  address recipient;
  uint256 amountOut;
  uint256 amountInMaximum;
}
```

### exactOutput

```solidity
function exactOutput(struct UniswapSwapper.ExactOutputParams params) public pure returns (address, address, uint256, uint256, bool, bool)
```

### ExactInputParams

```solidity
struct ExactInputParams {
  bytes path;
  address recipient;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### exactInput

```solidity
function exactInput(struct UniswapSwapper.ExactInputParams params) public pure returns (address, address, uint256, uint256, bool, bool)
```

### swapTokensForExactTokens

```solidity
function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address) public pure returns (address, address, uint256, uint256, bool, bool)
```

### swapExactTokensForTokens

```solidity
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address) public pure returns (address, address, uint256, uint256, bool, bool)
```

