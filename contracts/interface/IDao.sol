// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IDao {
    error BudgetApprovalNotExists(address budgetApproval);
    error BudgetApprovalTemplateNotWhitelisted(address template);
    error ContractCallFail(bytes result);
    error GovernAlreadyExists(string gName);
    error InputLengthNotMatch(uint256 count1, uint256 count2);
    error InvalidAddress(address addr);
    error InvalidContract(address _contract);
    error OnlyBudgetApproval();
    error PluginAlreadyExists(bytes32 contractName);
    error PluginNotAllowed(bytes32 contractName);
    error PluginRequired(bytes32 contractName);
    error Unauthorized();
    error UnsupportedDowngrade();
    event AddAdmissionToken(
        address token,
        uint256 minTokenToAdmit,
        uint256 tokenId,
        bool isMemberToken
    );
    event AllowDepositToken(address token);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event CreateGovern(string name, address govern, address voteToken);
    event CreateMember(address account);
    event CreateMemberToken(address token);
    event CreatePlugin(bytes32 contractName, address plugin);
    event Deposit(address account, uint256 amount);
    event ExecuteByBudgetApproval(address budgetApproval, bytes data);
    event Initialized(uint8 version);
    event RemoveAdmissionToken(address token);
    event RevokeBudgetApproval(address budgetApproval);
    event SetFirstDepositTime(address owner, uint256 time);
    event UpdateDescription(string description);
    event UpdateLocktime(uint256 locktime);
    event UpdateLogoCID(string logoCID);
    event UpdateMinDepositAmount(uint256 amount);
    event UpdateName(string newName);
    event UpgradeDaoBeacon(address daoBeacon);
    event WhitelistTeam(uint256 tokenId);

    function accountingSystem() external view returns (address);

    function adam() external view returns (address);

    function addAssets(address[] memory erc20s) external;

    function baseCurrency() external view returns (address);

    function budgetApprovals(address template) external view returns (bool);

    function byPassGovern(address account) external view returns (bool);

    function canAddPriceGateway(address priceGateway)
        external
        view
        returns (bool);

    function canCreateBudgetApproval(address budgetApproval)
        external
        view
        returns (bool);

    function createBudgetApprovals(
        address[] memory __budgetApprovals,
        bytes[] memory data
    ) external;

    function createGovern(
        string memory _name,
        uint256 quorum,
        uint256 passThreshold,
        uint8 voteType,
        address externalVoteToken,
        uint256 durationInBlock
    ) external;

    function createPlugin(bytes32 contractName, bytes memory data)
        external
        returns (address);

    function creator() external view returns (address);

    function description() external view returns (string memory);

    function executeByBudgetApproval(
        address _to,
        bytes memory _data,
        uint256 _value
    ) external returns (bytes memory);

    function executePlugin(
        bytes32 contractName,
        bytes memory data,
        uint256 value
    ) external returns (bytes memory);

    function firstDepositTime(address) external view returns (uint256);

    function govern(string memory) external view returns (address);

    function initialize(
        address _creator,
        string memory _name,
        string memory _description,
        address _baseCurrency,
        bytes[] memory _data
    ) external;

    function isAssetSupported(address) external view returns (bool);

    function isPlugin(address) external view returns (bool);

    function join(address receiver) external payable;

    function locktime() external view returns (uint256);

    function logoCID() external view returns (string memory);

    function memberToken() external view returns (address);

    function membership() external view returns (address);

    function minDepositAmount() external view returns (uint256);

    function multicall(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data
    ) external returns (bytes[] memory);

    function name() external view returns (string memory);

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) external returns (bytes4);

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) external returns (bytes4);

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external returns (bytes4);

    function plugins(bytes32) external view returns (address);

    function revokeBudgetApprovals(address[] memory __budgetApprovals) external;

    function setDescription(string memory _description) external;

    function setFirstDepositTime(address owner, uint256 timestamp) external;

    function setLocktime(uint256 _locktime) external;

    function setLogoCID(string memory _logoCID) external;

    function setMinDepositAmount(uint256 _minDepositAmount) external;

    function setName(string memory _name) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function team() external view returns (address);

    function upgradeTo(address _daoBeacon) external;

    receive() external payable;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"}],"name":"BudgetApprovalNotExists","type":"error"},{"inputs":[{"internalType":"address","name":"template","type":"address"}],"name":"BudgetApprovalTemplateNotWhitelisted","type":"error"},{"inputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"name":"ContractCallFail","type":"error"},{"inputs":[{"internalType":"string","name":"gName","type":"string"}],"name":"GovernAlreadyExists","type":"error"},{"inputs":[{"internalType":"uint256","name":"count1","type":"uint256"},{"internalType":"uint256","name":"count2","type":"uint256"}],"name":"InputLengthNotMatch","type":"error"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"InvalidAddress","type":"error"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"}],"name":"InvalidContract","type":"error"},{"inputs":[],"name":"OnlyBudgetApproval","type":"error"},{"inputs":[{"internalType":"bytes32","name":"contractName","type":"bytes32"}],"name":"PluginAlreadyExists","type":"error"},{"inputs":[{"internalType":"bytes32","name":"contractName","type":"bytes32"}],"name":"PluginNotAllowed","type":"error"},{"inputs":[{"internalType":"bytes32","name":"contractName","type":"bytes32"}],"name":"PluginRequired","type":"error"},{"inputs":[],"name":"Unauthorized","type":"error"},{"inputs":[],"name":"UnsupportedDowngrade","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"minTokenToAdmit","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isMemberToken","type":"bool"}],"name":"AddAdmissionToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowDepositToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"CreateBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"address","name":"govern","type":"address"},{"indexed":false,"internalType":"address","name":"voteToken","type":"address"}],"name":"CreateGovern","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"CreateMember","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"CreateMemberToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"contractName","type":"bytes32"},{"indexed":false,"internalType":"address","name":"plugin","type":"address"}],"name":"CreatePlugin","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"ExecuteByBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"RemoveAdmissionToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"RevokeBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"time","type":"uint256"}],"name":"SetFirstDepositTime","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"description","type":"string"}],"name":"UpdateDescription","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"locktime","type":"uint256"}],"name":"UpdateLocktime","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"logoCID","type":"string"}],"name":"UpdateLogoCID","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"UpdateMinDepositAmount","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"newName","type":"string"}],"name":"UpdateName","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"daoBeacon","type":"address"}],"name":"UpgradeDaoBeacon","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"WhitelistTeam","type":"event"},{"inputs":[],"name":"accountingSystem","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"adam","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"erc20s","type":"address[]"}],"name":"addAssets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"baseCurrency","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"template","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"byPassGovern","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"canAddPriceGateway","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"}],"name":"canCreateBudgetApproval","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"__budgetApprovals","type":"address[]"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"createBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"passThreshold","type":"uint256"},{"internalType":"enum Dao.VoteType","name":"voteType","type":"uint8"},{"internalType":"address","name":"externalVoteToken","type":"address"},{"internalType":"uint256","name":"durationInBlock","type":"uint256"}],"name":"createGovern","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"contractName","type":"bytes32"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"createPlugin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"creator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"description","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"executeByBudgetApproval","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"contractName","type":"bytes32"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"executePlugin","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"firstDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"govern","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_creator","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"address","name":"_baseCurrency","type":"address"},{"internalType":"bytes[]","name":"_data","type":"bytes[]"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isAssetSupported","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isPlugin","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"join","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"locktime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"logoCID","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"membership","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDepositAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"targets","type":"address[]"},{"internalType":"uint256[]","name":"values","type":"uint256[]"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"plugins","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"__budgetApprovals","type":"address[]"}],"name":"revokeBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_description","type":"string"}],"name":"setDescription","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"setFirstDepositTime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_locktime","type":"uint256"}],"name":"setLocktime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_logoCID","type":"string"}],"name":"setLogoCID","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_minDepositAmount","type":"uint256"}],"name":"setMinDepositAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"setName","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_daoBeacon","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]
*/
