// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity ^0.8.0;

interface IDao {
    struct InitializeParams {
        address _creator;
        address _membership;
        address _multiToken;
        address _governFactory;
        address _memberTokenImplementation;
        string _name;
        string _description;
        uint256 _locktime;
        uint8 memberTokenType;
        address memberToken;
        uint256[4] budgetApproval;
        uint256[4] revokeBudgetApproval;
        uint256[4] general;
        uint256[4] daoSettingApproval;
        string[] tokenInfo;
        uint256 tokenAmount;
        DaoSetting daoSetting;
    }

    struct DaoSetting {
        uint256 minDepositAmount;
        uint256 minMemberTokenToJoin;
    }

    event AdminChanged(address previousAdmin, address newAdmin);
    event AllowDepositToken(address[] token);
    event BeaconUpgraded(address indexed beacon);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event CreateMemberToken(address creator, address token);
    event Deposit(address member, address token, uint256 amount);
    event Redeem(address member, address token, uint256 amount);
    event SwapToken(
        address portfolio,
        uint256 src,
        uint256 dst,
        uint256 srcAmount,
        uint256 dstAmount
    );
    event Upgraded(address indexed implementation);

    function ETH_ADDRESS() external view returns (address);

    function adam() external view returns (address);

    function allowDepositTokens(address) external view returns (bool);

    function approveERC20(
        address _token,
        address _to,
        uint256 _amount
    ) external;

    function budgetApprovals(address) external view returns (bool);

    function createBudgetApprovalTransaction(
        address _budgetApproval,
        bytes memory _data,
        uint256 _deadline,
        bool _execute
    ) external;

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

    function createMemberToken(string[] memory tokenInfo, uint256 tokenAmount)
        external;

    function creator() external view returns (address);

    function deposit() external payable;

    function depositByBudgetApproval(
        address _token,
        address[] memory _members,
        uint256[] memory _amounts,
        bool transferred
    ) external payable returns (uint256 totalAmount);

    function firstDeposit(address) external view returns (uint256);

    function governFactory() external view returns (address);

    function initialize(InitializeParams memory params) external;

    function locktime() external view returns (uint256);

    function memberToken() external view returns (address);

    function memberTokenImplementation() external view returns (address);

    function memberTokenType() external view returns (uint8);

    function membership() external view returns (address);

    function minDepositAmount() external view returns (uint256);

    function minMemberTokenToJoin() external view returns (uint256);

    function mintMemberToken(uint256 amount) external;

    function multiToken() external view returns (address);

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

    function redeem(uint256 _amount) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function transferMemberToken(address to, uint256 amount) external;

    function updateDaoSetting(DaoSetting memory _setting) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function withdrawByBudgetApproval(
        address _token,
        address[] memory _members,
        uint256[] memory _amounts,
        bool transferred
    ) external returns (uint256 totalAmount);

    receive() external payable;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address[]","name":"token","type":"address[]"}],"name":"AllowDepositToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"CreateBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"creator","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"CreateMemberToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"member","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"member","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Redeem","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"portfolio","type":"address"},{"indexed":false,"internalType":"uint256","name":"src","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dst","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"srcAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dstAmount","type":"uint256"}],"name":"SwapToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[],"name":"ETH_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"adam","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"allowDepositTokens","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"approveERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_budgetApproval","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"},{"internalType":"uint256","name":"_deadline","type":"uint256"},{"internalType":"bool","name":"_execute","type":"bool"}],"name":"createBudgetApprovalTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"createBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"passThreshold","type":"uint256"},{"internalType":"uint256[]","name":"voteWeights","type":"uint256[]"},{"internalType":"uint256","name":"voteToken","type":"uint256"}],"name":"createGovern","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string[]","name":"tokenInfo","type":"string[]"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"createMemberToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"creator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address[]","name":"_members","type":"address[]"},{"internalType":"uint256[]","name":"_amounts","type":"uint256[]"},{"internalType":"bool","name":"transferred","type":"bool"}],"name":"depositByBudgetApproval","outputs":[{"internalType":"uint256","name":"totalAmount","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"firstDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governFactory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"_creator","type":"address"},{"internalType":"address","name":"_membership","type":"address"},{"internalType":"address","name":"_multiToken","type":"address"},{"internalType":"address","name":"_governFactory","type":"address"},{"internalType":"address","name":"_memberTokenImplementation","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_locktime","type":"uint256"},{"internalType":"uint8","name":"memberTokenType","type":"uint8"},{"internalType":"address","name":"memberToken","type":"address"},{"internalType":"uint256[4]","name":"budgetApproval","type":"uint256[4]"},{"internalType":"uint256[4]","name":"revokeBudgetApproval","type":"uint256[4]"},{"internalType":"uint256[4]","name":"general","type":"uint256[4]"},{"internalType":"uint256[4]","name":"daoSettingApproval","type":"uint256[4]"},{"internalType":"string[]","name":"tokenInfo","type":"string[]"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"},{"components":[{"internalType":"uint256","name":"minDepositAmount","type":"uint256"},{"internalType":"uint256","name":"minMemberTokenToJoin","type":"uint256"}],"internalType":"struct IDao.DaoSetting","name":"daoSetting","type":"tuple"}],"internalType":"struct IDao.InitializeParams","name":"params","type":"tuple"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"locktime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberTokenImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberTokenType","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"membership","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDepositAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minMemberTokenToJoin","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mintMemberToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"multiToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"redeem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferMemberToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"minDepositAmount","type":"uint256"},{"internalType":"uint256","name":"minMemberTokenToJoin","type":"uint256"}],"internalType":"struct IDao.DaoSetting","name":"_setting","type":"tuple"}],"name":"updateDaoSetting","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address[]","name":"_members","type":"address[]"},{"internalType":"uint256[]","name":"_amounts","type":"uint256[]"},{"internalType":"bool","name":"transferred","type":"bool"}],"name":"withdrawByBudgetApproval","outputs":[{"internalType":"uint256","name":"totalAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]
*/
