const budgetApprovals = [
  'TransferLiquidERC20BudgetApproval',
  'LiquidUniswapBudgetApproval',
  'TransferERC721BudgetApproval',
  'TransferERC20BudgetApproval',
  'UniswapBudgetApproval',
];

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, getOrNull, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const adam = await getOrNull('Adam');
  const toBeRemove = [];
  const toBeAdd = [];

  await budgetApprovals.reduce(async (pm, contractName) => {
    await pm;
    const existing = await getOrNull(contractName);
    const result = await deploy(contractName, {
      from: deployer,
      log: true,
      gasLimit: 6000000,
    });
    if (result.newlyDeployed) {
      toBeAdd.push(result.address);
      if (existing) {
        toBeRemove.push(existing.address);
      }
    }
  }, Promise.resolve());

  if (adam) {
    if (toBeRemove.length) {
      await execute('Adam', { from: deployer, log: true }, 'abandonBudgetApprovals', toBeRemove);
    }

    if (toBeAdd.length) {
      await execute('Adam', { from: deployer, log: true }, 'whitelistBudgetApprovals', toBeAdd);
    }
  }
};

module.exports.tags = [
  'phase4',
];
