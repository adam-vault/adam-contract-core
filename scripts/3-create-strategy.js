const hre = require('hardhat');
const _ = require('lodash');
// ropsten
const adamAddress = '0x12b66E9f992337eCC16046C0De1748928B469402';
const assetManager = '0x36f02785051f349B9a37bCB0393D7cCd960Ce589';
const sName = 'Global Assets';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createStrategy(assetManager, sName, false);
  const receipt = await tx.wait();
  const creationEventLog = _.find(receipt.events, { event: 'CreateStrategy' });
  console.log(creationEventLog);
  console.log('strategy created at:', creationEventLog.args.strategy);

  await hre.run('verify:verify', {
    address: creationEventLog.args.strategy,
    constructorArguments: [
      assetManager,
      sName,
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
