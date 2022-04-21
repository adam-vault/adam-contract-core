const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const overwriteAddressEnv = require('./utils/overwriteAddressEnv');

// rinkeby
const adamAddress = process.env.ADAM;
const daoAddresses = [];
const testingDataSet = [
  { lockup: 0, memberTokenType: 0, memberToken: hre.ethers.constants.AddressZero },
  { lockup: 100, memberTokenType: 0, memberToken: hre.ethers.constants.AddressZero },
  { lockup: 100, memberTokenType: 1, memberToken: hre.ethers.constants.AddressZero },
  { lockup: 100, memberTokenType: 2, memberToken: '0x81D3352bDb18A8484aCe25A6d51D1D12c10552C6' },
];

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);

  await testingDataSet.reduce(async (p, { lockup, memberTokenType, memberToken }) => {
    await p;
    const tx = await adam.createDao([
      faker.company.companyName(),
      faker.commerce.productDescription(),
      lockup,
      memberTokenType,
      memberToken,
      [300, 3000, 5000, 0],
      [300, 3000, 5000, 0],
      [300, 3000, 5000, 0],
      [300, 3000, 5000, 0],
      [`${faker.company.companyName()}Token`, 'MT'],
      100,
      0,
      0,
    ]);

    return tx.wait().then((receipt) => {
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      console.log(`dao (lockup: ${lockup}) created at:`, creationEventLog.args.dao);
      daoAddresses.push(creationEventLog.args.dao);
    });
  }, Promise.resolve());

  const governFactory = await hre.ethers.getContractAt('GovernFactory', process.env.GOVERN_FACTORY);
  const GOVERN_DAO_LOCK_TIME_0 = await governFactory.governMap(daoAddresses[0], 'BudgetApproval');

  overwriteAddressEnv({
    DAO_LOCK_TIME_0: daoAddresses[0],
    DAO_LOCK_TIME_100_A: daoAddresses[1],
    DAO_LOCK_TIME_100_B: daoAddresses[2],
    DAO_LOCK_TIME_100_C: daoAddresses[3],
    GOVERN_DAO_LOCK_TIME_0,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
