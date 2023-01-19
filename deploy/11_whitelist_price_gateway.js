const { gasFeeConfig } = require('../utils/getGasInfo');

const toBeAddPriceGateways = [
  { name: 'ArbitrumChainlinkPriceGateway', contract: 'ArbitrumChainlinkPriceGateway' },
  { name: 'EthereumChainlinkPriceGateway', contract: 'EthereumChainlinkPriceGateway' },
];

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, getOrNull, execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const toBeRemove = [];
  const toBeAdd = [];

  await toBeAddPriceGateways.reduce(async (pm, { name, contract }) => {
    await pm;
    const existing = await getOrNull(name);
    const result = await deploy(name, {
      contract,
      from: deployer,
      log: true,
      gasLimit: 6000000,
      ...(await gasFeeConfig()),
    });
    if (!existing || existing.address !== result.address) {
      if (existing && await read('Adam', 'priceGateways', existing.address)) {
        toBeRemove.push(existing.address);
      }
      if (!await read('Adam', 'priceGateways', result.address)) {
        toBeAdd.push(result.address);
      }
    }
  }, Promise.resolve());

  if (toBeRemove.length) {
    console.log(`${toBeRemove} to be abandoned.`);
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'abandonPriceGateways', toBeRemove);
  }

  if (toBeAdd.length) {
    console.log(`${toBeAdd} to be whitelisted.`);
    await execute('Adam', { from: deployer, log: true, ...(await gasFeeConfig()) }, 'whitelistPriceGateways', toBeAdd);
  }
};

module.exports.tags = [
  'v2',
  'priceGateway',
];
