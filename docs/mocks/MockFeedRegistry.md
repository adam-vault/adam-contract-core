# Solidity API

## MockFeedRegistry

### _price

```solidity
int256 _price
```

### _feed

```solidity
mapping(address => bool) _feed
```

### setPrice

```solidity
function setPrice(int256 price) public
```

### setFeed

```solidity
function setFeed(address asset, bool supported) public
```

### latestRoundData

```solidity
function latestRoundData(address base, address quote) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### getFeed

```solidity
function getFeed(address base, address quote) external view returns (address aggregator)
```

