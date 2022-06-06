# Solidity API

## ILiquidPool

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### AllowDepositToken

```solidity
event AllowDepositToken(address token)
```

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateBudgetApproval

```solidity
event CreateBudgetApproval(address budgetApproval, bytes data)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### addAssets

```solidity
function addAssets(address[] erc20s) external
```

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

### assetEthPrice

```solidity
function assetEthPrice(address asset, uint256 amount) external view returns (uint256)
```

### assets

```solidity
function assets(uint256) external view returns (address)
```

### assetsShares

```solidity
function assetsShares(address asset, uint256 amount) external view returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

### budgetApprovals

```solidity
function budgetApprovals(address) external view returns (bool)
```

### canAddAsset

```solidity
function canAddAsset(address asset) external view returns (bool)
```

### canResolvePrice

```solidity
function canResolvePrice(address asset) external view returns (bool)
```

### createBudgetApprovals

```solidity
function createBudgetApprovals(address[] _budgetApprovals, bytes[] data) external
```

### dao

```solidity
function dao() external view returns (address)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool)
```

### deposit

```solidity
function deposit() external payable
```

### depositToken

```solidity
function depositToken(address asset, uint256 amount) external
```

### ethShares

```solidity
function ethShares(uint256 amount) external view returns (uint256)
```

### executeByBudgetApproval

```solidity
function executeByBudgetApproval(address _to, bytes _data, uint256 _value) external returns (bytes)
```

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external returns (bool)
```

### initialize

```solidity
function initialize(address owner, address feedRegistry, address[] depositTokens) external
```

### isAssetSupported

```solidity
function isAssetSupported(address) external view returns (bool)
```

### name

```solidity
function name() external view returns (string)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### quote

```solidity
function quote(uint256 eth) external view returns (uint256)
```

### redeem

```solidity
function redeem(uint256 amount) external
```

### registry

```solidity
function registry() external view returns (address)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### totalPrice

```solidity
function totalPrice() external view returns (uint256)
```

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### transfer

```solidity
function transfer(address to, uint256 amount) external returns (bool)
```

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external returns (bool)
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

### receive

```solidity
receive() external payable
```

