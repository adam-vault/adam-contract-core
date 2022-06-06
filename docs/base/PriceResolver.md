# Solidity API

## PriceResolver

### assetEthPrice

```solidity
function assetEthPrice(address asset, uint256 amount) public view returns (uint256)
```

get value in ETH of asset

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | address of token |
| amount | uint256 | amount of token |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | ETH value |

### canResolvePrice

```solidity
function canResolvePrice(address asset) public view returns (bool)
```

