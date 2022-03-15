// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./lib/SharedStruct.sol";
import "./interface/IGovern.sol";

contract GovernFactory is Initializable, UUPSUpgradeable {
    address dao;
    address governImplementation;
    string[] public governCategories;
    mapping(string => SharedStruct.GovernCategory) public governCategoryMap;
    mapping(string => address) public governMap;
    string[] public proposalTitles;
    mapping(string => string) public proposalMap;

    event CreateCategory(
        string name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] voteWeights,
        address[] voteTokens
    );
    event CreateGovern(string categoryName, address govern);

    function initialize(
        address _dao,
        address _governImplementation
    ) public initializer {
        dao = _dao;
        governImplementation = _governImplementation;
    }

    function createCategory(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) external {
        require(voteWeights.length == voteTokens.length, "Vote weights, vote tokens length mismatch");

        governCategoryMap[name] = SharedStruct.GovernCategory(
            {
                name: name,
                duration: duration,
                quorum: quorum,
                passThreshold: passThreshold,
                voteWeights: voteWeights,
                voteTokens: voteTokens
            }
        );

        governCategories.push(name);

        emit CreateCategory(
            name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );
    }

    function createGovern(string calldata categoryName) external {
        SharedStruct.GovernCategory memory category = governCategoryMap[categoryName];

        ERC1967Proxy _govern = new ERC1967Proxy(governImplementation, "");
        IGovern(payable(address(_govern))).initialize(
            address(this),
            category.name,
            category.duration,
            category.quorum,
            category.passThreshold,
            category.voteWeights,
            category.voteTokens
        );

        governMap[category.name] = address(_govern);

        emit CreateGovern(category.name, address(_govern));
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}