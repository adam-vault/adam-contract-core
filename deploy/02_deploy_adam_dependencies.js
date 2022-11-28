const { ethers } = hre;
const { lastBaseFeePerGas } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('Dao', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 7000000, maxFeePerGas: await lastBaseFeePerGas() * 1.1 });
  await deploy('Membership', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas() * 1.1 });
  await deploy('LiquidPool', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 7000000, maxFeePerGas: await lastBaseFeePerGas() * 1.1 });
  await deploy('MemberToken', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 5000000, maxFeePerGas: await lastBaseFeePerGas() * 1.1 });
};

module.exports.tags = [
  // 'Dao',
  'Membership',
  'LiquidPool',
  'MemberToken',
  'phase3',
];
