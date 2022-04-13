const hre = require('hardhat');
const { faker } = require('@faker-js/faker');

// rinkeby
const governAddress = '0x2396657C0c870a95deBb5c3C947bd47DEfc721F6';
const daoAddress = '0x38B190D5779dC03209132842f070EfD137AA07E4';

async function main () {
  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);

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
