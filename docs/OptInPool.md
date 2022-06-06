# Solidity API

## OptInPool

### depositPool

```solidity
contract IDepositPool depositPool
```

### depositToken

```solidity
address depositToken
```

### redeemTokens

```solidity
address[] redeemTokens
```

### isRedeemTokens

```solidity
mapping(address => bool) isRedeemTokens
```

### depositThreshold

```solidity
uint256 depositThreshold
```

### recevied

```solidity
uint256 recevied
```

### depositDeadline

```solidity
uint256 depositDeadline
```

### redeemTime

```solidity
uint256 redeemTime
```

### AllowDepositToken

```solidity
event AllowDepositToken(address token)
```

### initialize

```solidity
function initialize(address _depositPool, address _depositToken, uint256 _depositThreshold, uint256 _depositDeadline, address[] _redeemTokens, uint256 _redeemTime, address[] _budgetApprovals, bytes[] _budgetApprovalsData) public
```

### assetsShares

```solidity
function assetsShares(address asset, uint256 amount) public view returns (uint256)
```

### ethShares

```solidity
function ethShares(uint256 amount) public view returns (uint256)
```

### join

```solidity
function join(uint256 amount) public
```

### refund

```solidity
function refund(address[] accounts) public
```

### redeem

```solidity
function redeem(address[] accounts) public
```

### transferERC721

```solidity
function transferERC721(address erc721, address recipient, uint256 id) public
```

### transferERC20

```solidity
function transferERC20(address erc20, address recipient, uint256 amount) public
```

### _beforeCreateBudgetApproval

```solidity
function _beforeCreateBudgetApproval(address budgetApproval) internal view
```

### _refund

```solidity
function _refund(address account) internal
```

### _depositToDP

```solidity
function _depositToDP(address asset, uint256 amount) internal
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

