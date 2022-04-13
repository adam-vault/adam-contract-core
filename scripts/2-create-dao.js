const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');
const { ethers } = require('ethers');

// rinkeby
const adamAddress = '0x4099d92F97C48695c8cC388D04Bd2384CDa68A0c';

async function main () {
  let memberTokenType = 0;
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  await [0, 100, 4, 500, 10000000].reduce(async (p, lockup) => {
    await p;
    const tx = await adam.createDao([
      faker.company.companyName(),
      faker.commerce.productDescription(),
      lockup,
      memberTokenType,
      ethers.constants.AddressZero,
      [300, 3000, 5000, 0],
      [300, 3000, 5000, 0],
      [300, 3000, 5000, 0],
      memberTokenType === 1 ? [300, 3000, 5000, 1] : [300, 3000, 5000, 0],
      [`${faker.company.companyName()}Token`, 'MT'],
      100,
      0,
      0,
    ]);

    // if we have a 721 external token, we can change to 2
    if (memberTokenType === 1) {
      memberTokenType = 0;
    } else {
      memberTokenType++;
    }

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
