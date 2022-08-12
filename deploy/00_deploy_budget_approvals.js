module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  console.log({ deployer });
  await deploy('TransferLiquidERC20BudgetApproval', {
    from: deployer,
    log: true,
  });
  await deploy('UniswapBudgetApproval', {
    from: deployer,
    log: true,
  });
  await deploy('TransferERC721BudgetApproval', {
    from: deployer,
    log: true,
  });
  await deploy('TransferERC20BudgetApproval', {
    from: deployer,
    log: true,
  });
};

module.exports.tags = [
  'TransferLiquidERC20BudgetApproval',
  'UniswapBudgetApproval',
  'TransferERC721BudgetApproval',
  'TransferERC20BudgetApproval',
];
