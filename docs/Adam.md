# Solidity API

## Adam

### CreateDaoParams

```solidity
struct CreateDaoParams {
  string _name;
  string _description;
  uint256 _locktime;
  uint256[4] budgetApproval;
  uint256[4] revokeBudgetApproval;
  uint256[4] general;
  uint256[4] daoSettingApproval;
  string[] tokenInfo;
  uint256 tokenAmount;
  uint256 minDepositAmount;
  uint256 minTokenToAdmit;
  address admissionToken;
  address[] depositTokens;
  bool mintMemberToken;
}
```

### feedRegistry

```solidity
address feedRegistry
```

### daoImplementation

```solidity
address daoImplementation
```

### membershipImplementation

```solidity
address membershipImplementation
```

### liquidPoolImplementation

```solidity
address liquidPoolImplementation
```

### depositPoolImplementation

```solidity
address depositPoolImplementation
```

### optInPoolImplementation

```solidity
address optInPoolImplementation
```

### governFactory

```solidity
address governFactory
```

### governImplementation

```solidity
address governImplementation
```

### memberTokenImplementation

```solidity
address memberTokenImplementation
```

### constantState

```solidity
address constantState
```

### budgetApprovals

```solidity
mapping(address => bool) budgetApprovals
```

### daos

```solidity
mapping(address => bool) daos
```

### CreateDao

```solidity
event CreateDao(address dao, string name, string description, address creator)
```

### WhitelistBudgetApproval

```solidity
event WhitelistBudgetApproval(address budgetApproval)
```

### initialize

```solidity
function initialize(address _daoImplementation, address _membershipImplementation, address _liquidPoolImplementation, address _memberTokenImplementation, address _depositPoolImplementation, address _optInPoolImplementation, address[] _budgetApprovalImplementations, address _governFactory, address _constantState, address _feedRegistry) public
```

### setDaoImplementation

```solidity
function setDaoImplementation(address _daoImplementation) public
```

### setMembershipImplementation

```solidity
function setMembershipImplementation(address _membershipImplementation) public
```

### setDepositPoolImplementation

```solidity
function setDepositPoolImplementation(address _depositPoolImplementation) public
```

### setOptInPoolImplementation

```solidity
function setOptInPoolImplementation(address _optInPoolImplementation) public
```

### whitelistBudgetApprovals

```solidity
function whitelistBudgetApprovals(address[] _budgetApprovals) public
```

### createDao

```solidity
function createDao(struct Adam.CreateDaoParams params) public returns (address)
```

create a Dao

_[0] _name: name of dao \
     [1] _description: description of dao \
     [2] _locktime: length of locktime \
     [3] memberTokenType: enum MemberTokenTypeOption \
     [4] memberToken: address of memberToken \
     [5] budgetApproval: budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     [6] revokeBudgetApproval: revoke budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     [7] general: general govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     [8] daoSettingApproval: dao setting govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     [9] tokenInfo: [0]token name, [1]token symbol \
     [10] tokenAmount: mint member token amount \
     [11] minDepositAmount: minimum deposit amount to join dao \
     [12] minMemberTokenToJoin: minimum amount of member token to join dao \
     [13] depositTokens: address of tokens which is able to deposit_

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct Adam.CreateDaoParams | see above |

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

