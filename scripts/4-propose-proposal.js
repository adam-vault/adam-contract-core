const hre = require('hardhat');
const { faker } = require('@faker-js/faker');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

// rinkeby
const governAddress = process.env.GOVERN_DAO_LOCK_TIME_0;
const daoAddress = process.env.DAO_LOCK_TIME_0;

async function main () {
  const govern = await hre.ethers.getContractAt('Govern', governAddress);

  const Dao = await hre.ethers.getContractFactory('Dao');

  const calldata = Dao.interface.encodeFunctionData('createGovern', ['New Proposal Cat', 3600, 1000, 10000, [1], 0]);

  await govern.propose([daoAddress], [0], [calldata], faker.commerce.productDescription());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});