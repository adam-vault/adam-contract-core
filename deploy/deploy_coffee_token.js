const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('CoffeeToken', {
    from: deployer,
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    gasLimit: 5000000,
    ...(await gasFeeConfig()),
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            'CoffeeToken',
            'COFF',
          ],
        },
      },
    },
  });
};

module.exports.tags = [
  'CoffeeToken',
];
