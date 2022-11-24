const hre = require('hardhat');
const inquirer = require('inquirer');

async function main () {
  const [signer] = await hre.ethers.getSigners();
  const tx = {
    nonce: 148,
    to: hre.ethers.constants.AddressZero,
    data: '0x',
    gasPrice: hre.ethers.utils.parseUnits('100', 'gwei'),
  }; // costs 21000 gas
  await signer.sendTransaction(tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
