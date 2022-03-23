// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface ICommonBudgetApproval {
    function supportsInterface(bytes4) external returns (bool);
    function createTransaction(bytes memory, uint256) external returns (uint256);
}