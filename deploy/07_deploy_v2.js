const hre = require('hardhat');
const { ethers } = require('hardhat');
const fileReader = require('../utils/fileReader');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';
  const adamDeployment = await get('Adam');
  const governFactoryDeployment = await get('GovernFactory');

  const adamV2Implementation = await deploy('AdamV2', { contract: 'Adam', from: deployer, log: true, gasLimit: 3000000 });
  if (adamV2Implementation.newlyDeployed) {
    await execute('Adam', { from: deployer, log: true }, 'upgradeTo', adamV2Implementation.address);
  }

  const daoV2 = await deploy('DaoV2', { contract: 'Dao', from: deployer, log: true, gasLimit: 5000000 });
  const liquidPoolV2 = await deploy('LiquidPoolV2', { contract: 'LiquidPool', from: deployer, log: true, gasLimit: 7000000 });
  const membershipV2 = await deploy('MembershipV2', { contract: 'Membership', from: deployer, log: true, gasLimit: 5000000 });
  const adam = await ethers.getContractAt('Adam', adamDeployment.address);
  const governFactory = await ethers.getContractAt('GovernFactory', governFactoryDeployment.address);

  const memberTokenImplementation = await adam.memberTokenImplementation();
  const governImplementation = await governFactory.governImplementation();

  if (daoV2.newlyDeployed || liquidPoolV2.newlyDeployed || membershipV2.newlyDeployed) {
    await execute('Adam', { from: deployer, log: true }, 'upgradeImplementations',
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
