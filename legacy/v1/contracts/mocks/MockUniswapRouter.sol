// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "../lib/BytesLib.sol";
import "../lib/Constant.sol";
import "./MockWETH9.sol";

contract MockUniswapRouter {
    using BytesLib for bytes;

    function multicall(uint256 deadline, bytes[] calldata data)
        external
        payable
        returns (bytes[] memory)
    {
        return multicall(data);
    }

    function multicall(bytes[] calldata data) public payable returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);

            if (!success) {
                // Next 5 lines from https://ethereum.stackexchange.com/a/83577
                if (result.length < 68) revert();
                assembly {
                    result := add(result, 0x04)
                }
                revert(abi.decode(result, (string)));
            }

            results[i] = result;
        }
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
    function exactOutputSingle(ExactOutputSingleParams calldata params) public payable returns (uint256 amountIn) {
        amountIn = params.amountInMaximum;

        if (msg.value > 0) {
            MockWETH9(params.tokenIn).deposit{value: msg.value}();
        }

        if(params.tokenIn == Constant.WETH_ADDRESS && msg.value > 0) {
            require(msg.value == amountIn, "value not match"); 
        } else {
            IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }

        if(params.tokenOut == Denominations.ETH) {
            params.recipient.call{ value: params.amountOut }("");
        } else {
            IERC20(params.tokenOut).transfer(params.recipient, params.amountOut);
        }
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
    function exactInputSingle(ExactInputSingleParams calldata params) public pure returns (uint256 amountOut) {
        amountOut = params.amountOutMinimum;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactOutput(ExactOutputParams calldata params) public pure returns (uint256 amountIn) {
        amountIn = params.amountInMaximum;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    // From Uniswap/swap-router-contracts/contracts/V3SwapRouter.sol
    function exactInput(ExactInputParams calldata params) public pure returns (uint256 amountOut) {
        amountOut = params.amountOutMinimum;
    }

    // From Uniswap/swap-router-contracts/contracts/V2SwapRouter.sol
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address //to
    ) public pure returns (uint256 amountIn) {
        amountIn = amountInMax;
    }

    // From Uniswap/swap-router-contracts/contracts/V2SwapRouter.sol
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address //to
    ) public pure returns (uint256 amountOut) {
        amountOut = amountOutMin;
    }

    receive() external payable {}
}