const { lastBaseFeePerGas } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TransferLiquidERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas(1.03) });
  await deploy('TransferERC721BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas(1.03) });
  await deploy('TransferERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas(1.03) });
  await deploy('UniswapAnyTokenBudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas(1.03) });
  await deploy('UniswapLiquidBudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxFeePerGas: await lastBaseFeePerGas(1.03) });
};

module.exports.tags = [
  'phase4',
];
