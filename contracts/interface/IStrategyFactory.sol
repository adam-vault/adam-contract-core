// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IStrategyFactory {
    function create(address _assetManager, string calldata _name) external returns (address);
}
