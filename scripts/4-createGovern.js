const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const daoAddress = '0x4ff9F9A3beB4F9147E683D5a315592f7c46f19b9';

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  await dao.createGovern('GovernA', 3600, 1000, 10000, [1], 0);
  // Must use a dao with member token in order to create GovernB
  await dao.createGovern('GovernB', 3600, 1000, 10000, [1], 1);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
