// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IAdam {
    function assetManagerRegistry(address manager) external view returns (bool);
    function setTreasury(address treasury) external;
    function getTreasury() external view returns (address);
}