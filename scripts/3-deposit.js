const hre = require('hardhat');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

// rinkeby
const daoAddress = process.env.DAO_LOCK_TIME_0;

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
