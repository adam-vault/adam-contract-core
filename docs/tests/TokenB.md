# Solidity API

## TokenB

### total

```solidity
uint256 total
```

### constructor

```solidity
constructor() public
```

### setTotalSupply

```solidity
function setTotalSupply(uint256 _total) public
```

### totalSupply

```solidity
function totalSupply() public view returns (uint256)
```

_See {IERC20-totalSupply}._

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

### _mint

```solidity
function _mint(address to, uint256 amount) internal
```

### mint

```solidity
function mint(address to, uint256 amount) public
```

### _burn

```solidity
function _burn(address account, uint256 amount) internal
```

