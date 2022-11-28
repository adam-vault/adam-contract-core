const { ethers } = hre;

async function maxFeePerGasSetting () {
  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  return { maxFeePerGas, maxPriorityFeePerGas };
}

module.exports = {
  maxFeePerGasSetting,
};
