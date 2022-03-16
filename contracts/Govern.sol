// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

import "./lib/SharedStruct.sol";
import "hardhat/console.sol";

contract Govern is
    Initializable, UUPSUpgradeable, IGovern, GovernorUpgradeable
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
    ) public initializer {
        __Governor_init(name);

        dao = _dao;

        category.name = name;
        //13.14s for 1 block
        category.duration = duration;
        category.quorum = quorum;
        category.passThreshold = passThreshold;
        category.voteWeights = voteWeights;
        category.voteTokens = voteTokens;
    }

    function getProposalVote(uint8 support, uint proposalId) public view returns (uint256) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        
        if (support == uint8(VoteType.Against)) {
            return proposalvote.againstVotes;
        } else if (support == uint8(VoteType.For)) {
            return proposalvote.forVotes;
        } else if (support == uint8(VoteType.Abstain)) {
            return proposalvote.abstainVotes;
        } else {
            revert("Governor: invalid value for enum VoteType");
        }
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
            revert("Governor: invalid value for enum VoteType");
        }
    }

    function _quorumReached(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        return quorum(proposalSnapshot(proposalId)) <= proposalvote.forVotes + proposalvote.abstainVotes;
    }

    function _voteSucceeded(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        uint totalVotes = proposalvote.forVotes + proposalvote.againstVotes;

        return proposalvote.forVotes >= (totalVotes * category.passThreshold / (100));
    }

    function hasVoted(uint256 proposalId, address account) public view override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    function getVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        uint256 totalVotes = 0;

        for(uint i=0; i < category.voteTokens.length; i++) {
            uint256 accountVotes = ERC20Votes(category.voteTokens[i]).getPastVotes(account, blockNumber);
            totalVotes = totalVotes + accountVotes * (category.voteWeights[i] / 100);
        }

        return totalVotes;
    }

    function quorum(uint256 blockNumber) public view override returns (uint256) {
        uint256 totalPastSupply = 0;

        for(uint256 i=0; i<category.voteTokens.length; i++) {
            totalPastSupply = totalPastSupply + ERC20Votes(category.voteTokens[i]).getPastTotalSupply(blockNumber);
        } 

        return (totalPastSupply * category.quorum / 100) / 100;
    }


    function quorumReached(uint256 proposalId) public view returns (bool) {
        return _quorumReached(proposalId);
    }

    function voteSucceeded(uint256 proposalId) public view returns (bool) {
        return _voteSucceeded(proposalId);
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
}