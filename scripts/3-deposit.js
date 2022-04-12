const hre = require('hardhat');

// rinkeby
const daoAddress = '0x4ff9F9A3beB4F9147E683D5a315592f7c46f19b9';

async function main () {
  const [creator] = await ethers.getSigners();

  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  await dao.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
