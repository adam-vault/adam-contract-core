// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IManageable {
    function getOwner() external view returns (address);

    function isManager(address _address) external view returns (bool);

    function isOwner(address _address) external view returns (bool);

    function managerCount() external view returns (uint);

    function addManagers(address[] calldata _addresses) external;

    function removeManagers(address[] calldata _addresses) external;

    function changeOwner(address _address) external;
}