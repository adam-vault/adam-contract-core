# Solidity API

## Dao

### InitializeParams

```solidity
struct InitializeParams {
  address _creator;
  address _membership;
  address _liquidPool;
  address _depositPool;
  address _admissionToken;
  address _governFactory;
  address _memberTokenImplementation;
  address _optInPoolImplementation;
  string _name;
  string _description;
  uint256 _locktime;
  uint256[4] budgetApproval;
  uint256[4] revokeBudgetApproval;
  uint256[4] general;
  uint256[4] daoSettingApproval;
  string[] tokenInfo;
  uint256 tokenAmount;
  struct Dao.DaoSetting daoSetting;
  address[] depositTokens;
  bool mintMemberToken;
}
```

### DaoSetting

```solidity
struct DaoSetting {
  uint256 minDepositAmount;
  uint256 minTokenToAdmit;
}
```

### VoteType

```solidity
enum VoteType {
  Membership,
  MemberToken,
  Other
}
```

### memberToken

```solidity
address memberToken
```

### creator

```solidity
address creator
```

### adam

```solidity
address adam
```

### membership

```solidity
address membership
```

### liquidPool

```solidity
address liquidPool
```

### depositPool

```solidity
address depositPool
```

### governFactory

```solidity
address governFactory
```

### admissionToken

```solidity
address admissionToken
```

### memberTokenImplementation

```solidity
address memberTokenImplementation
```

### optInPoolImplementation

```solidity
address optInPoolImplementation
```

### name

```solidity
string name
```

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

### firstDepositTime

```solidity
mapping(address => uint256) firstDepositTime
```

### isAssetSupported

```solidity
mapping(address => bool) isAssetSupported
```

### isOptInPool

```solidity
mapping(address => bool) isOptInPool
```

### CreateOptInPool

```solidity
event CreateOptInPool(address optInPool)
```

### AllowDepositToken

```solidity
event AllowDepositToken(address token)
```

### CreateMemberToken

```solidity
event CreateMemberToken(address creator, address token)
```

### SetFirstDepositTime

```solidity
event SetFirstDepositTime(address owner, uint256 time)
```

### initialize

```solidity
function initialize(struct Dao.InitializeParams params) public
```

_[0] _creator: address creator of dao \
                [1] _membership: address of membership \
                [2] _liquidPool: address of liquidPool \
                [3] _governFactory: address of govern factory \
                [4] _memberTokenImplementation: address of member token implementation \
                [5] _name: name of dao \
                [6] _description: description of dao \
                [7] _locktime: length of locktime \
                [8] memberTokenType: enum MemberTokenTypeOption \
                [9] memberToken: address of memberToken \
               [10] budgetApproval: budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
               [11] revokeBudgetApproval: revoke budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
               [12] general: general govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
               [13] daoSettingApproval: dao setting govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
               [14] tokenInfo: [0]token name, [1]token symbol \
               [15] tokenAmount: mint member token amount \
               [16] daoSetting: updatable dao config \
               [17] depositTokens: address of tokens which is able to deposit_

### onlyGovern

```solidity
modifier onlyGovern(string category)
```

### onlyGovernOrSelf

```solidity
modifier onlyGovernOrSelf(string category)
```

### setFirstDepositTime

```solidity
function setFirstDepositTime(address owner) public
```

### mintMemberToken

```solidity
function mintMemberToken(uint256 amount) public
```

### transferMemberToken

```solidity
function transferMemberToken(address to, uint256 amount) public
```

### createMultiExecuteeBudgetApprovals

```solidity
function createMultiExecuteeBudgetApprovals(address[] executee, address[] budgetApprovals, bytes[] data) public
```

### _beforeCreateBudgetApproval

```solidity
function _beforeCreateBudgetApproval(address budgetApproval) internal view
```

### createOptInPool

```solidity
function createOptInPool(address _depositToken, uint256 _depositThreshold, uint256 _depositDeadline, address[] _redeemTokens, uint256 _redeemTime, address[] _budgetApprovals, bytes[] _budgetApprovalsData) public
```

### canCreateBudgetApproval

```solidity
function canCreateBudgetApproval(address budgetApproval) public view returns (bool)
```

### govern

```solidity
function govern(string gName) public view returns (address)
```

### byPassGovern

```solidity
function byPassGovern(address account) public view returns (bool)
```

### isMember

```solidity
function isMember(address account) public view returns (bool)
```

### updateDaoSetting

```solidity
function updateDaoSetting(struct Dao.DaoSetting _setting) public
```

### createGovern

```solidity
function createGovern(string _name, uint256 duration, uint256 quorum, uint256 passThreshold, uint256[] voteWeights, uint256 voteToken) public
```

### getVoteTypeValues

```solidity
function getVoteTypeValues(enum Dao.VoteType voteType) internal view returns (address[])
```

### addAssets

```solidity
function addAssets(address[] erc20s) public
```

### mintMember

```solidity
function mintMember(address owner) public
```

### _createMemberToken

```solidity
function _createMemberToken(string[] tokenInfo, uint256 tokenAmount) internal
```

### _createGovern

```solidity
function _createGovern(string _name, uint256 duration, uint256 quorum, uint256 passThreshold, uint256[] voteWeights, uint256 voteToken) internal
```

### _mintMemberToken

```solidity
function _mintMemberToken(uint256 amount) internal
```

### _transferMemberToken

```solidity
function _transferMemberToken(address to, uint256 amount) internal
```

### _addAssets

```solidity
function _addAssets(address[] erc20s) internal
```

### _addAsset

```solidity
function _addAsset(address erc20) internal
```

### _mintMember

```solidity
function _mintMember(address owner) internal
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

### receive

```solidity
receive() external payable
```
