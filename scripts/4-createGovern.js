const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const daoAddress = '0xa9D36Fe3bDF720e0d1044282fa37386306BCbf96';

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const membership = await dao.membership();
  await dao.createGovern('Govern', 3600, 1000, 10000, [1], [membership]);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
