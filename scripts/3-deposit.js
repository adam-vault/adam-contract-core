const hre = require('hardhat');

// rinkeby
const daoAddress = '0xa9D36Fe3bDF720e0d1044282fa37386306BCbf96';

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  await dao.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
