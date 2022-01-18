const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const adamAddress = '0x12b66E9f992337eCC16046C0De1748928B469402';
const amName = 'Peter';

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
