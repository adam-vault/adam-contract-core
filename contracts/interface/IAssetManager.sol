// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IAssetManager {
    function deposit(address portfolio) payable external;
    function addStrategy(address _strategy) external;
}
