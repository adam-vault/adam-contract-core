// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity ^0.8.0;

interface IGovernFactory {
    event AdminChanged(address previousAdmin, address newAdmin);
    event BeaconUpgraded(address indexed beacon);
    event CreateCategory(
        string name,
        uint256 duration,
        uint256 quorum,
        uint256 passThreshold,
        uint256[] voteWeights,
        address[] voteTokens
    );
    event CreateGovern(string categoryName);
    event Upgraded(address indexed implementation);

    function createCategory(
        string memory name,
        uint256 duration,
        uint256 quorum,
        uint256 passThreshold,
        uint256[] memory voteWeights,
        address[] memory voteTokens
    ) external;

    function createGovern(string memory categoryName) external;

    function governCategories(uint256) external view returns (string memory);

    function governCategoryMap(string memory)
        external
        view
        returns (
            string memory name,
            uint256 duration,
            uint256 quorum,
            uint256 passThreshold
        );

    function governMap(string memory) external view returns (address);

    function initialize(address _dao, address _governImplementation) external;

    function proposalMap(string memory) external view returns (string memory);

    function proposalTitles(uint256) external view returns (string memory);

    function proxiableUUID() external view returns (bytes32);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"uint256","name":"duration","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"quorum","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"passThreshold","type":"uint256"},{"indexed":false,"internalType":"uint256[]","name":"voteWeights","type":"uint256[]"},{"indexed":false,"internalType":"address[]","name":"voteTokens","type":"address[]"}],"name":"CreateCategory","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"categoryName","type":"string"}],"name":"CreateGovern","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"passThreshold","type":"uint256"},{"internalType":"uint256[]","name":"voteWeights","type":"uint256[]"},{"internalType":"address[]","name":"voteTokens","type":"address[]"}],"name":"createCategory","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"categoryName","type":"string"}],"name":"createGovern","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"governCategories","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"governCategoryMap","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"passThreshold","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"governMap","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_dao","type":"address"},{"internalType":"address","name":"_governImplementation","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"proposalMap","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"proposalTitles","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"}]
*/