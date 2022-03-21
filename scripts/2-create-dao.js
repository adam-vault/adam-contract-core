const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const adamAddress = '0xdacB1Faa1749976aCc37bAbD4aEb97d735B22F7d';
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createDao('Dao', 'D', 'Description', 10000000, [hre.ethers.constants.AddressZero, DAIAddress]);
  const receipt = await tx.wait();
  const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });

  console.log('dao created at:', creationEventLog.args.dao);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
