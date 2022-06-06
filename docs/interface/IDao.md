# Solidity API

## IDao

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
  struct IDao.DaoSetting daoSetting;
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

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

### AllowDepositToken

```solidity
event AllowDepositToken(address token)
```

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

### CreateBudgetApproval

```solidity
event CreateBudgetApproval(address budgetApproval, bytes data)
```

### CreateMemberToken

```solidity
event CreateMemberToken(address creator, address token)
```

### CreateOptInPool

```solidity
event CreateOptInPool(address optInPool)
```

### SetFirstDepositTime

```solidity
event SetFirstDepositTime(address owner, uint256 time)
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

### adam

```solidity
function adam() external view returns (address)
```

### addAssets

```solidity
function addAssets(address[] erc20s) external
```

### admissionToken

```solidity
function admissionToken() external view returns (address)
```

### budgetApprovals

```solidity
function budgetApprovals(address) external view returns (bool)
```

### byPassGovern

```solidity
function byPassGovern(address account) external view returns (bool)
```

### canCreateBudgetApproval

```solidity
function canCreateBudgetApproval(address budgetApproval) external view returns (bool)
```

### createBudgetApprovals

```solidity
function createBudgetApprovals(address[] _budgetApprovals, bytes[] data) external
```

### createGovern

```solidity
function createGovern(string _name, uint256 duration, uint256 quorum, uint256 passThreshold, uint256[] voteWeights, uint256 voteToken) external
```

### createMultiExecuteeBudgetApprovals

```solidity
function createMultiExecuteeBudgetApprovals(address[] executee, address[] budgetApprovals, bytes[] data) external
```

### createOptInPool

```solidity
function createOptInPool(address _depositToken, uint256 _depositThreshold, uint256 _depositDeadline, address[] _redeemTokens, uint256 _redeemTime, address[] _budgetApprovals, bytes[] _budgetApprovalsData) external
```

### creator

```solidity
function creator() external view returns (address)
```

### depositPool

```solidity
function depositPool() external view returns (address)
```

### executeByBudgetApproval

```solidity
function executeByBudgetApproval(address _to, bytes _data, uint256 _value) external returns (bytes)
```

### firstDepositTime

```solidity
function firstDepositTime(address) external view returns (uint256)
```

### govern

```solidity
function govern(string gName) external view returns (address)
```

### governFactory

```solidity
function governFactory() external view returns (address)
```

### initialize

```solidity
function initialize(struct IDao.InitializeParams params) external
```

### isAssetSupported

```solidity
function isAssetSupported(address) external view returns (bool)
```

### isMember

```solidity
function isMember(address account) external view returns (bool)
```

### isOptInPool

```solidity
function isOptInPool(address) external view returns (bool)
```

### liquidPool

```solidity
function liquidPool() external view returns (address)
```

### locktime

```solidity
function locktime() external view returns (uint256)
```

### memberToken

```solidity
function memberToken() external view returns (address)
```

### memberTokenImplementation

```solidity
function memberTokenImplementation() external view returns (address)
```

### membership

```solidity
function membership() external view returns (address)
```

### minDepositAmount

```solidity
function minDepositAmount() external view returns (uint256)
```

### minTokenToAdmit

```solidity
function minTokenToAdmit() external view returns (uint256)
```

### mintMember

```solidity
function mintMember(address owner) external
```

### mintMemberToken

```solidity
function mintMemberToken(uint256 amount) external
```

### name

```solidity
function name() external view returns (string)
```

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) external returns (bytes4)
```

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) external returns (bytes4)
```

### onERC721Received

```solidity
function onERC721Received(address, address, uint256, bytes) external returns (bytes4)
```

### optInPoolImplementation

```solidity
function optInPoolImplementation() external view returns (address)
```

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

### setFirstDepositTime

```solidity
function setFirstDepositTime(address owner) external
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

### transferMemberToken

```solidity
function transferMemberToken(address to, uint256 amount) external
```

### updateDaoSetting

```solidity
function updateDaoSetting(struct IDao.DaoSetting _setting) external
```

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external
```

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

### receive

```solidity
receive() external payable
```

