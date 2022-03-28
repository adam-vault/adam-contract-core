const hre = require('hardhat');
const { faker } = require('@faker-js/faker');

// rinkeby
const governAddress = '0x90c875f2606c35fe6da67ca289e68dc89e3f05ed';
const daoAddress = '0xa9D36Fe3bDF720e0d1044282fa37386306BCbf96';

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
