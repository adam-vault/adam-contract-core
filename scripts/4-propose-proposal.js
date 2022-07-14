const hre = require('hardhat');
const { faker } = require('@faker-js/faker');
const fileReader = require('../utils/fileReader');
const deploymentResult = fileReader.load('deploy/results.json', 'utf8');

// rinkeby
const governAddress = deploymentResult.initdata_addresses.dao0BudgetGovern;
const daoAddress = deploymentResult.initdata_addresses.daos[0].address;

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
