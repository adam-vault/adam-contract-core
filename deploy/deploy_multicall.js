const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(deployer)
  await deploy('SimpleMulticall', {
    from: deployer,
    log: true,
    args: [deployer],
  });
};

module.exports.tags = [
  'SimpleMulticall',
];
