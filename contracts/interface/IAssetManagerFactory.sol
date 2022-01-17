// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IAssetManagerFactory {
    function create(address _creator, string calldata _name) external returns (address);
    function setAdam(address _adam) external;
    function adam() external view returns (address);
}
