const { gasFeeConfig } = require('../utils/getGasInfo');

/**
 * @param  {} {getNamedAccounts
 * @param  {} deployments}
 * @description deploy adam implementation and adam dependence like , Dao , Govern, LiquidPool, MemberShip , MemberToken
 */
module.exports = async ({ getNamedAccounts, deployments }) => {
  const {
    deploy,
  } = deployments;
  const { deployer } = await getNamedAccounts();

  // upgrade Adam dependance
  await deploy('DaoV2', { contract: 'Dao', from: deployer, log: true, ...(await gasFeeConfig()) });
  await deploy('GovernV2', { contract: 'Govern', from: deployer, log: true, gasLimit: 5000000, ...(await gasFeeConfig()) });
  await deploy('LiquidPoolV2', { contract: 'LiquidPool', from: deployer, log: true, gasLimit: 7000000, ...(await gasFeeConfig()) });
  await deploy('MembershipV2', { contract: 'Membership', from: deployer, log: true, gasLimit: 5000000, ...(await gasFeeConfig()) });
  await deploy('AccountSystem', { contract: 'AccountSystem', from: deployer, log: true, ...(await gasFeeConfig()) });
  await deploy('Adam_Implementation', { contract: 'Adam', from: deployer, log: true, gasLimit: 3000000, ...(await gasFeeConfig()) });
};
module.exports.tags = [
  'Dao',
  'Membership',
  'LiquidPool',
  'Govern',
];
