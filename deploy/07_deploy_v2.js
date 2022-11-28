const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute, get, read } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';
  const adamDeployment = await get('Adam');
  const governFactoryDeployment = await get('GovernFactory');

  const adamV2Implementation = await deploy('AdamV2', { contract: 'Adam', from: deployer, log: true, gasLimit: 3000000, ...(await gasFeeConfig()) });

  if (adamV2Implementation.newlyDeployed) {
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeTo', adamV2Implementation.address);
  }

  const governFactoryV2 = await deploy('GovernFactoryV2', { contract: 'GovernFactory', from: deployer, log: true, gasLimit: 5000000, ...(await gasFeeConfig()) });
  const governV2 = await deploy('GovernV2', { contract: 'Govern', from: deployer, log: true, gasLimit: 5000000, ...(await gasFeeConfig()) });

  if (governFactoryV2.newlyDeployed) {
    await execute('GovernFactory', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeTo', governFactoryV2.address);
  }

  if (await read('GovernFactory', 'governImplementation') !== governV2.address) {
    await execute('GovernFactory', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'setGovernImplementation', governV2.address);
  }

  const daoV2 = await deploy('DaoV2', { contract: 'Dao', from: deployer, log: true, ...(await gasFeeConfig()) });
  const liquidPoolV2 = await deploy('LiquidPoolV2', { contract: 'LiquidPool', from: deployer, log: true, gasLimit: 7000000, ...(await gasFeeConfig()) });
  const membershipV2 = await deploy('MembershipV2', { contract: 'Membership', from: deployer, log: true, gasLimit: 5000000, ...(await gasFeeConfig()) });

  const memberTokenImplementation = await read('Adam', 'memberTokenImplementation');
  const governImplementation = await read('GovernFactory', 'governImplementation');

  if (
    await read('Adam', 'daoImplementation') !== daoV2.address ||
    await read('Adam', 'membershipImplementation') !== membershipV2.address ||
    await read('Adam', 'liquidPoolImplementation') !== liquidPoolV2.address) {
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeImplementations',
      daoV2.address,
      membershipV2.address,
      liquidPoolV2.address,
      memberTokenImplementation,
      governImplementation,
      process.env.LATEST_VERSION || 'v2.0.0',
    );
  }

  const budgetApprovalsAddress = (await Promise.all([
    get('TransferLiquidERC20BudgetApproval'),
    get('TransferERC721BudgetApproval'),
    get('TransferERC20BudgetApproval'),
    get('UniswapAnyTokenBudgetApproval'),
    get('UniswapLiquidBudgetApproval'),
  ])).map((deployment) => deployment.address);

  const contractAddresses = {
    adam: adamDeployment.address,
    dao: daoV2.address,
    membership: membershipV2.address,
    governFactory: governFactoryDeployment.address,
    govern: governImplementation,
    memberToken: memberTokenImplementation,
    liquidPool: liquidPoolV2.address,
    transferLiquidERC20BudgetApproval: budgetApprovalsAddress[0],
    transferErc721BudgetApproval: budgetApprovalsAddress[1],
    transferERC20BudgetApproval: budgetApprovalsAddress[2],
    uniswapAnyTokenBudgetApproval: budgetApprovalsAddress[3],
    uniswapLiquidBudgetApproval: budgetApprovalsAddress[4],
    team: (await get('Team')).address,
  };

  console.log(contractAddresses);

  fileReader.save('deploy-results', 'results.json', {
    network: deployNetwork.split('-')[0],
    block_number: adamDeployment.receipt.blockNumber,
    addresses: contractAddresses,
    initdata_addresses: {},
  });
};

module.exports.tags = [
  'Dao',
  'Membership',
  'LiquidPool',
  'MemberToken',
];
