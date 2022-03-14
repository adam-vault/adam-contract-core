// // SPDX-License-Identifier: GPL-3.0

// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts/governance/Governor.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
// import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";

// import "../interface/IGovern.sol";
// import "../interface/IDao.sol";

// import "../lib/SharedStruct.sol";

// contract Govern is
//     Governor,
//     GovernorCompatibilityBravo,
//     GovernorVotes,
//     GovernorVotesQuorumFraction
// {
//     address public dao;
//     SharedStruct.GovernCategory public category;

//     constructor(
//         address _dao,
//         string memory name,
//         uint duration,
//         uint quorum,
//         uint passThreshold,
//         uint[] memory voteWeights,
//         address[] memory voteTokens
//     ) {
//         dao = _dao;

//         category.name = name;
//         //13.14s for 1 block
//         category.duration = duration;
//         category.quorum = quorum;
//         category.passThreshold = passThreshold;
//         category.voteWeights = voteWeights;
//         category.voteTokens = voteTokens;

//         Governor("Testing");
//         GovernorVotes(address(voteTokens[0]));
//         GovernorVotesQuorumFraction(4);
//     }

//     function votingDelay() public pure override returns (uint256) {
//         return 6575; // 1 day
//     }

//     function votingPeriod() public pure override returns (uint256) {
//         return 46027; // 1 week
//     }

//     function proposalThreshold() public pure override returns (uint256) {
//         return 0;
//     }

//     // The functions below are overrides required by Solidity.

//     function quorum(uint256 blockNumber)
//         public
//         view
//         override(IGovernor, GovernorVotesQuorumFraction)
//         returns (uint256)
//     {
//         return super.quorum(blockNumber);
//     }

//     function getVotes(address account, uint256 blockNumber)
//         public
//         view
//         override(IGovernor, GovernorVotes)
//         returns (uint256)
//     {
//         return super.getVotes(account, blockNumber);
//     }

//     function state(uint256 proposalId)
//         public
//         view
//         override(Governor, IGovernor)
//         returns (ProposalState)
//     {
//         return super.state(proposalId);
//     }

//     function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
//         public
//         override(Governor, GovernorCompatibilityBravo)
//         returns (uint256)
//     {
//         return super.propose(targets, values, calldatas, description);
//     }

//     function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
//         internal
//         override(Governor)
//     {
//         super._execute(proposalId, targets, values, calldatas, descriptionHash);
//     }

//     function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
//         internal
//         override(Governor)
//         returns (uint256)
//     {
//         return super._cancel(targets, values, calldatas, descriptionHash);
//     }

//     function _executor()
//         internal
//         view
//         override(Governor)
//         returns (address)
//     {
//         return super._executor();
//     }

//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(Governor, IERC165)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }
// }
