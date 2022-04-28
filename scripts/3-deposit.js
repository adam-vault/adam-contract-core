const hre = require('hardhat');
const deployResultStore = require('./utils/deploy-result-store');
const deploymentResult = deployResultStore.load();

// rinkeby
const daoAddress = deploymentResult.addresses.DAO_LOCK_TIME_0;

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const lpAddress = await dao.liquidPool();
  const lp = await hre.ethers.getContractAt('LiquidPool', lpAddress);

  await lp.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
