// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SharedStruct {
    struct GovernCategory {
        string name;
        uint duration;
        uint quorum;
        uint passThreshold;
        uint[] voteWeights;
        address[] voteTokens;
    }
}