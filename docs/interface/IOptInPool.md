# Solidity API

## IOptInPool

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

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
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

### createBudgetApprovals

```solidity
function createBudgetApprovals(address[] _budgetApprovals, bytes[] data) external
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool)
```

### depositDeadline

```solidity
function depositDeadline() external view returns (uint256)
```

### depositPool

```solidity
function depositPool() external view returns (address)
```

### depositThreshold

```solidity
function depositThreshold() external view returns (uint256)
```

### depositToken

```solidity
function depositToken() external view returns (address)
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
function initialize(address _depositPool, address _depositToken, uint256 _depositThreshold, uint256 _depositDeadline, address[] _redeemTokens, uint256 _redeemTime, address[] _budgetApprovals, bytes[] _budgetApprovalsData) external
```

### isRedeemTokens

```solidity
function isRedeemTokens(address) external view returns (bool)
```

### join

```solidity
function join(uint256 amount) external
```

### name

```solidity
function name() external view returns (string)
```

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) external returns (bytes4)
```

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) external returns (bytes4)
```

### onERC721Received

```solidity
function onERC721Received(address, address, uint256, bytes) external returns (bytes4)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### recevied

```solidity
function recevied() external view returns (uint256)
```

### redeem

```solidity
function redeem(address[] accounts) external
```

### redeemTime

```solidity
function redeemTime() external view returns (uint256)
```

### redeemTokens

```solidity
function redeemTokens(uint256) external view returns (address)
```

### refund

```solidity
function refund(address[] accounts) external
```

### registry

```solidity
function registry() external view returns (address)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### transfer

```solidity
function transfer(address to, uint256 amount) external returns (bool)
```

### transferERC20

```solidity
function transferERC20(address erc20, address recipient, uint256 amount) external
```

### transferERC721

```solidity
function transferERC721(address erc721, address recipient, uint256 id) external
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

