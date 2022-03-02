// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IAdam {
    event CreateDao(address dao, string name, string symbol, string description, address creator);
    function initialize(address _daoImplementation, address _membershipImplementation) external;
    function totalDaos() external view returns (uint256);
    function blankets(address blanket) external view returns (bool);
    function createDao(string calldata _name, string calldata _symbol, string calldata _description, uint256 _locktime, address[] calldata _depositTokens) external returns (address);
}