
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy('Dao', { from: deployer, log: true });
  await deploy('Membership', { from: deployer, log: true });
  await deploy('LiquidPool', { from: deployer, log: true });
  await deploy('DepositPool', { from: deployer, log: true });
  await deploy('OptInPool', { from: deployer, log: true });
  await deploy('MemberToken', { from: deployer, log: true });
};

module.exports.tags = [
  'Dao',
  'Membership',
  'LiquidPool',
  'DepositPool',
  'OptInPool',
  'MemberToken',
];
