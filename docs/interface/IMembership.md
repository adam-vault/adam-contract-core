# Solidity API

## IMembership

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### Approval

```solidity
event Approval(address owner, address approved, uint256 tokenId)
```

### ApprovalForAll

```solidity
event ApprovalForAll(address owner, address operator, bool approved)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateMember

```solidity
event CreateMember(address to)
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
event Transfer(address from, address to, uint256 tokenId)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### DOMAIN_SEPARATOR

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

### approve

```solidity
function approve(address to, uint256 tokenId) external
```

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```

### createMember

```solidity
function createMember(address to) external
```

### dao

```solidity
function dao() external view returns (address)
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

### getApproved

```solidity
function getApproved(uint256 tokenId) external view returns (address)
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

### initialize

```solidity
function initialize(address _dao, string _name) external
```

### isApprovedForAll

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool)
```

### isMember

```solidity
function isMember(address) external view returns (bool)
```

### name

```solidity
function name() external view returns (string)
```

### nonces

```solidity
function nonces(address owner) external view returns (uint256)
```

### ownerOf

```solidity
function ownerOf(uint256 tokenId) external view returns (address)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId) external
```

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data) external
```

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) external view returns (string)
```

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) external
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

