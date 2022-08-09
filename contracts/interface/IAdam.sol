// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IAdam {
    struct CreateDaoParams {
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] generalGovernSetting;
        string[] tokenInfo;
        uint256 tokenAmount;
        uint256 minDepositAmount;
        address[] depositTokens;
        bool mintMemberToken;
        IIDao.AdmissionToken[3] admissionTokens;
        address baseCurrency;
        string logoCID;
        uint256 maxMemberLimit;
    }

    event AdminChanged(address previousAdmin, address newAdmin);
    event BeaconUpgraded(address indexed beacon);
    event CreateDao(
        address indexed dao,
        string name,
        string description,
        address creator
    );
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Upgraded(address indexed implementation);
    event WhitelistBudgetApproval(address budgetApproval);

    function budgetApprovals(address) external view returns (bool);

    function createDao(CreateDaoParams memory params)
        external
        returns (address);

    function daoImplementation() external view returns (address);

    function daos(address) external view returns (bool);

    function depositPoolImplementation() external view returns (address);

    function feedRegistry() external view returns (address);

    function governFactory() external view returns (address);

    function governImplementation() external view returns (address);

    function initialize(
        address _daoImplementation,
        address _membershipImplementation,
        address _liquidPoolImplementation,
        address _memberTokenImplementation,
        address _depositPoolImplementation,
        address _optInPoolImplementation,
        address[] memory _budgetApprovalImplementations,
        address _governFactory,
        address _feedRegistry,
        address _team
    ) external;

    function liquidPoolImplementation() external view returns (address);

    function memberTokenImplementation() external view returns (address);

    function membershipImplementation() external view returns (address);

    function optInPoolImplementation() external view returns (address);

    function owner() external view returns (address);

    function proxiableUUID() external view returns (bytes32);

    function renounceOwnership() external;

    function setDaoImplementation(address _daoImplementation) external;

    function setDepositPoolImplementation(address _depositPoolImplementation)
        external;

    function setMembershipImplementation(address _membershipImplementation)
        external;

    function setOptInPoolImplementation(address _optInPoolImplementation)
        external;

    function team() external view returns (address);

    function transferOwnership(address newOwner) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function whitelistBudgetApprovals(address[] memory _budgetApprovals)
        external;
}

interface IIDao {
    struct AdmissionToken {
        address token;
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool isMemberToken;
    }
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"dao","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"string","name":"description","type":"string"},{"indexed":false,"internalType":"address","name":"creator","type":"address"}],"name":"CreateDao","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"WhitelistBudgetApproval","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_locktime","type":"uint256"},{"internalType":"uint256[4]","name":"generalGovernSetting","type":"uint256[4]"},{"internalType":"string[]","name":"tokenInfo","type":"string[]"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"},{"internalType":"uint256","name":"minDepositAmount","type":"uint256"},{"internalType":"uint256","name":"minTokenToAdmit","type":"uint256"},{"internalType":"address","name":"admissionToken","type":"address"},{"internalType":"address[]","name":"depositTokens","type":"address[]"},{"internalType":"bool","name":"mintMemberToken","type":"bool"},{"internalType":"address","name":"baseCurrency","type":"address"},{"internalType":"string","name":"logoCID","type":"string"},{"internalType":"uint256","name":"maxMemberLimit","type":"uint256"}],"internalType":"struct IAdam.CreateDaoParams","name":"params","type":"tuple"}],"name":"createDao","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"daoImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"daos","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"depositPoolImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feedRegistry","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governFactory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_daoImplementation","type":"address"},{"internalType":"address","name":"_membershipImplementation","type":"address"},{"internalType":"address","name":"_liquidPoolImplementation","type":"address"},{"internalType":"address","name":"_memberTokenImplementation","type":"address"},{"internalType":"address","name":"_depositPoolImplementation","type":"address"},{"internalType":"address","name":"_optInPoolImplementation","type":"address"},{"internalType":"address[]","name":"_budgetApprovalImplementations","type":"address[]"},{"internalType":"address","name":"_governFactory","type":"address"},{"internalType":"address","name":"_feedRegistry","type":"address"},{"internalType":"address","name":"_team","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"liquidPoolImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"memberTokenImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"membershipImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"optInPoolImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_daoImplementation","type":"address"}],"name":"setDaoImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_depositPoolImplementation","type":"address"}],"name":"setDepositPoolImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_membershipImplementation","type":"address"}],"name":"setMembershipImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_optInPoolImplementation","type":"address"}],"name":"setOptInPoolImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"}],"name":"whitelistBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/
