// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IAssetManager {
    function initialize(address _adam, address _owner, string memory _managerName) external;
    function deposit(address portfolio) payable external;
    function addStrategy(address _strategy) external;
    function isSubscriptionValid(address target) external view returns (bool);
    function redeemManagementFee(address mgtFeeAccount, address to) external returns (bool);
}
