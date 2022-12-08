const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');
const { getImplementationAddress, getProxiedABI } = require('../utils/artifactHelper');

/**
 * @param  {} {getNamedAccounts
 * @param  {} deployments}
 * @description deploy 1. adam implementation 2. run upgrade implementation if any dependance update
 */
module.exports = async ({ getNamedAccounts, deployments }) => {
  const {
    execute,
    get,
    getExtendedArtifact,
    getOrNull,
    getArtifact,
    save,
    read,
  } = deployments;
  const { deployer } = await getNamedAccounts();

  const adamDeployment = await get('Adam');
  const adamV2Implementation = await get('Adam_Implementation');
  const oldAdamImplementation = await getImplementationAddress(adamDeployment.address);

  if (adamV2Implementation.address !== oldAdamImplementation) {
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeTo', adamV2Implementation.address);
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
  }

  const daoV2 = await get('DaoV2');
  const governV2 = await get('GovernV2');
  const liquidPoolV2 = await get('LiquidPoolV2');
  const membershipV2 = await get('MembershipV2');
  const memberTokenImplementation = await read('Adam', 'memberTokenImplementation');

  const isGovernImpUpgraded = (await read('GovernFactory', 'governImplementation') !== governV2.address);

  if (isGovernImpUpgraded) {
    await execute('GovernFactory', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'setGovernImplementation', governV2.address);
  }

  if (
    await read('Adam', 'daoImplementation') !== daoV2.address ||
    await read('Adam', 'membershipImplementation') !== membershipV2.address ||
    await read('Adam', 'liquidPoolImplementation') !== liquidPoolV2.address ||
    isGovernImpUpgraded
  ) { // todo : if any other adam dependence is upgraded, need one more checking here
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeImplementations',
      daoV2.address,
      membershipV2.address,
      liquidPoolV2.address,
      memberTokenImplementation,
      governV2.address,
      process.env.LATEST_VERSION || 'v2.0.0',
    );
  }
};
module.exports.tags = [
  'Adam',
  'AdamImplementation',
];
