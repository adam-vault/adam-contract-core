// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/utils/VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/TimersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import "./lib/Constant.sol";

import "hardhat/console.sol";

contract Govern is
    Initializable, UUPSUpgradeable, GovernorUpgradeable
{
    using SafeCastUpgradeable for uint256;
    using TimersUpgradeable for TimersUpgradeable.BlockNumber;

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

    address public owner;
    uint public duration;
    uint public quorumThreshold;
    uint public passThreshold;
    uint[] public voteWeights;
    address[] public voteTokens;
    mapping(uint256 => ProposalVote) private _proposalVotes;

    event AddVoteToken(address token, uint weight);

    modifier onlyOwner {
        require(msg.sender == owner, "Access denied");
        _;
    }

    function initialize(
        address _owner,
        string memory _name,
        uint _duration,
        uint _quorum,
        uint _passThreshold,
        uint[] memory _voteWeights,
        address[] memory _voteTokens
    ) public initializer {
        __Governor_init(_name);

        owner = _owner;
        //13.14s for 1 block
        duration = _duration;
        quorumThreshold = _quorum; //expecting 2 decimals (i.e. 1000 = 10%)
        passThreshold = _passThreshold; //expecting 2 decimals (i.e. 250 = 2.5%)
        voteWeights = _voteWeights;
        voteTokens = _voteTokens;
    }

    function getProposalVote(uint256 proposalId, uint8 support) public view returns (uint256) {
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

    function votingPeriod() public view override returns (uint256) {
        return duration / Constant.BLOCK_NUMBER_IN_SECOND;
    }

    function votingDelay() public pure override returns (uint256) {
        return 0;
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=bravo&quorum=bravo";
    }

    function hasVoted(uint256 proposalId, address account) public view override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    function getVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        uint256 totalVotes = 0;

        for(uint i=0; i < voteTokens.length; i++) {
            uint accountVotes = VotesUpgradeable(voteTokens[i]).getPastVotes(account, blockNumber);

            totalVotes = totalVotes + accountVotes * voteWeights[i];
        }

        return totalVotes;
    }

    function quorum(uint256 blockNumber) public view override returns (uint256) {
        return totalPastSupply(blockNumber) * (quorumThreshold / 100);
    }

    function totalPastSupply(uint256 blockNumber) public view returns (uint256) {
        uint256 sum = 0;

        for(uint256 i=0; i<voteTokens.length; i++) {
            uint accountSupply = VotesUpgradeable(voteTokens[i]).getPastTotalSupply(blockNumber);
            sum = sum + accountSupply;
        } 

        return sum;
    }

    function quorumReached(uint256 proposalId) public view returns (bool) {
        return _quorumReached(proposalId);
    }

    function voteSucceeded(uint256 proposalId) public view returns (bool) {
        return _voteSucceeded(proposalId);
    }

    function addVoteToken(address token, uint weight) public onlyOwner {
        for(uint256 i=0; i <voteTokens.length; i++) {
            require(voteTokens[i] != token, "Token already in list");
        }

        voteTokens.push(token);
        voteWeights.push(weight);

        emit AddVoteToken(token, weight);
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override returns (uint256) {
        if (targets[0] == address(0)) {
            revert("no content");
        }

        return super.execute(targets, values, calldatas, descriptionHash);
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
        uint countedVotes = proposalvote.forVotes + proposalvote.againstVotes;

        return quorum(proposalSnapshot(proposalId)) <= countedVotes * 100;
    }

    function _voteSucceeded(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        uint totalVotes = proposalvote.forVotes + proposalvote.againstVotes;
        return totalVotes == 0 ? false : (proposalvote.forVotes * 100 * 100) >= totalVotes * passThreshold;
    }
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}