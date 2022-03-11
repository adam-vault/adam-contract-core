// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IGovern {
    function initialize(
        address _dao,
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) external;
}
