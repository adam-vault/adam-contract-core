// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IAdamOwned {
    function setAdam(address __adam) external;
    function adam() external view returns (address);
}