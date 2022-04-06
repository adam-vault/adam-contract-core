// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IConstant {
    function ETH_ADDRESS() external returns (address);
    function WETH_ADDRESS() external returns (address);
    function UNISWAP_ROUTER() external returns (address);
}