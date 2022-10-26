module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TransferLiquidERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000 });
  // await deploy('UniswapBudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000 });
  await deploy('TransferERC721BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000 });
  await deploy('TransferERC20BudgetApproval', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000 });
};

module.exports.tags = [
  'phase4',
];
