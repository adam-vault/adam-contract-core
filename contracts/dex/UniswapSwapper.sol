// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IPeripheryImmutableState.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "hardhat/console.sol";

import {UniswapBytesLib} from  "./lib/UniswapBytesLib.sol";

import {UniswapConstants} from  "./lib/UniswapConstants.sol";
import {Commands} from "./lib/Commands.sol";
import  "../lib/BytesLib.sol";
import "../lib/Constant.sol";

contract UniswapSwapper is Initializable {
    using UniswapBytesLib for bytes;
    using BytesLib for bytes;

    uint256 internal constant ADDR_SIZE = 20;
    uint256 internal constant V3_FEE_SIZE = 3;
    uint256 internal constant NEXT_V3_POOL_OFFSET = ADDR_SIZE + V3_FEE_SIZE;
    uint256 internal constant V3_POP_OFFSET = NEXT_V3_POOL_OFFSET + ADDR_SIZE;
    address public constant RECIPIENT_EXECUTEE = address(1);
    address public constant RECIPIENT_UNISWAP_ROUTER = address(2);

    struct MulticallData {
        address recipient;
        address tokenIn;
        address tokenOut; 
        uint256 amountIn; 
        uint256 amountOut;
    }

    error DecodeFailed(bytes result);
    error DecodeWETHDataFail();
    error TooMuchETH();
    error LengthMismatch();
    error SliceOutOfBounds();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }
    
    function decodeExecute(bytes calldata rawData, uint256 value) public view returns(MulticallData[] memory multicalData) {
        (bytes memory commands, bytes[] memory inputs)  = _decodeExecute(rawData);
        uint256 remainEth = value;
        uint256 numCommands = commands.length;

        multicalData = new MulticallData[](inputs.length);

        if (inputs.length != numCommands) revert LengthMismatch();

        // loop through all given commands, execute them and pass along outputs as defined
        for (uint commandIndex = 0; commandIndex < numCommands; commandIndex++) {
            bytes1 command = commands[commandIndex];

            bytes memory input = inputs[commandIndex];

            MulticallData memory swapData = _dispatch(command, input);

            if (swapData.tokenIn == WETH9() && remainEth != 0) {
                if (swapData.amountIn > remainEth) {
                    revert DecodeWETHDataFail();
                }
                swapData.tokenIn = Denominations.ETH;
                remainEth -= swapData.amountIn;
            }
            
            multicalData[commandIndex] = swapData;
        }

        if (remainEth != 0) {
            revert TooMuchETH();
        }
    }

    function _decodeExecute(bytes memory _data) internal pure returns (bytes memory commands, bytes[] memory inputs) {
        bytes4 funcSig = _data.toBytes4(0);
        if (funcSig == bytes4(keccak256("execute(bytes,bytes[],uint256)"))) {
            (commands, inputs,) = abi.decode(_data.slice(4, _data.length - 4), (bytes, bytes[], uint256));
        } else {
           revert("Failed to decode Uniswap execute bytecode");
        }
    }
    
    function _dispatch(bytes1 commandType, bytes memory inputs) internal view returns(MulticallData memory multicalData) {
        uint256 command = uint8(commandType & Commands.COMMAND_TYPE_MASK);
        if (command == Commands.V3_SWAP_EXACT_IN) {

            (   address recipient,
                uint256 amountIn,
                uint256 amountOutMin,
                bytes memory path,) = abi.decode(inputs, (address, uint256, uint256, bytes, bool));

            // no need to handle the mutiple pools, since mutiple handle different feee of same token pair
            (address tokenIn, , address tokenOut) = decodeFirstPool(path);
            return MulticallData({
                recipient: recipient,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                amountOut: amountOutMin
            });
        } else if (command == Commands.V3_SWAP_EXACT_OUT) {
            (   address recipient,
                uint256 amountOut,
                uint256 amountInMax,
                bytes memory path,
            ) = abi.decode(inputs, (address, uint256, uint256, bytes, bool));
            // for uniswap exact output swap,
            // uniswap use swap a negative amount of tokenin in a reversed token pool to get the exact amount of tokenout
            // no need to handle the mutiple pools, since mutiple handle different feee of same token pair
            (address tokenOut,, address tokenIn) = decodeFirstPool(path);
            return MulticallData({
                recipient: recipient,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountInMax,
                amountOut: amountOut
            });
        } else if (command == Commands.PERMIT2_TRANSFER_FROM) {
            (   address token,
                address recipient,
                uint160 amount
            ) = abi.decode(inputs, (address, address, uint160));
            return MulticallData({
                recipient: recipient,
                tokenIn: token,
                tokenOut: address(0),
                amountIn: amount,
                amountOut: 0
            });
        } else if (command == Commands.PERMIT2_PERMIT_BATCH) {
            // not involved in token transfer
            return MulticallData({
                recipient: address(0),
                tokenIn: address(0),
                tokenOut: address(0),
                amountIn: 0,
                amountOut: 0
            });
        } else if (command == Commands.SWEEP) {
            (   address token,
                address recipient,
                uint256 amountMin
            ) =  abi.decode(inputs, (address, address, uint256));
            return MulticallData({
                recipient: recipient,
                tokenIn:address(0),
                tokenOut: token,
                amountIn: 0,
                amountOut: amountMin
            });
        } else if (command == Commands.TRANSFER) {
            (   address token,
                address recipient,
                uint256 value
            ) =  abi.decode(inputs, (address, address, uint256));
            return MulticallData({
                recipient: recipient,
                tokenIn: token,
                tokenOut: address(0),
                amountIn: value,
                amountOut: 0
            });
        } else if (command == Commands.V2_SWAP_EXACT_IN) {

            (   address recipient,
                uint256 amountIn,
                uint256 amountOutMin,
                address[] memory path,
            ) =  abi.decode(inputs, (address, uint256, uint256, address[], bool));
            return MulticallData({
                recipient: recipient,
                tokenIn: path[0],
                tokenOut: path[1],
                amountIn: amountIn,
                amountOut: amountOutMin
            });
        } else if (command == Commands.V2_SWAP_EXACT_OUT) {

            (   address recipient,
                uint256 amountOut,
                uint256 amountInMax,
                address[] memory path,
            ) =  abi.decode(inputs, (address, uint256, uint256, address[], bool));
            return MulticallData({
                recipient: recipient,
                tokenIn: path[0],
                tokenOut: path[1],
                amountIn: amountInMax,
                amountOut: amountOut
            });
        } else if (command == Commands.PERMIT2_PERMIT) {
            // not involved in token transfer
            return MulticallData({
                recipient: address(0),
                tokenIn: address(0),
                tokenOut: address(0),
                amountIn: 0,
                amountOut: 0
            });
        } else if (command == Commands.WRAP_ETH) {
            (address recipient, uint256 amountMin) = abi.decode(inputs, (address, uint256));
            return MulticallData({
                recipient: recipient,
                tokenIn: Denominations.ETH,
                tokenOut: WETH9(),
                amountIn: amountMin,
                amountOut: amountMin
            });

        } else if (command == Commands.UNWRAP_WETH) {
            (address recipient, uint256 amountMin) = abi.decode(inputs, (address, uint256));
            return MulticallData({
                recipient: recipient,
                tokenIn: address(0),
                tokenOut: Denominations.ETH,
                amountIn: 0,
                amountOut: amountMin
            });
        } else if (command == Commands.PERMIT2_TRANSFER_FROM_BATCH) {
            (address token,, address to, uint160 amount
            ) =  abi.decode(inputs, (address, address, address, uint160));
              return MulticallData({
                recipient: to,
                tokenIn: token,
                tokenOut: address(0),
                amountIn: amount,
                amountOut: 0
            });
        }
        revert DecodeFailed(inputs);
    }

    function WETH9() public pure returns (address) {
        return Constant.WETH_ADDRESS;
    }

    function decodeWETH9Call(bytes memory data, uint256 value) external pure returns(address tokenIn, address tokenOut, uint256 amount) {
        bytes4 funcSig = data.toBytes4(0);
        if (funcSig == bytes4(keccak256("deposit()"))) {
            return (Denominations.ETH, WETH9(), value);
        } else if (funcSig == bytes4(keccak256("withdraw(uint256)"))) {
            return (WETH9(), Denominations.ETH, abi.decode(data.slice(4, data.length - 4), (uint256)));
        }

        revert("Failed to decode Uniswap bytecode");
    }

    /// @notice Gets the segment corresponding to the first pool in the path
    /// @param path The bytes encoded swap path
    /// @return The segment containing all data necessary to target the first pool in the path
    function getFirstPool(bytes calldata path) internal pure returns (bytes calldata) {
        return path[:V3_POP_OFFSET];
    }

    function toUint24(bytes memory _bytes, uint256 _start) internal pure returns (uint16) {
        require(_bytes.length >= _start + 3, "toUint24_outOfBounds");
        uint16 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x3), _start))
        }

        return tempUint;
    }

    function decodeFirstPool(bytes memory path) internal pure returns (address, uint24, address) {
        if (path.length < UniswapConstants.V3_POP_OFFSET) revert SliceOutOfBounds();
        return (path.toAddress(0),toUint24(path, ADDR_SIZE), path.toAddress(UniswapConstants.NEXT_V3_POOL_OFFSET));
    }

    uint256[50] private __gap;

}