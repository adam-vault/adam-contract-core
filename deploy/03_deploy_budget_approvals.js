const { maxFeePerGasSetting } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TransferLiquidERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, ...(await maxFeePerGasSetting()) });
  await deploy('TransferERC721BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, ...(await maxFeePerGasSetting()) });
  await deploy('TransferERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, ...(await maxFeePerGasSetting()) });
  await deploy('UniswapAnyTokenBudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, ...(await maxFeePerGasSetting()) });
  await deploy('UniswapLiquidBudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, ...(await maxFeePerGasSetting()) });
};

module.exports.tags = [
  'phase4',
];
