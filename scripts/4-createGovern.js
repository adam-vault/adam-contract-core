const hre = require('hardhat');

// rinkeby
const daoAddress = '0x1d917696b3116caf05ee27205c54e0782cd74f25';

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
