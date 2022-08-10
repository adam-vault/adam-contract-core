module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy('Team', {
    from: deployer,
    log: true,
    args: [],
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
    //   execute: {
    //     init: {
    //       methodName: 'initialize',
    //       args: [],
    //     },
    //   },
    },
  });
};

module.exports.tags = [
  'Team',
];
