const hre = require('hardhat');

// rinkeby
const daoAddress = '0x38B190D5779dC03209132842f070EfD137AA07E4';

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
