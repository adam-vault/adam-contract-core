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

### ethShares

```solidity
function ethShares(uint256 amount) public view returns (uint256)
```

### quote

```solidity
function quote(uint256 eth) public view returns (uint256)
```

### canAddAsset

```solidity
function canAddAsset(address asset) public view returns (bool)
```

### totalPrice

```solidity
function totalPrice() public view returns (uint256)
```

### deposit

```solidity
function deposit() public payable
```

### redeem

```solidity
function redeem(uint256 amount) public
```

### depositToken

```solidity
function depositToken(address asset, uint256 amount) public
```

### addAssets

```solidity
function addAssets(address[] erc20s) public
```

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

