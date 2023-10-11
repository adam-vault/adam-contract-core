const { ethers } = require('hardhat');
const abiCoder = ethers.utils.defaultAbiCoder;

// define enum for the command
const UNISWAP_COMMAND_TYPE = {
    V3_SWAP_EXACT_IN: 0x00,
    V3_SWAP_EXACT_OUT: 0x01,
    V2_SWAP_EXACT_IN: 0x08,
    V2_SWAP_EXACT_OUT: 0x09,
    PERMIT2_PERMIT: 0x0a,
    WRAP_ETH: 0x0b,
    UNWRAP_WETH: 0x0c,
};

module.exports = {
    encodeV3SwapExactIn: (recipient, amountIn, amountOutMin, path) => {
        return abiCoder.encode(
            [
                'address recipient',
                'uint256 amountIn',
                'uint256 amountOutMin',
                'bytes path',
                'bool payerIsUser',
            ],
            [recipient, amountIn, amountOutMin, path, true],
        );
    },
    encodeV3SwapExactOut: (recipient, amountOut, amountInMax, path) => {
        return abiCoder.encode(
            [
                'address recipient',
                'uint256 amountOut',
                'uint256 amountInMax',
                'bytes path',
                'bool payerIsUser',
            ],
            [recipient, amountOut, amountInMax, path, true],
        );
    },
    encodeV2SwapExactIn: (recipient, amountIn, amountOutMin, path) => {
        return abiCoder.encode(
            [
                'address recipient',
                'uint256 amountIn',
                'uint256 amountOutMin',
                'address[] path',
                'bool payerIsUser',
            ],
            [recipient, amountIn, amountOutMin, path, true],
        );
    },
    encodeV2SwapExactOut: (recipient, amountOut, amountInMax, path) => {
        return abiCoder.encode(
            [
                'address recipient',
                'uint256 amountOut',
                'uint256 amountInMax',
                'address[] path',
                'bool payerIsUser',
            ],
            [recipient, amountOut, amountInMax, path, true],
        );
    },
    encodeUnwrapWETH: (recipient, amountMin) => {
        return abiCoder.encode(
            ['address recipient', 'uint256 amountMin'],
            [recipient, amountMin],
        );
    },

    encodeWrapETH: (recipient, amountMin) => {
        return abiCoder.encode(
            ['address recipient', 'uint256 amountMin'],
            [recipient, amountMin],
        );
    },

    encodePermit2Permit: (recipient, amountMin) => {
        return '0x';
    },
    UNISWAP_COMMAND_TYPE,
};
