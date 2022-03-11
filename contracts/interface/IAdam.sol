// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IAdam {
    event CreateDao(address dao, string name, string symbol, address creator);
    function initialize(address _daoImplementation, address _membershipImplementation, address _governFactoryImplementation, address _governImplementation) external;
    function totalDaos() external view returns (uint256);
    function createDao(string calldata _name, string calldata _symbol) external returns (address);
}