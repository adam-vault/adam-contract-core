const { ethers } = hre;

async function lastBaseFeePerGas (markUpRate = 1.1) {
  const { lastBaseFeePerGas } = await ethers.provider.getFeeData();
  return (lastBaseFeePerGas * markUpRate).toFixed();
}

module.exports = {
  lastBaseFeePerGas,
};
