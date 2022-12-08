const { gasFeeConfig } = require('../utils/getGasInfo');
const { getImplementationAddress, getProxiedABI } = require('../utils/artifactHelper');
/**
 * @param  {} {getNamedAccounts
 * @param  {} deployments}
 * @description Upgrade Govern Factory implementation
 */
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

  const governFactoryDeployment = await get('GovernFactory');
  const governFactoryV2Implementation = await deploy('GovernFactory_Implementation', { contract: 'GovernFactory', from: deployer, log: true, gasLimit: 3000000, ...(await gasFeeConfig()) });
  const oldGovernFactoryImplementation = await getImplementationAddress(governFactoryDeployment.address);

  if (governFactoryV2Implementation.address !== oldGovernFactoryImplementation) {
    await execute('GovernFactory', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'upgradeTo', governFactoryV2Implementation.address);
    const proxy = await getOrNull('GovernFactory_Proxy');
    const proxyContract = await getExtendedArtifact('ERC1967Proxy');
    const adamArtifact = await getArtifact('GovernFactory');

    const proxiedDeployment = {
      ...proxyContract,
      receipt: proxy.receipt,
      address: proxy.address,
      linkedData: undefined,
      abi: getProxiedABI(proxyContract.abi, adamArtifact.abi),
      implementation: governFactoryV2Implementation.address,
      args: proxy.args,
      execute: undefined,
    };
    if (governFactoryDeployment) {
      // TODO reenable history with options
      if (governFactoryDeployment.history) {
        proxiedDeployment.history = proxiedDeployment.history
          ? proxiedDeployment.history.concat([governFactoryDeployment])
          : [governFactoryDeployment];
      }
    }

    await save('GovernFactory', proxiedDeployment);
  }
};

module.exports.tags = [
  'GovernFactory',
];
