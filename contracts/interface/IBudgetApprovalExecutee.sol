// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IBudgetApprovalExecutee {
    function executeByBudgetApproval(address, bytes memory, uint256) external returns (bytes memory);
    function createBudgetApprovals(address[] calldata, bytes[] calldata) external;
}