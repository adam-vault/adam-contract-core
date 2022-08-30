// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "../lib/BytesLib.sol";
import "../lib/Constant.sol";

contract UniswapSwapper is Initializable {

    using BytesLib for bytes;

    function decodeUniswapDataBeforeSwap(address to, bytes memory _data, uint256 amount) public view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {
        
        if(to == Constant.UNISWAP_ROUTER) {
            // Uniswap Swap Router
            (tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut) = _decodeUniswapRouter(_data, amount);
        } else if (to == Constant.WETH_ADDRESS) {
            // WETH9
            (tokenIn, tokenOut, amountIn, amountOut) = _decodeWETH9(_data, amount);
        } else {
            revert("Failed to decode Uniswap bytecode");
        }
    }

    function decodeUniswapDataAfterSwap(address to, bytes memory _data, uint256 amount, bytes memory swapResult) public view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {
        if(to == Constant.UNISWAP_ROUTER) {
            // Uniswap Swap Router
            (bytes[] memory byteResults) = abi.decode(swapResult, (bytes[]));

            (tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut) = _decodeUniswapRouter(_data, amount, byteResults);
        } else if (to == Constant.WETH_ADDRESS) {
            // WETH9
            (tokenIn, tokenOut, amountIn, amountOut) = _decodeWETH9(_data, amount);
        } else {
            revert("Failed to decode Uniswap result bytecode");
        }
    }

    function _decodeWETH9(bytes memory _data, uint256 amount) internal pure returns(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) {

        if(_data.toBytes4(0) == 0xd0e30db0) {
            // deposit()
            return (Denominations.ETH, Constant.WETH_ADDRESS, amount, amount);
        } else if (_data.toBytes4(0) == 0x2e1a7d4d) {
            // withdraw(uint256)
            uint256 _amount = abi.decode(_data.slice(4, _data.length - 4), (uint256));
            return (Constant.WETH_ADDRESS, Denominations.ETH, _amount, _amount);
        }

        revert("Failed to decode Uniswap bytecode");
    }

    function _decodeUniswapRouter(bytes memory _data, uint256 amount) internal view returns(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {

        // Uniswap multicall(uint256,bytes[])
        require(_data.toBytes4(0) == 0x5ae401dc, "Failed to decode Uniswap bytecode");

        (, bytes[] memory multicallBytesArray) = abi.decode(_data.slice(4, _data.length - 4), (uint256, bytes[]));

        for(uint i=0; i < multicallBytesArray.length; i++) {

            // unwrapWETH9(uint256,address)
            if (multicallBytesArray[i].toBytes4(0) == 0x49404b7c) {
                if (tokenOut == Constant.WETH_ADDRESS && i == multicallBytesArray.length - 1) {
                    tokenOut = Denominations.ETH;
                } else {
                    revert("Failed to decode Uniswap bytecode");
                }
            }
            // refundETH() 
            else if (multicallBytesArray[i].toBytes4(0) == 0x12210e8a) {
                // no need handling
            } else {
                (, bytes memory result) = address(this).staticcall(multicallBytesArray[i]);
                (address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOut, bool _estimatedIn, bool _estimatedOut) = abi.decode(result, (address, address, uint256, uint256, bool, bool));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountIn += _amountIn;
                amountOut += _amountOut;
                estimatedIn = _estimatedIn;
                estimatedOut = _estimatedOut;
            }
        }

        // Uniswap treat ETH as WETH
        if(tokenIn == Constant.WETH_ADDRESS && amount >= amountIn) {
            tokenIn = Denominations.ETH;
        }
    }

    function _decodeUniswapRouter(bytes memory _data, uint256 amount, bytes[] memory decodedResults) internal view returns(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {

        // Uniswap multicall(uint256,bytes[])
        require(_data.toBytes4(0) == 0x5ae401dc, "Failed to decode Uniswap bytecode");
        (, bytes[] memory multicallBytesArray) = abi.decode(_data.slice(4, _data.length - 4), (uint256, bytes[]));

        for(uint i=0; i < multicallBytesArray.length; i++) {

            // unwrapWETH9(uint256,address)
            if (multicallBytesArray[i].toBytes4(0) == 0x49404b7c) {
                if (tokenOut == Constant.WETH_ADDRESS && i == multicallBytesArray.length - 1) {
                    tokenOut = Denominations.ETH;
                } else {
                    revert("Failed to decode Uniswap bytecode");
                }
            }
            // refundETH() 
            else if (multicallBytesArray[i].toBytes4(0) == 0x12210e8a) {
                // no need handling
            } else {
                (, bytes memory callResult) = address(this).staticcall(multicallBytesArray[i]);
                (address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOut, bool _estimatedIn,) = abi.decode(callResult, (address, address, uint256, uint256, bool, bool));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                uint256 returnValue = abi.decode(decodedResults[i], (uint256));
                if(_estimatedIn) {
                    amountIn += returnValue;
                    amountOut += _amountOut;
                } else {
                    amountIn += _amountIn;
                    amountOut += returnValue;
                }
            }
        }

        // Uniswap treat ETH as WETH
        if(tokenIn == Constant.WETH_ADDRESS && amount >= amountIn) {
            tokenIn = Denominations.ETH;
        }

        estimatedIn = false;
        estimatedOut = false;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactOutputSingle(ExactOutputSingleParams calldata params) public pure returns (address, address, uint256, uint256, bool, bool) {
        return (params.tokenIn, params.tokenOut, params.amountInMaximum, params.amountOut, true, false);
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactInputSingle(ExactInputSingleParams calldata params) public pure returns (address, address, uint256, uint256, bool, bool) {
        return (params.tokenIn, params.tokenOut, params.amountIn, params.amountOutMinimum, false, true);
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactOutput(ExactOutputParams calldata params) public pure returns (address, address, uint256, uint256, bool, bool) {
        address tokenOut = params.path.toAddress(0);
        address tokenIn = params.path.toAddress(params.path.length - 20);
        return (tokenIn, tokenOut, params.amountInMaximum, params.amountOut, true, false);
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactInput(ExactInputParams calldata params) public pure returns (address, address, uint256, uint256, bool, bool) {
        address tokenIn = params.path.toAddress(0);
        address tokenOut = params.path.toAddress(params.path.length - 20);
        return (tokenIn, tokenOut, params.amountIn, params.amountOutMinimum, false, true);
    }

    // From Uniswap/swap-router-contracts/contracts/V2SwapRouter.sol
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address //to
    ) public pure returns (address, address, uint256, uint256, bool, bool) {
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        return (tokenIn, tokenOut, amountInMax, amountOut, true, false);
    }

    // From Uniswap/swap-router-contracts/contracts/V2SwapRouter.sol
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address //to
    ) public pure returns (address, address, uint256, uint256, bool, bool) {
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        return (tokenIn, tokenOut, amountIn, amountOutMin, false, true);
    }

    uint256[50] private __gap;

}