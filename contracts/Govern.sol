// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/governance/utils/VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./lib/Constant.sol";

contract Govern is
    Initializable, GovernorUpgradeable, OwnableUpgradeable
{

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

    uint256 public quorumThreshold;
    uint256 public passThreshold;
    address public voteToken;
    mapping(uint256 => ProposalVote) private _proposalVotes;
    uint256 public durationInBlock;

    error NonVotableToken(address token);
    error VoteAlreadyCast();
    error NoContent();
    error InvalidVoteType();


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(
        string memory _name,
        uint256 _quorum,
        uint256 _passThreshold,
        address _voteToken,
        uint256 _durationInBlock
    ) external initializer {
        if (!_isVotableToken(_voteToken)) {
            revert NonVotableToken(_voteToken);
        }

        __Ownable_init();

        __Governor_init(_name);
        quorumThreshold = _quorum; //expecting 2 decimals (i.e. 1000 = 10%)
        passThreshold = _passThreshold; //expecting 2 decimals (i.e. 250 = 2.5%)
        voteToken = _voteToken;
        durationInBlock = _durationInBlock;
    }

    function getProposalVote(uint256 proposalId, uint8 support) external view returns (uint256) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        
        if (support == uint8(VoteType.Against)) {
            return proposalvote.againstVotes;
        } else if (support == uint8(VoteType.For)) {
            return proposalvote.forVotes;
        } else if (support == uint8(VoteType.Abstain)) {
            return proposalvote.abstainVotes;
        } else {
            revert InvalidVoteType();
        }
    }

    function votingPeriod() public view override returns (uint256) {
        // Fading out duration;
        // Suggest to use durationInBlock instead of duration(in second);
        return durationInBlock;
    }

    function votingDelay() public pure override returns (uint256) {
        return 0;
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=bravo&quorum=for,against";
    }

    function hasVoted(uint256 proposalId, address account) public view override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    function _getVotes(
        address account,
        uint256 blockNumber,
        bytes memory // params
    ) internal view override returns (uint256) {
      return VotesUpgradeable(voteToken).getPastVotes(account, blockNumber);
    }

    function quorum(uint256 blockNumber) public view override returns (uint256) {
        return totalPastSupply(blockNumber) * (quorumThreshold / 10000);
    }

    function totalPastSupply(uint256 blockNumber) public view returns (uint256) {
        return VotesUpgradeable(voteToken).getPastTotalSupply(blockNumber);
    }

    function quorumReached(uint256 proposalId) external view returns (bool) {
        return _quorumReached(proposalId);
    }

    function voteSucceeded(uint256 proposalId) external view returns (bool) {
        return _voteSucceeded(proposalId);
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override returns (uint256) {
        if (targets[0] == address(0)) {
            revert NoContent();
        }

        return super.execute(targets, values, calldatas, descriptionHash);
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal override {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        if (proposalvote.hasVoted[account]) {
            revert VoteAlreadyCast();
        }
        proposalvote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalvote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalvote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalvote.abstainVotes += weight;
        } else {
            revert InvalidVoteType();
        }
    }

    function _quorumReached(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        uint countedVotes = proposalvote.forVotes + proposalvote.againstVotes;

        return quorum(proposalSnapshot(proposalId)) <= countedVotes;
    }

    function _voteSucceeded(uint256 proposalId) internal view override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        uint _forVotes = proposalvote.forVotes;
        uint totalVotes = _forVotes + proposalvote.againstVotes;
        return totalVotes == 0 ? false : (_forVotes * 100 * 100) >= totalVotes * passThreshold;
    }

    function _isVotableToken(address _voteToken) internal view  returns (bool) {
        try IVotesUpgradeable(_voteToken).getPastTotalSupply( 0 ) {
        } catch {
            return false;
        }

        try IVotesUpgradeable(_voteToken).getPastVotes(address(this), 0 ) {
            return true;
        } catch {
            return false;
        }
    }

    uint256[49] private __gap;
}