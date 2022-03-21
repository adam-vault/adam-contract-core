// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IGovern.sol";
import "hardhat/console.sol";

contract GovernFactory is Initializable, UUPSUpgradeable {
    address public dao;
    address public governImplementation;
    mapping(string => address) public governMap;

    event CreateGovern(
        string name,
        address govern
    );

    function initialize(
        address _dao,
        address _governImplementation
    ) public initializer {
        dao = _dao;
        governImplementation = _governImplementation;
    }

    modifier onlyDao {
        require(msg.sender == dao, "Access denied");
        _;
    }

    function createGovern(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) external {
        require(voteWeights.length == voteTokens.length, "Vote weights, vote tokens length mismatch");

        ERC1967Proxy _govern = new ERC1967Proxy(governImplementation, "");
        IGovern(payable(address(_govern))).initialize(
            address(this),
            name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );

        governMap[name] = address(_govern);

        emit CreateGovern(
            name,
            address(_govern)
        );
    }

    function addVoteToken(string memory name, address token, uint weight) external {
        address govern = governMap[name];
        IGovern(payable(govern)).addVoteToken(token, weight);
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}