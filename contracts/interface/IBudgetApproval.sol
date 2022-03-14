// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IBudgetApproval {
    function getRequiredAmount(address,bytes memory, uint256) external returns(bool,address,uint256);
}