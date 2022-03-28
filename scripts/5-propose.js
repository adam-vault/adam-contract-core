const hre = require('hardhat');
const { faker } = require('@faker-js/faker');

// rinkeby
const governAddress = '0xe27e58411024e812521169b3bf13ff6df1a9658f';
const daoAddress = '0x1d917696b3116caf05ee27205c54e0782cd74f25';

async function main () {
  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const membership = await dao.membership();

  const Dao = await hre.ethers.getContractFactory('Dao');

  const calldata = Dao.interface.encodeFunctionData('createGovern', ['New Proposal Cat', 3600, 1000, 10000, [1], [membership]]);
  await govern.propose([daoAddress], [0], [calldata], faker.commerce.productDescription());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
