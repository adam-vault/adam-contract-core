# Solidity API

## GovernFactory

### governImplementation

```solidity
address governImplementation
```

### governMap

```solidity
mapping(address => mapping(string => address)) governMap
```

### CreateGovern

```solidity
event CreateGovern(string name, address govern, address caller, uint256[] voteWeights, address[] voteTokens)
```

### initialize

```solidity
function initialize(address _governImplementation) public
```

### createGovern

```solidity
function createGovern(string name, uint256 duration, uint256 quorum, uint256 passThreshold, uint256[] voteWeights, address[] voteTokens) external
```

### addVoteToken

```solidity
function addVoteToken(string name, address token, uint256 weight) external
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

