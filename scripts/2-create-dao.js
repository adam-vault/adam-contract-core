const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');

// rinkeby
const adamAddress = '0x41B0919976F6120BB1a89659Ba4eC7109A775F11';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  await [0, 100, 4, 500, 10000000].reduce(async (p, lockup) => {
    await p;
    const tx = await adam.createDao(faker.company.companyName(), faker.commerce.productDescription(), lockup, [13, 3000, 5000], [13, 3000, 5000], [13, 3000, 5000]);
    return tx.wait().then((receipt) => {
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      console.log('dao created at:', creationEventLog.args.dao);
    });
  }, Promise.resolve());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
