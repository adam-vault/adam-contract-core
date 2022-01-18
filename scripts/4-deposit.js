const hre = require('hardhat');

// ropsten

const strategyAddress = '0x0364d0d294a505205Ed5815B6619B0dc2122753d';

async function main () {
  const strategy = await hre.ethers.getContractAt('Strategy', strategyAddress);
  const tx = await strategy.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
  const receipt = await tx.wait();
  console.log(receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
