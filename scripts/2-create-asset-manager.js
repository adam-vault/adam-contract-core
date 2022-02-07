const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const adamAddress = '0x414592a53A0ce977cfE7Ad5255dd072F815a002e';
const amName = 'Peter Chan';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createAssetManager(amName);
  const receipt = await tx.wait();
  const creationEventLog = _.find(receipt.events, { event: 'CreateAssetManager' });

  console.log('assetManager created at:', creationEventLog.args.assetManager);

  await hre.run('verify:verify', {
    address: creationEventLog.args.assetManager,
    constructorArguments: [
      adamAddress,
      receipt.from,
      amName,
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
