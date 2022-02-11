// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IManagementFee {
    function redemption() external returns (bool);
    function setBeneficiary(address _beneficiary) external;
}