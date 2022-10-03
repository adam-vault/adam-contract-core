
const knownSignatures = {
  '0xd0e30db0': 'deposit()',
  '0x5ae401dc': 'multicall(uint256 deadline, bytes[] calldatas)',
  '0x2e1a7d4d': 'withdraw(uint256)',
  '0x49404b7c': 'unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
  '0x04e45aaf': 'exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96))',
  '0x5023b4df': 'exactOutputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountOut,uint256 amountInMaximum,uint160 sqrtPriceLimitX96))',
  '0x12210e8a': 'refundETH()',
  '0x42712a67': 'swapTokensForExactTokens(uint256 amountOut,uint256 amountInMax,address[] path,address to)',
  '0x472b43f3': 'swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to)',
  '0xf3995c67': 'selfPermit(address token,uint256 value,uint256 _deadline,uint8 _v,bytes32 _r,bytes32 _s)',
  '0xb858183f': 'exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum))',
  '0xdf2ab5bb': 'sweepToken(address token, uint256 amountMinimum, address recipient)',
  '0x09b81346': 'exactOutput((bytes,address,uint256,uint256))',
};

task('decode-uniswap', 'Decode Uniswap multicall data')
  .addParam('data', 'calldata')
  .setAction(async ({ data }, hre) => {
    const iface = new hre.ethers.utils.Interface(Object.values(knownSignatures).map(sig => `function ${sig}`));

    function decodeFn (calldata) {
      const selector = calldata.slice(0, 10).toLowerCase();
      const textSignature = knownSignatures[selector];
      if (!textSignature) {
        throw new Error('unsupported' + selector);
      }
      const decoded = iface.decodeFunctionData(textSignature, calldata);
      return { textSignature, selector, decoded };
    }

    const mainDecoded = decodeFn(data);
    if (mainDecoded.selector === '0x5ae401dc') {
      mainDecoded.decoded.calldatas.forEach((cd) => {
        const decoded = decodeFn(cd);
        console.log(decoded);
      });
    } else {
      console.log(mainDecoded);
    }
  });