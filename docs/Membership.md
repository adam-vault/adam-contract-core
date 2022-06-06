# Solidity API

## Membership

### dao

```solidity
address payable dao
```

### totalSupply

```solidity
uint256 totalSupply
```

### _tokenIds

```solidity
struct Counters.Counter _tokenIds
```

### isMember

```solidity
mapping(address => bool) isMember
```

### CreateMember

```solidity
event CreateMember(address to)
```

### initialize

```solidity
function initialize(address _dao, string _name) public
```

### createMember

```solidity
function createMember(address to) public
```

create member

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | address of new member |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

_See {IERC721Metadata-tokenURI}._

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 tokenId) internal
```

_Adjusts votes when tokens are transferred.

Emits a {Votes-DelegateVotesChanged} event._

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

