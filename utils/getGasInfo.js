const { ethers } = hre;

async function lastBaseFeePerGas () {
  const { maxFeePerGas } = await ethers.provider.getFeeData();
  return maxFeePerGas;
}

module.exports = {
  lastBaseFeePerGas,
};
