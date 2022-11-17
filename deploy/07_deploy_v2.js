const { ethers } = require('hardhat');
const fileReader = require('../utils/fileReader');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute, get, upgrades } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';

  const governFactoryDeployment = await get('GovernFactory');

  const adamDeployment = await deploy('Adam', {
    from: deployer,
    log: true,
    args: [],
    gasLimit: 5000000,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
    },
  });

  const daoV2 = await deploy('DaoV2', { contract: 'Dao', from: deployer, log: true, gasLimit: 5000000 });
  const liquidPoolV2 = await deploy('LiquidPoolV2', { contract: 'LiquidPool', from: deployer, log: true, gasLimit: 7000000 });
  const priceRouterV2 = await deploy('PriceRouterV2', { contract: 'PriceRouter', from: deployer, log: true, gasLimit: 7000000 });
  const adam = await ethers.getContractAt('Adam', adamDeployment.address);

  const governFactory = await ethers.getContractAt('GovernFactory', governFactoryDeployment.address);

  const membershipImplementation = await adam.membershipImplementation();
  const memberTokenImplementation = await adam.memberTokenImplementation();
  const governImplementation = await governFactory.governImplementation();

  const isLiquidPoolNewlyDeploy = await adam.liquidPoolImplementation() !== liquidPoolV2.address;
  const isDaoNewlyDeploy = await adam.daoImplementation() !== daoV2.address;
  const isPriceRouterNewlyDeploy = await adam.priceRouterImplementation() !== priceRouterV2.address;

  if (isDaoNewlyDeploy || isLiquidPoolNewlyDeploy || isPriceRouterNewlyDeploy) {
    await execute('Adam', { from: deployer, log: true }, 'upgradeImplementations',
      daoV2.address,
      membershipImplementation,
      liquidPoolV2.address,
      memberTokenImplementation,
      priceRouterV2.address,
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
    membership: membershipImplementation,
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
    priceRouter: priceRouterV2.address,
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
  'PriceRouter',
];
