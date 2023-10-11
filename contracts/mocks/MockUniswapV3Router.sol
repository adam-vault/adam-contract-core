// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "../lib/BytesLib.sol";
import "../lib/Constant.sol";
import "./MockWETH9.sol";

contract mockUniswapV3Router {
    using BytesLib for bytes;


    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) 
        external 
        payable
    {
        execute(commands, inputs);
    }

    function execute(bytes calldata commands, bytes[] calldata inputs) public payable {
    }
    
    receive() external payable {}
}