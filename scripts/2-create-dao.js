const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');

// rinkeby
const adamAddress = '0xdacB1Faa1749976aCc37bAbD4aEb97d735B22F7d';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  await Promise.all([0, 100, 4, 500, 10000000].map(async (lockup) => {
    const tx = await adam.createDao(faker.company.companyName(), faker.commerce.productDescription(), lockup, [13, 3000, 5000], [13, 3000, 5000], [13, 3000, 5000]);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
    console.log('dao created at:', creationEventLog.args.dao);
  }));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
