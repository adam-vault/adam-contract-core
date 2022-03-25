// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IGovern.sol";
import "hardhat/console.sol";

contract GovernFactory is Initializable, UUPSUpgradeable {
    address public governImplementation;
    mapping(address => mapping(string => address)) public governMap;

    event CreateGovern(
        string name,
        address govern,
        address caller
    );

    function initialize(
        address _governImplementation
    ) public initializer {
        governImplementation = _governImplementation;
    }

    function createGovern(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) external {
        require(governMap[msg.sender][name] == address(0), "error");
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

        governMap[msg.sender][name] = address(_govern);

        emit CreateGovern(
            name,
            address(_govern),
            msg.sender
        );
    }

    function addVoteToken(string memory name, address token, uint weight) external {
        address govern = governMap[msg.sender][name];
        IGovern(payable(govern)).addVoteToken(token, weight);
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}