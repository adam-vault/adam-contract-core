// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/compatibility/GovernorCompatibilityBravoUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "../lib/SharedStruct.sol";
import "../interface/IGovern.sol";

import "hardhat/console.sol";

contract Govern is
    Initializable, UUPSUpgradeable, IGovern,
    GovernorUpgradeable, GovernorVotesUpgradeable, GovernorVotesQuorumFractionUpgradeable
{
    address public dao;
    SharedStruct.GovernCategory public category;
    mapping(uint256 => ProposalVote) private _proposalVotes;

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    function initialize(
        address _dao,
        string memory name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] memory voteWeights,
        address[] memory voteTokens
    ) public override initializer {
        __Governor_init(name);
        __GovernorVotes_init(IVotesUpgradeable(voteTokens[0]));
        __GovernorVotesQuorumFraction_init((quorum / (10**2)));

        dao = _dao;

        category.name = name;
        //13.14s for 1 block
        category.duration = duration;
        category.quorum = quorum;
        category.passThreshold = passThreshold;
        category.voteWeights = voteWeights;
        category.voteTokens = voteTokens;
    } 

    function votingDelay() public pure override returns (uint256) {
        return 0;
    }

    function votingPeriod() public view override returns (uint256) {
        return category.duration / 13;
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=bravo&quorum=bravo";
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight
    ) internal override {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        require(!proposalvote.hasVoted[account], "GovernorVotingSimple: vote already cast");
        proposalvote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalvote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalvote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalvote.abstainVotes += weight;
        } else {
            revert("GovernorVotingSimple: invalid value for enum VoteType");
        }
    }

    function _quorumReached(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        return quorum(proposalSnapshot(proposalId)) <= proposalvote.forVotes + proposalvote.abstainVotes;
    }

    function _voteSucceeded(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        uint totalVotes = proposalvote.forVotes + proposalvote.abstainVotes + proposalvote.againstVotes;

        return proposalvote.forVotes >= (totalVotes * category.passThreshold / (10**2));
    }

    function hasVoted(uint256 proposalId, address account) public view override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}