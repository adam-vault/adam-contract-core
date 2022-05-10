const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const deploymentResult = fileReader.load('deploy/results.json', 'utf8');

// rinkeby
const daoAddress = deploymentResult.initdata_addresses.daos[0].address;

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const lpAddress = await dao.liquidPool();
  const dpAddress = await dao.depositPool();

  const lp = await hre.ethers.getContractAt('LiquidPool', lpAddress);
  const dp = await hre.ethers.getContractAt('DepositPool', dpAddress);

  await lp.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
  await dp.deposit({ value: hre.ethers.utils.parseEther('0.000456') });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
