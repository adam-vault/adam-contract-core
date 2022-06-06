# Solidity API

## IGovernFactory

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateGovern

```solidity
event CreateGovern(string name, address govern, address caller, uint256[] voteWeights, address[] voteTokens)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### addVoteToken

```solidity
function addVoteToken(string name, address token, uint256 weight) external
```

### createGovern

```solidity
function createGovern(string name, uint256 duration, uint256 quorum, uint256 passThreshold, uint256[] voteWeights, address[] voteTokens) external
```

### governImplementation

```solidity
function governImplementation() external view returns (address)
```

### governMap

```solidity
function governMap(address, string) external view returns (address)
```

### initialize

```solidity
function initialize(address _governImplementation) external
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

