const hre = require('hardhat');

// ropsten
const adamAddress = '0x023aff4b687c5b0ea878e239bed8cf6260b03ac5';
const assetManager = '0xb10901d0af06c58f1f9ad3cbc787f4c8ae73ec29';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createStrategy(assetManager, 'Global Assets', false);
  const receipt = await tx.wait();
  console.log(receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
