# Solidity API

## Govern

### VoteType

```solidity
enum VoteType {
  Against,
  For,
  Abstain
}
```

### ProposalVote

```solidity
struct ProposalVote {
  uint256 againstVotes;
  uint256 forVotes;
  uint256 abstainVotes;
  mapping(address &#x3D;&gt; bool) hasVoted;
}
```

### owner

```solidity
address owner
```

### duration

```solidity
uint256 duration
```

### quorumThreshold

```solidity
uint256 quorumThreshold
```

### passThreshold

```solidity
uint256 passThreshold
```

### voteWeights

```solidity
uint256[] voteWeights
```

### voteTokens

```solidity
address[] voteTokens
```

### _proposalVotes

```solidity
mapping(uint256 => struct Govern.ProposalVote) _proposalVotes
```

### AddVoteToken

```solidity
event AddVoteToken(address token, uint256 weight)
```

### onlyOwner

```solidity
modifier onlyOwner()
```

### initialize

```solidity
function initialize(address _owner, string _name, uint256 _duration, uint256 _quorum, uint256 _passThreshold, uint256[] _voteWeights, address[] _voteTokens) public
```

### getProposalVote

```solidity
function getProposalVote(uint256 proposalId, uint8 support) public view returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() public view returns (uint256)
```

module:user-config

_Delay, in number of blocks, between the vote start and vote ends.

NOTE: The {votingDelay} can delay the start of the vote. This must be considered when setting the voting
duration compared to the voting delay._

### votingDelay

```solidity
function votingDelay() public pure returns (uint256)
```

module:user-config

_Delay, in number of block, between the proposal is created and the vote starts. This can be increassed to
leave time for users to buy voting power, of delegate it, before the voting of a proposal starts._

### proposalThreshold

```solidity
function proposalThreshold() public pure returns (uint256)
```

_Part of the Governor Bravo's interface: _"The number of votes required in order for a voter to become a proposer"_._

### COUNTING_MODE

```solidity
function COUNTING_MODE() public pure returns (string)
```

module:voting

_A description of the possible `support` values for {castVote} and the way these votes are counted, meant to
be consumed by UIs to show correct vote options and interpret the results. The string is a URL-encoded sequence of
key-value pairs that each describe one aspect, for example `support=bravo&quorum=for,abstain`.

There are 2 standard keys: `support` and `quorum`.

- `support=bravo` refers to the vote options 0 = Against, 1 = For, 2 = Abstain, as in `GovernorBravo`.
- `quorum=bravo` means that only For votes are counted towards quorum.
- `quorum=for,abstain` means that both For and Abstain votes are counted towards quorum.

NOTE: The string can be decoded by the standard
https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams[`URLSearchParams`]
JavaScript class._

### hasVoted

```solidity
function hasVoted(uint256 proposalId, address account) public view returns (bool)
```

module:voting

_Returns weither `account` has cast a vote on `proposalId`._

### getVotes

```solidity
function getVotes(address account, uint256 blockNumber) public view returns (uint256)
```

module:reputation

_Voting power of an `account` at a specific `blockNumber`.

Note: this can be implemented in a number of ways, for example by reading the delegated balance from one (or
multiple), {ERC20Votes} tokens._

### quorum

```solidity
function quorum(uint256 blockNumber) public view returns (uint256)
```

module:user-config

_Minimum number of cast voted required for a proposal to be successful.

Note: The `blockNumber` parameter corresponds to the snaphot used for counting vote. This allows to scale the
quroum depending on values such as the totalSupply of a token at this block (see {ERC20Votes})._

### totalPastSupply

```solidity
function totalPastSupply(uint256 blockNumber) public view returns (uint256)
```

### quorumReached

```solidity
function quorumReached(uint256 proposalId) public view returns (bool)
```

### voteSucceeded

```solidity
function voteSucceeded(uint256 proposalId) public view returns (bool)
```

### addVoteToken

```solidity
function addVoteToken(address token, uint256 weight) public
```

### execute

```solidity
function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) public payable returns (uint256)
```

_See {IGovernor-execute}._

### _countVote

```solidity
function _countVote(uint256 proposalId, address account, uint8 support, uint256 weight) internal
```

_Register a vote with a given support and voting weight.

Note: Support is generic and can represent various things depending on the voting system used._

### _quorumReached

```solidity
function _quorumReached(uint256 proposalId) internal view returns (bool)
```

_Amount of votes already cast passes the threshold limit._

### _voteSucceeded

```solidity
function _voteSucceeded(uint256 proposalId) internal view returns (bool)
```

_Is the proposal successful or not._

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

