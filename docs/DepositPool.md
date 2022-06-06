# Solidity API

## DepositPool

### dao

```solidity
contract IDao dao
```

### _tokenIds

```solidity
struct Counters.Counter _tokenIds
```

### contractAddress

```solidity
mapping(uint256 => address) contractAddress
```

### idOf

```solidity
mapping(address => uint256) idOf
```

### totalSupply

```solidity
mapping(address => uint256) totalSupply
```

### isAssetSupported

```solidity
mapping(address => bool) isAssetSupported
```

### CreateToken

```solidity
event CreateToken(uint256 id, address contractAddress)
```

### AllowDepositToken

```solidity
event AllowDepositToken(uint256 id, address contractAddress)
```

### DisallowDepositToken

```solidity
event DisallowDepositToken(uint256 id, address contractAddress)
```

### onlyDao

```solidity
modifier onlyDao()
```

### initialize

```solidity
function initialize(address owner, address feedRegistry, address[] depositTokens) public
```

### name

```solidity
function name(address asset) public view returns (string)
```

### decimals

```solidity
function decimals(address asset) public view returns (uint8)
```

### uri

```solidity
function uri(uint256 _id) public view returns (string)
```

### canAddAsset

```solidity
function canAddAsset(address asset) public view returns (bool)
```

### canCreateBudgetApproval

```solidity
function canCreateBudgetApproval(address budgetApproval) public view returns (bool)
```

### deposit

```solidity
function deposit() public payable
```

### depositToken

```solidity
function depositToken(address asset, uint256 amount) public
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount) public
```

### addAssets

```solidity
function addAssets(address[] erc20s) public
```

### _addAssets

```solidity
function _addAssets(address[] erc20s) internal
```

### _addAsset

```solidity
function _addAsset(address asset) internal
```

### _afterDeposit

```solidity
function _afterDeposit(address account, uint256 eth) private
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

