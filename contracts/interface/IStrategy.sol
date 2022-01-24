// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IStrategy {
    function deposit() external payable returns (address);
    function isSubscriptionValid(address target) external view returns (bool);
}
