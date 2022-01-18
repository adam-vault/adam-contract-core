const hre = require('hardhat');

// ropsten
const adamAddress = '0x4984aA79B387c1cFeE5Cf8B79CCB0424865e6f96';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createAssetManager('AM Ltd');
  const receipt = await tx.wait();

  console.log(receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
