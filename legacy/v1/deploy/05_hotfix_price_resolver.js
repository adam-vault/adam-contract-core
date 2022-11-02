const budgetApprovals = [
  'TransferLiquidERC20BudgetApproval',
  'UniswapBudgetApproval',
];

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, getOrNull, execute, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const adam = await getOrNull('Adam');
  const toBeRemove = [];
  const toBeAdd = [];
  // Deploy Liquid BA
  // Abandon old BA
  // Whitelist new BA
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

  // Update Lp implementation
  const dao = await get('Dao');
  const membership = await get('Membership');
  const liquidPool = await get('LiquidPool');
  const memberToken = await get('MemberToken');
  const govern = await get('Govern');

  await execute(
    'Adam',
    { from: deployer, log: true },
    'upgradeImplementations',
    dao.address,
    membership.address,
    liquidPool.address,
    memberToken.address,
    govern.address,
    '',
  );
};

module.exports.tags = [
  'hotfixPriceResolver',
];
