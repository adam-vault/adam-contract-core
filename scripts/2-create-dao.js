const hre = require('hardhat');
const _ = require('lodash');
const { faker } = require('@faker-js/faker');
const deployResultStore = require('./utils/deploy-result-store');

// rinkeby
const DAI = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';
const USDC = '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b';
const USDT = '0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02';
const deploymentResult = deployResultStore.load();
console.log(deploymentResult);
const adamAddress = deploymentResult.addresses.adam;

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
      [DAI, USDC, USDT],
    ]);

    return tx.wait().then((receipt) => {
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      console.log(`dao (lockup: ${lockup}) created at:`, creationEventLog.args.dao);
      daoAddresses.push(creationEventLog.args.dao);
    });
  }, Promise.resolve());

  const governFactory = await hre.ethers.getContractAt('GovernFactory', deploymentResult.addresses.governFactory);
  const GOVERN_DAO_LOCK_TIME_0 = await governFactory.governMap(daoAddresses[0], 'BudgetApproval');
  deployResultStore.save({
    ...deploymentResult,
    addresses: {
      ...deploymentResult.addresses,
      DAO_LOCK_TIME_0: daoAddresses[0],
      DAO_LOCK_TIME_100_A: daoAddresses[1],
      DAO_LOCK_TIME_100_B: daoAddresses[2],
      DAO_LOCK_TIME_100_C: daoAddresses[3],
      GOVERN_DAO_LOCK_TIME_0,
    },
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
