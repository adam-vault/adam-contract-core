const { ethers } = hre;

async function lastBaseFeePerGas () {
  const { lastBaseFeePerGas } = await ethers.provider.getFeeData();
  return lastBaseFeePerGas;
}

module.exports = {
  lastBaseFeePerGas,
};
