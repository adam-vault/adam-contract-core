const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('CoffeeToken', {
    from: deployer,
    log: true,
    args: [],
    gasLimit: 5000000,
    proxy: {
      proxyContract: 'UUPS',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            'CoffeeDAO BETA',
            '$COFBETA',
          ],
        },
      },
    },
  });
};

module.exports.tags = [
  'CoffeeToken',
];
