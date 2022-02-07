// SPDX-License-Identifier: GPL-3.0
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

pragma solidity ^0.8.0;

interface ITreasury {
    function exchangeEVE(address to, address token, uint256 quantity) external payable returns (int256);
}