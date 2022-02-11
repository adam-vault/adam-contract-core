// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../lib/BytesLib.sol";

library UniswapSwaper {

    address constant EthAddress = address(0x0);
    address constant WethAddress = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    function decodeUniswapData(address to, bytes memory _data, uint256 amount) public pure returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {
        
        if(to == address(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45)) {
            // Uniswap Swap Router
            bytes[] memory emptyArray;
            //TODO: find a better way to handle with/without results
            (tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut) = _decodeUniswapRouter(_data, emptyArray, amount);
        } else if (to == address(0xc778417E063141139Fce010982780140Aa0cD5Ab)) {
            // WETH9
            (tokenIn, tokenOut, amountIn, amountOut) = _decodeWETH9(_data, amount);
        } else {
            revert("Unexpected");
        }
    }

    function _decodeWETH9(bytes memory _data, uint256 amount) public pure returns(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) {

        if(BytesLib.toBytes4(_data, 0) == 0xd0e30db0) {
            // deposit()
            return (EthAddress, WethAddress, amount, amount);
        } else if (BytesLib.toBytes4(_data, 0) == 0x2e1a7d4d) {
            // withdraw(uint256)
            return (WethAddress, EthAddress, amount, amount);
        }

        revert("Unexpected");
    }

    function _decodeUniswapRouter(bytes memory _data, bytes[] memory _results, uint256 amount) public pure returns(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {

        // Uniswap multicall(uint256,bytes[])
        require(BytesLib.toBytes4(_data, 0) == 0x5ae401dc, "Unexpected");

        (, bytes[] memory multicallBytesArray) = abi.decode(BytesLib.slice(_data, 4, _data.length - 4), (uint256, bytes[]));

        for(uint i=0; i < multicallBytesArray.length; i++) {

            // exactOutputSingle((address,address,uint24,address,uint256,uint256,uint160))
            if(BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x5023b4df) {
                (address _tokenIn, address _tokenOut,,, uint256 _amountOut, uint256 _amountInMaximum,) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (address, address, uint24, address, uint256, uint256, uint160));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountOut += _amountOut;
                if(_results.length > 0) {
                    (uint256 _amountIn) = abi.decode(_results[i], (uint256));
                    amountIn += _amountIn;
                } else {
                    amountIn += _amountInMaximum;
                    estimatedIn = true;
                }
            }
            // exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x04e45aaf) {
            (address _tokenIn, address _tokenOut,,, uint256 _amountIn,uint256 _amountOutMinimum,) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (address, address, uint24, address, uint256, uint256, uint160));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountIn += _amountIn;
                if (_results.length > 0) {
                    (uint256 _amountOut) = abi.decode(_results[i], (uint256));
                    amountOut += _amountOut;
                } else {
                    amountOut += _amountOutMinimum;
                    estimatedOut = true;
                }
            } 
            // exactInput((bytes,address,uint256,uint256))
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0xb858183f) {
                (bytes memory _path,,uint256 _amountIn,uint256 _amountOutMinimum) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (bytes, uint24, uint256, uint256));
                (address _tokenIn,,address _tokenOut) = abi.decode(_path, (address, uint24, address));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountIn += _amountIn;
                if (_results.length > 0) {
                    (uint256 _amountOut) = abi.decode(_results[i], (uint256));
                    amountOut += _amountOut;
                } else {
                    amountOut += _amountOutMinimum;
                    estimatedOut = true;
                }
            }
            // exactOutput((bytes,address,uint256,uint256)) 
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x09b81346) {
                (bytes memory _path,, uint256 _amountOut, uint256 _amountInMaximum) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (bytes, uint24, uint256, uint256));
                (address _tokenIn,,address _tokenOut) = abi.decode(_path, (address, uint24, address));
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountOut += _amountOut;
                if(_results.length > 0) {
                    (uint256 _amountIn) = abi.decode(_results[i], (uint256));
                    amountIn += _amountIn;
                } else {
                    amountIn += _amountInMaximum;
                    estimatedIn = true;
                }
            }
            // swapExactTokensForTokens(uint256,uint256,address[],address)
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x472b43f3) {
                (uint256 _amountIn, uint256 _amountOutMinimum, address[] memory path,) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (uint256, uint256, address[], address));
                address _tokenIn = path[0];
                address _tokenOut = path[path.length - 1];
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountIn += _amountIn;
                if (_results.length > 0) {
                    (uint256 _amountOut) = abi.decode(_results[i], (uint256));
                    amountOut += _amountOut;
                } else {
                    amountOut += _amountOutMinimum;
                    estimatedOut = true;
                }
            }
            // swapTokensForExactTokens(uint256,uint256,address[],address)
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x42712a67) {
                (uint256 _amountOut, uint256 _amountInMaximum, address[] memory path,) = abi.decode(BytesLib.slice(multicallBytesArray[i], 4, multicallBytesArray[i].length - 4), (uint256, uint256, address[], address));
                address _tokenIn = path[0];
                address _tokenOut = path[path.length - 1];
                tokenIn = _tokenIn;
                tokenOut = _tokenOut;
                amountOut += _amountOut;
                if(_results.length > 0) {
                    (uint256 _amountIn) = abi.decode(_results[i], (uint256));
                    amountIn += _amountIn;
                } else {
                    amountIn += _amountInMaximum;
                    estimatedIn = true;
                }
            }
            // refundETH() 
            else if (BytesLib.toBytes4(multicallBytesArray[i], 0) == 0x12210e8a) {
                // no need handling
            } else {
                revert("Unexpected");
            }
        }

        // Uniswap treat ETH as WETH
        if(tokenIn == WethAddress && amount >= amountIn) {
            tokenIn = EthAddress;
        }
    }    
}