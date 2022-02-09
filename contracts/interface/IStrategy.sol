// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IStrategy {
    function initialize(address _assetManager, string memory name, address _adam) external;
    function deposit() external payable returns (address);
    function isSubscriptionValid(address target) external view returns (bool);
    function redempManagementFee(address to) external returns (bool);
}
