# Solidity API

## IGovern

### AddVoteToken

```solidity
event AddVoteToken(address token, uint256 weight)
```

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 proposalId)
```

### ProposalCreated

```solidity
event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
```

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 proposalId)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### VoteCast

```solidity
event VoteCast(address voter, uint256 proposalId, uint8 support, uint256 weight, string reason)
```

### BALLOT_TYPEHASH

```solidity
function BALLOT_TYPEHASH() external view returns (bytes32)
```

### COUNTING_MODE

```solidity
function COUNTING_MODE() external pure returns (string)
```

### addVoteToken

```solidity
function addVoteToken(address token, uint256 weight) external
```

### castVote

```solidity
function castVote(uint256 proposalId, uint8 support) external returns (uint256)
```

### castVoteBySig

```solidity
function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) external returns (uint256)
```

### castVoteWithReason

```solidity
function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256)
```

### duration

```solidity
function duration() external view returns (uint256)
```

### execute

```solidity
function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external payable returns (uint256)
```

### getProposalVote

```solidity
function getProposalVote(uint256 proposalId, uint8 support) external view returns (uint256)
```

### getVotes

```solidity
function getVotes(address account, uint256 blockNumber) external view returns (uint256)
```

### hasVoted

```solidity
function hasVoted(uint256 proposalId, address account) external view returns (bool)
```

### hashProposal

```solidity
function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external pure returns (uint256)
```

### initialize

```solidity
function initialize(address _owner, string _name, uint256 _duration, uint256 _quorum, uint256 _passThreshold, uint256[] _voteWeights, address[] _voteTokens) external
```

### name

```solidity
function name() external view returns (string)
```

### owner

```solidity
function owner() external view returns (address)
```

### passThreshold

```solidity
function passThreshold() external view returns (uint256)
```

### proposalDeadline

```solidity
function proposalDeadline(uint256 proposalId) external view returns (uint256)
```

### proposalSnapshot

```solidity
function proposalSnapshot(uint256 proposalId) external view returns (uint256)
```

### proposalThreshold

```solidity
function proposalThreshold() external pure returns (uint256)
```

### propose

```solidity
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### quorum

```solidity
function quorum(uint256 blockNumber) external view returns (uint256)
```

### quorumReached

```solidity
function quorumReached(uint256 proposalId) external view returns (bool)
```

### quorumThreshold

```solidity
function quorumThreshold() external view returns (uint256)
```

### relay

```solidity
function relay(address target, uint256 value, bytes data) external
```

### state

```solidity
function state(uint256 proposalId) external view returns (uint8)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

### totalPastSupply

```solidity
function totalPastSupply(uint256 blockNumber) external view returns (uint256)
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

### version

```solidity
function version() external view returns (string)
```

### voteSucceeded

```solidity
function voteSucceeded(uint256 proposalId) external view returns (bool)
```

### voteTokens

```solidity
function voteTokens(uint256) external view returns (address)
```

### voteWeights

```solidity
function voteWeights(uint256) external view returns (uint256)
```

### votingDelay

```solidity
function votingDelay() external pure returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() external view returns (uint256)
```

### receive

```solidity
receive() external payable
```

