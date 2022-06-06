# Solidity API

## MemberToken

### minter

```solidity
address minter
```

### onlyMinter

```solidity
modifier onlyMinter()
```

### initialize

```solidity
function initialize(address _minter, string _name, string _symbol) public
```

### mint

```solidity
function mint(address account, uint256 amount) public
```

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

_Move voting power when tokens are transferred.

Emits a {DelegateVotesChanged} event._

### getPastTotalSupply

```solidity
function getPastTotalSupply(uint256 blockNumber) public view returns (uint256)
```

_Retrieve the `totalSupply` at the end of `blockNumber`. Note, this value is the sum of all balances.
It is but NOT the sum of all the delegated votes!

Requirements:

- `blockNumber` must have been already mined_

### getPastVotes

```solidity
function getPastVotes(address account, uint256 blockNumber) public view returns (uint256)
```

_Retrieve the number of votes for `account` at the end of `blockNumber`.

Requirements:

- `blockNumber` must have been already mined_

### getVotes

```solidity
function getVotes(address account) public view virtual returns (uint256)
```

_Gets the current votes balance for `account`_

