// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "../lib/BytesLib.sol";
import "../lib/Constant.sol";
import { Commands } from "../dex/lib/Commands.sol";
import "./MockWETH9.sol";
import "hardhat/console.sol";

contract MockUniswapV3Router {
    using BytesLib for bytes;


    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) 
        external 
        payable
    {
        execute(commands, inputs);
    }
    // for uniswap budget Approval integration test 
    function execute(bytes calldata commands, bytes[] calldata inputs) public payable {

        uint256 numCommands = commands.length;

        // loop through all given commands, execute them and pass along outputs as defined
        for (uint256 commandIndex = 0; commandIndex < numCommands;) {
            uint256 command = uint8(commands[commandIndex] & Commands.COMMAND_TYPE_MASK);
            bytes calldata input = inputs[commandIndex];
            
            if (command == Commands.V2_SWAP_EXACT_OUT) {

                (address recipient,
                uint256 amountOut,
                uint256 amountInMax,
                address[] memory path,
                ) = abi.decode(input, (address, uint256, uint256, address[], bool));
                if (msg.value > 0) {
                    MockWETH9(path[0]).deposit{value: msg.value}();
                }

                if (path[0]== Constant.WETH_ADDRESS && msg.value > 0) {
                    require(msg.value == amountInMax, "value not match"); 
                } else {

                    IERC20(path[0]).transferFrom(msg.sender, address(this), amountInMax);
                }

                if (path[1] == Denominations.ETH) {
                    (bool success,) = recipient.call{ value: amountOut }("");
                    require(success, "not success");
                } else {
                    IERC20(path[1]).transfer(recipient, amountOut);
                }
            }
            commandIndex++;
        }
    }
    
    receive() external payable {}
}