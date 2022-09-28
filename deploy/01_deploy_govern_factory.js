module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const govern = await deploy('Govern', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    gasLimit: 4000000,
  });

  await deploy('GovernFactory', {
    from: deployer,
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    gasLimit: 6000000,
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
