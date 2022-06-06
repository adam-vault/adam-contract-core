# Solidity API

## LiquidPool

### dao

```solidity
contract IDao dao
```

### assets

```solidity
address[] assets
```

### isAssetSupported

```solidity
mapping(address => bool) isAssetSupported
```

### AllowDepositToken

```solidity
event AllowDepositToken(address token)
```

### onlyGovern

```solidity
modifier onlyGovern(string category)
```

### onlyGovernOrDao

```solidity
modifier onlyGovernOrDao(string category)
```

### initialize

```solidity
function initialize(address owner, address feedRegistry, address[] depositTokens) public
```

### assetsShares

```solidity
function assetsShares(address asset, uint256 amount) public view returns (uint256)
```

check LP token convert to asset

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | address of asset |
| amount | uint256 | amount of asset |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount in asset |

### ethShares

```solidity
function ethShares(uint256 amount) public view returns (uint256)
```

check LP token convert to eth

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount of LP token |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount of ETH |

### quote

```solidity
function quote(uint256 eth) public view returns (uint256)
```

check eth convert to LP token

| Name | Type | Description |
| ---- | ---- | ----------- |
| eth | uint256 | eth amount |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount of LP token |

### canAddAsset

```solidity
function canAddAsset(address asset) public view returns (bool)
```

### totalPrice

```solidity
function totalPrice() public view returns (uint256)
```

get total ETH price of liquid pool assets

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | value in eth |

### deposit

```solidity
function deposit() public payable
```

deposit ETH

### redeem

```solidity
function redeem(uint256 amount) public
```

redeem amount in LP token

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount of LP token |

### depositToken

```solidity
function depositToken(address asset, uint256 amount) public
```

deposit token to liquid pool

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | address of asset |
| amount | uint256 | amount of token |

### addAssets

```solidity
function addAssets(address[] erc20s) public
```

add assets to liquid pool

| Name | Type | Description |
| ---- | ---- | ----------- |
| erc20s | address[] | addresses of ERC20s |

### _beforeCreateBudgetApproval

```solidity
function _beforeCreateBudgetApproval(address budgetApproval) internal view
```

### _assetsPrice

```solidity
function _assetsPrice() internal view returns (uint256)
```

### _afterDeposit

```solidity
function _afterDeposit(address account, uint256 eth) private
```

### _addAssets

```solidity
function _addAssets(address[] erc20s) internal
```

### _addAsset

```solidity
function _addAsset(address erc20) internal
```

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal
```

_Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
{upgradeTo} and {upgradeToAndCall}.

Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.

```solidity
function _authorizeUpgrade(address) internal override onlyOwner {}
```_

### receive

```solidity
receive() external payable
```

