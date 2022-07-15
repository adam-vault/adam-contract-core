const hre = require('hardhat');
const _ = require('lodash');
const fileReader = require('../utils/fileReader');
const deploymentResult = fileReader.load('deploy/results.json', 'utf8');

const daoAddress = deploymentResult.initdata_addresses.daos[0].address;
const deployNetwork = deploymentResult.network;
const {
  ETH_ADDRESS,
} = fileReader.load(`constant/${deployNetwork}.json`, 'utf-8');

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const dpAddress = await dao.depositPool();
  const dp = await hre.ethers.getContractAt('DepositPool', dpAddress);
  await dp.deposit({ value: hre.ethers.utils.parseEther('0.0000002') });

  const currentBlock = await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber());
  const tx1 = await dao.createOptInPool(
    ETH_ADDRESS,
    hre.ethers.utils.parseEther('0.0000001'),
    currentBlock.timestamp + 1000,
    [ETH_ADDRESS],
    currentBlock.timestamp + 2000,
    [],
    [],
  );
  const receipt1 = await tx1.wait();
  const creationEventLog1 = _.find(receipt1.events, { event: 'CreateOptInPool' });
  const optInPoolAddr = creationEventLog1.args.optInPool;
  const optInPool = await hre.ethers.getContractAt('OptInPool', optInPoolAddr);

  await dp.setApprovalForAll(optInPoolAddr, true);
  await optInPool.join(hre.ethers.utils.parseEther('0.0000001'));
  console.log('OptInPool Created (Meet Deposit Requirement)', optInPoolAddr);

  const currentBlock2 = await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber());
  const tx2 = await dao.createOptInPool(
    ETH_ADDRESS,
    hre.ethers.utils.parseEther('0.0000001'),
    currentBlock2.timestamp + 1000,
    [ETH_ADDRESS],
    currentBlock2.timestamp + 2000,
    [],
    [],
  );
  const receipt2 = await tx2.wait();
  const creationEventLog2 = _.find(receipt2.events, { event: 'CreateOptInPool' });
  const optInPoolAddr2 = creationEventLog2.args.optInPool;
  const optInPool2 = await hre.ethers.getContractAt('OptInPool', optInPoolAddr2);

  await dp.setApprovalForAll(optInPoolAddr2, true);
  await optInPool2.join(hre.ethers.utils.parseEther('0.0000000.5'));
  console.log('OptInPool Created', optInPoolAddr);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
