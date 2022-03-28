const hre = require('hardhat');

// rinkeby
const daoAddress = '0x1d917696b3116caf05ee27205c54e0782cd74f25';

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
