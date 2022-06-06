# Solidity API

## MockLPDao

### locktime

```solidity
uint256 locktime
```

### minDepositAmount

```solidity
uint256 minDepositAmount
```

### minTokenToAdmit

```solidity
uint256 minTokenToAdmit
```

### memberToken

```solidity
address memberToken
```

### admissionToken

```solidity
address admissionToken
```

### firstDepositTime

```solidity
mapping(address => uint256) firstDepositTime
```

### isMember

```solidity
mapping(address => bool) isMember
```

### isOptInPool

```solidity
mapping(address => bool) isOptInPool
```

### byPassGovern

```solidity
function byPassGovern(address) public pure returns (bool)
```

### govern

```solidity
function govern(string) public pure returns (address)
```

### setLocktime

```solidity
function setLocktime(uint256 lt) public
```

### setMemberToken

```solidity
function setMemberToken(address mt) public
```

### setAdmissionToken

```solidity
function setAdmissionToken(address at) public
```

### setMinDepositAmount

```solidity
function setMinDepositAmount(uint256 amount) public
```

### setFirstDepositTime

```solidity
function setFirstDepositTime(address account) public
```

### setMinTokenToAdmit

```solidity
function setMinTokenToAdmit(uint256 amount) public
```

### canCreateBudgetApproval

```solidity
function canCreateBudgetApproval(address) public pure returns (bool)
```

### mintMember

```solidity
function mintMember(address account) public
```

