module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const govern = await deploy('Govern', {
    from: deployer,
    log: true,
  });
  await deploy('GovernFactory', {
    from: deployer,
    log: true,
    args: [],
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [govern.address],
        },
      },
    },
  });
};

module.exports.tags = [
  'Govern',
  'GovernFactory',
];
