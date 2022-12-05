const { ethers } = require('hardhat');
const fileReader = require('../utils/fileReader');
// eslint-disable-next-line node/no-unpublished-require
const { mergeABIs } = require('hardhat-deploy/dist/src/utils');

const { provider, utils } = hre.ethers;
module.exports = async ({ getNamedAccounts, deployments }) => {
  const {
    deploy,
    execute,
    get,
    getExtendedArtifact,
    getOrNull,
    getArtifact,
    save,
  } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';

  const adamDeployment = await get('Adam'); ;
  const adamV2Implementation = await deploy('Adam_Implementation', { contract: 'Adam', from: deployer, log: true, gasLimit: 3000000 });
  const oldAdamImplementation = await getImplementationAddress(adamDeployment.address);

  if (adamV2Implementation.address !== oldAdamImplementation) {
    await execute('Adam', { from: deployer, log: true }, 'upgradeTo', adamV2Implementation.address);
  }

  const daoV2 = await deploy('DaoV2', { contract: 'Dao', from: deployer, log: true, gasLimit: 5000000 });
  const liquidPoolV2 = await deploy('LiquidPoolV2', { contract: 'LiquidPool', from: deployer, log: true, gasLimit: 7000000 });
  const priceRouterV2 = await deploy('PriceRouterV2', { contract: 'PriceRouter', from: deployer, log: true, gasLimit: 7000000 });

  const governFactoryDeployment = await get('GovernFactory');
  const governFactory = await ethers.getContractAt('GovernFactory', governFactoryDeployment.address);
  const adam = await ethers.getContractAt('Adam', adamDeployment.address);

  const proxy = await getOrNull('Adam_Proxy');
  const proxyContract = await getExtendedArtifact('ERC1967Proxy');
  const adamArtifact = await getArtifact('Adam');

  const proxiedDeployment = {
    ...proxyContract,
    receipt: proxy.receipt,
    address: proxy.address,
    linkedData: undefined,
    abi: getProxiedABI(proxyContract.abi, adamArtifact.abi),
    implementation: adamV2Implementation.address,
    args: proxy.args,
    execute: undefined,
  };
  if (adamDeployment) {
    // TODO reenable history with options
    if (adamDeployment.history) {
      proxiedDeployment.history = proxiedDeployment.history
        ? proxiedDeployment.history.concat([adamDeployment])
        : [adamDeployment];
    }
  }

  await save('Adam', proxiedDeployment);

  const membershipImplementation = await adam.membershipImplementation();
  const memberTokenImplementation = await adam.memberTokenImplementation();
  const governImplementation = await governFactory.governImplementation();

  if (await needUpgradeImp(adam, daoV2.address, liquidPoolV2.address, priceRouterV2.address)) {
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
async function getImplementationAddress (contractAddress) {
  const EIP1967_STORAGE_SLOT = utils.hexlify(
    ethers.BigNumber.from(utils.id('eip1967.proxy.implementation')).sub(1));
  return utils.getAddress(
    utils.hexStripZeros(
      await provider.getStorageAt(contractAddress, EIP1967_STORAGE_SLOT)),
  );
}

async function needUpgradeImp (adamContract, oldDaoAddress, oldLiquidPoolAddress, oldPriceRouterAddress) {
  return (
    await adamContract.liquidPoolImplementation() !== oldLiquidPoolAddress ||
    await adamContract.daoImplementation() !== oldDaoAddress ||
    await adamContract.priceRouterImplementation() !== oldPriceRouterAddress
  );
}
function getProxiedABI (proxyContractABI, contractABI) {
  const mergedABI = mergeABIs([proxyContractABI, contractABI], {
    check: true,
    skipSupportsInterface: true,
  }).filter((v) => v.type !== 'constructor');

  const proxyContractConstructor = proxyContractABI.find(
    (v) => v.type === 'constructor',
  );

  mergedABI.push(proxyContractConstructor); // use proxy constructor abi
  return mergedABI;
}
module.exports.tags = [
  'Dao',
  'Membership',
  'LiquidPool',
  'MemberToken',
  'PriceRouter',
];
