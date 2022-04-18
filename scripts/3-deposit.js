const hre = require('hardhat');

// rinkeby
const daoAddress = '0x6Ad78b9a145f85F92A30C7AdF5E64faC108F9587';

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
