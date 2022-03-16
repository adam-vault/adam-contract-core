pragma solidity ^0.8.0;

interface IGovernFactory {
    function initialize(address _dao, address _gFF) external;
    function createGovern(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) external;
}
