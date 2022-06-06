# Solidity API

## MockDepositPool

### canCreateBudgetApproval

```solidity
bool canCreateBudgetApproval
```

### idOf

```solidity
mapping(address => uint256) idOf
```

### constructor

```solidity
constructor() public
```

### setId

```solidity
function setId(address token, uint256 tokenId) public
```

### mint

```solidity
function mint(address addr, uint256 tokenId, uint256 amount) public
```

### deposit

```solidity
function deposit() public payable
```

### withdraw

```solidity
function withdraw(address, uint256) public
```

### depositToken

```solidity
function depositToken(address token, uint256 amount) public
```

