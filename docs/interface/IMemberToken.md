# Solidity API

## IMemberToken

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

### DelegateChanged

```solidity
event DelegateChanged(address delegator, address fromDelegate, address toDelegate)
```

### DelegateVotesChanged

```solidity
event DelegateVotesChanged(address delegate, uint256 previousBalance, uint256 newBalance)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

### DOMAIN_SEPARATOR

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

### checkpoints

```solidity
function checkpoints(address account, uint32 pos) external view returns (struct IERC20VotesUpgradeable.Checkpoint)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool)
```

### delegate

```solidity
function delegate(address delegatee) external
```

### delegateBySig

```solidity
function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

### delegates

```solidity
function delegates(address account) external view returns (address)
```

### getPastTotalSupply

```solidity
function getPastTotalSupply(uint256 blockNumber) external view returns (uint256)
```

### getPastVotes

```solidity
function getPastVotes(address account, uint256 blockNumber) external view returns (uint256)
```

### getVotes

```solidity
function getVotes(address account) external view returns (uint256)
```

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external returns (bool)
```

### initialize

```solidity
function initialize(address _minter, string _name, string _symbol) external
```

### mint

```solidity
function mint(address account, uint256 amount) external
```

### minter

```solidity
function minter() external view returns (address)
```

### name

```solidity
function name() external view returns (string)
```

### nonces

```solidity
function nonces(address owner) external view returns (uint256)
```

### numCheckpoints

```solidity
function numCheckpoints(address account) external view returns (uint32)
```

### permit

```solidity
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
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

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external returns (bool)
```

## IERC20VotesUpgradeable

### Checkpoint

```solidity
struct Checkpoint {
  uint32 fromBlock;
  uint224 votes;
}
```

