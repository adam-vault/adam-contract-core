const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('FomoToken', {
    from: deployer,
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            'FOMO Token',
            '$FOMO',
          ],
        },
      },
    },
  });
};

module.exports.tags = [
  'FomoToken',
];
