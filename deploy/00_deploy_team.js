const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  // const { deploy } = deployments;
  // const { deployer } = await getNamedAccounts();
  // await deploy('Team', {
  //   from: deployer,
  //   log: true,
  //   skipIfAlreadyDeployed: true,
  //   args: [],
  //   gasLimit: 6000000,
  //   ...(await gasFeeConfig()),
  //   proxy: {
  //     proxyContract: 'ERC1967Proxy',
  //     proxyArgs: ['{implementation}', '{data}'],
  //     execute: {
  //       init: {
  //         methodName: 'initialize',
  //         args: [],
  //       },
  //     },
  //   },
  // });
};

module.exports.tags = [
  'Team',
  'phase1',
];
