pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../lib/SharedStruct.sol";
import "../interface/IGovernFactory.sol";
import "../interface/IGovern.sol";

contract GovernFactory is Initializable, UUPSUpgradeable, IGovernFactory {
    address dao;
    address governImplementation;
    string[] public governCategories;
    mapping(string => SharedStruct.GovernCategory) public governCategoryMap;
    mapping(string => address) public governMap;

    event CreateCategory(
        string name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] voteWeights,
        address[] voteTokens
    );
    event CreateGovern(string categoryName);

    function initialize(
        address _dao,
        address _governImplementation
    ) public override initializer {
        dao = _dao;
        governImplementation = _governImplementation;
    }

    function createGovern(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) override external {
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

        ERC1967Proxy _govern = new ERC1967Proxy(governImplementation, "");
        IGovern(address(_govern)).initialize(
            address(this),
            name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );

        governMap[name] = address(_govern);

        emit CreateGovern(name);
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}