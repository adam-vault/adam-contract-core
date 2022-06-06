# Solidity API

## IDepositPool

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### AllowDepositToken

```solidity
event AllowDepositToken(uint256 id, address contractAddress)
```

### ApprovalForAll

```solidity
event ApprovalForAll(address account, address operator, bool approved)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateToken

```solidity
event CreateToken(uint256 id, address contractAddress)
```

### DisallowDepositToken

```solidity
event DisallowDepositToken(uint256 id, address contractAddress)
```

### TransferBatch

```solidity
event TransferBatch(address operator, address from, address to, uint256[] ids, uint256[] values)
```

### TransferSingle

```solidity
event TransferSingle(address operator, address from, address to, uint256 id, uint256 value)
```

### URI

```solidity
event URI(string value, uint256 id)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### addAssets

```solidity
function addAssets(address[] erc20s) external
```

### assetEthPrice

```solidity
function assetEthPrice(address asset, uint256 amount) external view returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address account, uint256 id) external view returns (uint256)
```

### balanceOfBatch

```solidity
function balanceOfBatch(address[] accounts, uint256[] ids) external view returns (uint256[])
```

### canAddAsset

```solidity
function canAddAsset(address asset) external view returns (bool)
```

### canCreateBudgetApproval

```solidity
function canCreateBudgetApproval(address budgetApproval) external view returns (bool)
```

### canResolvePrice

```solidity
function canResolvePrice(address asset) external view returns (bool)
```

### contractAddress

```solidity
function contractAddress(uint256) external view returns (address)
```

### dao

```solidity
function dao() external view returns (address)
```

### decimals

```solidity
function decimals(address asset) external view returns (uint8)
```

### deposit

```solidity
function deposit() external payable
```

### depositToken

```solidity
function depositToken(address asset, uint256 amount) external
```

### idOf

```solidity
function idOf(address) external view returns (uint256)
```

### initialize

```solidity
function initialize(address owner, address feedRegistry, address[] depositTokens) external
```

### isApprovedForAll

```solidity
function isApprovedForAll(address account, address operator) external view returns (bool)
```

### isAssetSupported

```solidity
function isAssetSupported(address) external view returns (bool)
```

### name

```solidity
function name(address asset) external view returns (string)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### registry

```solidity
function registry() external view returns (address)
```

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) external
```

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external
```

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

### totalSupply

```solidity
function totalSupply(address) external view returns (uint256)
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

### uri

```solidity
function uri(uint256 _id) external view returns (string)
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external
```

