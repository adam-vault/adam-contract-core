const { ethers } = hre;

async function gasFeeConfig (chainId) {
  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  return { maxFeePerGas, maxPriorityFeePerGas };
}

module.exports = {
  gasFeeConfig,
};
