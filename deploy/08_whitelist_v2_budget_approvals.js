const toBeAddBudgetApprovals = [
  'TransferLiquidERC20BudgetApprovalV2',
  'TransferERC721BudgetApprovalV2',
  'TransferERC20BudgetApprovalV2',
];

const toBeRemoveBudgetApprovals = [
  'TransferLiquidERC20BudgetApproval',
  'TransferERC721BudgetApproval',
  'TransferERC20BudgetApproval',
];

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, getOrNull, execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const adam = await getOrNull('Adam');
  const toBeRemove = [];
  const toBeAdd = [];

  await toBeAddBudgetApprovals.reduce(async (pm, contractName) => {
    await pm;
    const existing = await getOrNull(contractName);
    const result = await deploy(contractName, {
      from: deployer,
      log: true,
      gasLimit: 6000000,
      skipIfAlreadyDeployed: true,
    });
    if (result.newlyDeployed) {
      toBeAdd.push(result.address);
      if (existing) {
        toBeRemove.push(existing.address);
      }
    }
  }, Promise.resolve());

  await toBeRemoveBudgetApprovals.reduce(async (pm, contractName) => {
    await pm;
    const existing = await getOrNull(contractName);
    if (existing) {
      const isWhitelisted = await read('Adam', 'budgetApprovals', existing.address);
      if (isWhitelisted) {
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
  'v2',
  'budgetApproval',
];
