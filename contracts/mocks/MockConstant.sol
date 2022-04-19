// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract MockConstant {
    address public ETH_ADDRESS;
    address public WETH_ADDRESS;
    address public UNISWAP_ROUTER;

    function setConstant(address _eth, address _weth, address _uniswapRouter) public {
        ETH_ADDRESS = _eth;
        WETH_ADDRESS = _weth;
        UNISWAP_ROUTER = _uniswapRouter;
    }
}