const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');

// rinkeby
const adamAddress = '0x8C8B8500De0E4de7e8624631d60eE02B0F40d384';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  await [0, 100, 4, 500, 10000000].reduce(async (p, lockup) => {
    await p;
    const tx = await adam.createDao([
        faker.company.companyName(),
        faker.commerce.productDescription(),
        lockup,
        true,
        [300, 3000, 5000, 0],
        [300, 3000, 5000, 0],
        [300, 3000, 5000, 0],
        [300, 3000, 5000, 1],
        ["${faker.company.companyName()}Token", "MT"],
        100,
        0,
        0,
    ]);
    return tx.wait().then((receipt) => {
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      console.log(`dao (lockup: ${lockup}) created at:`, creationEventLog.args.dao);
    });
  }, Promise.resolve());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
