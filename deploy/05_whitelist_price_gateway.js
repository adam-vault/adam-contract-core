const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { execute, read, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'goerli';

  const priceGateway = deployNetwork.includes('arbitrum') ? await get('ArbitrumChainlinkPriceGateway') : await get('EthereumChainlinkPriceGateway');
  if (!await read('Adam', 'priceGateways', priceGateway.address)) {
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'whitelistPriceGateways', priceGateway.address);
  }
};

module.exports.tags = [
  'v2',
  'priceGateway',
];
