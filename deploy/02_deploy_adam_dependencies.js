
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy('Dao', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 7000000, maxPriorityFeePerGas: 20000 });
  await deploy('Membership', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 6000000, maxPriorityFeePerGas: 20000 });
  await deploy('LiquidPool', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 7000000, maxPriorityFeePerGas: 20000 });
  await deploy('MemberToken', { from: deployer, log: true, skipIfAlreadyDeployed: true, gasLimit: 5000000, maxPriorityFeePerGas: 20000 });
};

module.exports.tags = [
  // 'Dao',
  'Membership',
  'LiquidPool',
  'MemberToken',
  'phase3',
];
