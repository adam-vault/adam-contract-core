// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IDao {
    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _governFactory;
        address _team;
        address _memberTokenImplementation;
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] generalGovernSetting;
        string[] tokenInfo;
        uint256 tokenAmount;
        DaoSetting daoSetting;
        address[] depositTokens;
        bool mintMemberToken;
        AdmissionToken[] admissionTokens;
        address baseCurrency;
        string logoCID;
    }

    struct DaoSetting {
        uint256 minDepositAmount;
    }

    struct AdmissionToken {
        address token;
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool isMemberToken;
    }

    event AddAdmissionToken(
        address token,
        uint256 minTokenToAdmit,
        uint256 tokenId,
        bool isMemberToken
    );
    event AdminChanged(address previousAdmin, address newAdmin);
    event AllowDepositToken(address token);
    event BeaconUpgraded(address indexed beacon);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event CreateMember(address account, uint256 depositAmount);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);
    event Upgraded(address indexed implementation);
    event WhitelistTeam(uint256 tokenId);

    function adam() external view returns (address);

    function addAssets(address[] memory erc20s) external;

    function admissionTokenSetting(address)
        external
        view
        returns (uint256 minTokenToAdmit, uint256 tokenId);

    function admissionTokens(uint256) external view returns (address);

    function afterDeposit(address account, uint256 amount) external;

    function baseCurrency() external view returns (address);

    function budgetApprovals(address) external view returns (bool);

    function byPassGovern(address account) external view returns (bool);

    function canCreateBudgetApproval(address budgetApproval)
        external
        view
        returns (bool);

    function createBudgetApprovals(
        address[] memory _budgetApprovals,
        bytes[] memory data
    ) external;

    function createGovern(
        string memory _name,
        uint256 duration,
        uint256 quorum,
        uint256 passThreshold,
        uint256[] memory voteWeights,
        uint256 voteToken
    ) external;

    function createTeam(
        string memory title,
        address minter,
        address[] memory members,
        string memory description
    ) external;

    function creator() external view returns (address);

    function executeByBudgetApproval(
        address _to,
        bytes memory _data,
        uint256 _value
    ) external returns (bytes memory);

    function firstDepositTime(address) external view returns (uint256);

    function govern(string memory gName) external view returns (address);

    function governFactory() external view returns (address);

    function initialize(InitializeParams memory params) external;

    function isAssetSupported(address) external view returns (bool);

    function isMember(address account) external view returns (bool);

    function isPassAdmissionToken(address account) external view returns (bool);

    function liquidPool() external view returns (address);

    function locktime() external view returns (uint256);

    function logoCID() external view returns (string memory);

    function memberToken() external view returns (address);

    function membership() external view returns (address);

    function minDepositAmount() external view returns (uint256);

    function mintMember(address owner) external;

    function mintMemberToken(uint256 amount) external;

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

    function proxiableUUID() external view returns (bytes32);

    function setFirstDepositTime(address owner) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function team() external view returns (address);

    function teamWhitelist(uint256) external view returns (bool);

    function transferMemberToken(address to, uint256 amount) external;

    function updateDaoSetting(DaoSetting memory _setting) external;

    function upgradeContractTo(address target, address newImplementation)
        external;

    function upgradeContractToAndCall(
        address target,
        address newImplementation,
        bytes memory data
    ) external payable;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    receive() external payable;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"minTokenToAdmit","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isMemberToken","type":"bool"}],"name":"AddAdmissionToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowDepositToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"CreateBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"depositAmount","type":"uint256"}],"name":"CreateMember","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"creator","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"CreateMemberToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"time","type":"uint256"}],"name":"SetFirstDepositTime","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"WhitelistTeam","type":"event"},{"inputs":[],"name":"adam","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"erc20s","type":"address[]"}],"name":"addAssets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"admissionTokenSetting","outputs":[{"internalType":"uint256","name":"minTokenToAdmit","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"admissionTokens","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"afterDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"baseCurrency","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"byPassGovern","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"}],"name":"canCreateBudgetApproval","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"createBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"passThreshold","type":"uint256"},{"internalType":"uint256[]","name":"voteWeights","type":"uint256[]"},{"internalType":"uint256","name":"voteToken","type":"uint256"}],"name":"createGovern","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"title","type":"string"},{"internalType":"address","name":"minter","type":"address"},{"internalType":"address[]","name":"members","type":"address[]"},{"internalType":"string","name":"description","type":"string"}],"name":"createTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"creator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"executeByBudgetApproval","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"firstDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"gName","type":"string"}],"name":"govern","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governFactory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"_creator","type":"address"},{"internalType":"address","name":"_membership","type":"address"},{"internalType":"address","name":"_liquidPool","type":"address"},{"internalType":"address","name":"_governFactory","type":"address"},{"internalType":"address","name":"_team","type":"address"},{"internalType":"address","name":"_memberTokenImplementation","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_locktime","type":"uint256"},{"internalType":"uint256[4]","name":"generalGovernSetting","type":"uint256[4]"},{"internalType":"string[]","name":"tokenInfo","type":"string[]"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"},{"components":[{"internalType":"uint256","name":"minDepositAmount","type":"uint256"}],"internalType":"struct IDao.DaoSetting","name":"daoSetting","type":"tuple"},{"internalType":"address[]","name":"depositTokens","type":"address[]"},{"internalType":"bool","name":"mintMemberToken","type":"bool"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"minTokenToAdmit","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bool","name":"isMemberToken","type":"bool"}],"internalType":"struct IDao.AdmissionToken[]","name":"admissionTokens","type":"tuple[]"},{"internalType":"address","name":"baseCurrency","type":"address"},{"internalType":"string","name":"logoCID","type":"string"}],"internalType":"struct IDao.InitializeParams","name":"params","type":"tuple"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isAssetSupported","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isMember","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isPassAdmissionToken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"liquidPool","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"locktime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"logoCID","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"membership","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDepositAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"mintMember","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mintMemberToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"setFirstDepositTime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"teamWhitelist","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferMemberToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"minDepositAmount","type":"uint256"}],"internalType":"struct IDao.DaoSetting","name":"_setting","type":"tuple"}],"name":"updateDaoSetting","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeContractTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeContractToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]
*/
