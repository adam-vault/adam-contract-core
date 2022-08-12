const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const { ethers } = require('hardhat');
const deploymentResult = fileReader.load('deploy-results/results.json', 'utf8');

async function getLatestImplementation(address) {
  const upgradableContract = await hre.ethers.getContractAt('UUPSUpgradeable', address);
  const events = await upgradableContract.queryFilter(upgradableContract.filters.Upgraded());
  return events.pop().args.implementation;
}

async function main() {
  const newDeployment = { // implementation address
    dao: deploymentResult.addresses.dao,
    govern: deploymentResult.addresses.govern,
    memberToken: deploymentResult.addresses.memberToken,
    membership: deploymentResult.addresses.membership,
    liquidPool: deploymentResult.addresses.liquidPool,
  };

  const adam = await hre.ethers.getContractAt('Adam', deploymentResult.addresses.adam);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daoAddresses = await events.map(e => e.args.dao);

  const daoAddress = daoAddresses.pop();

  // console.log({ daoAddresses, newDeployment });
  // await daoAddresses.reduce(async (p, daoAddress) => {
  //   await p;
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const governAddress = await dao.govern('General');
  const memberToken = await dao.memberToken();
  const membership = await dao.membership();
  const liquidPool = await dao.liquidPool();

  console.log('=== Dao: ' + daoAddress + '===');
  console.log('\n=== Comparing implementation changes ===\n');

  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const calldatas = [];
  const description = [];

  async function upgradeContract(name, contractAddress, newImplAddress) {
    console.log(`\n${name} Contract: ${contractAddress}`);
    const originalImpl = await getLatestImplementation(contractAddress);
    if (originalImpl.toLowerCase() !== newImplAddress.toLowerCase()) {
      console.log(`=> ${originalImpl} -> ${newImplAddress}`);
      description.push(`${name} Contract: ${contractAddress}\n${originalImpl} -> ${newImplAddress}`);
      calldatas.push(dao.interface.encodeFunctionData('upgradeContractTo', [contractAddress, newImplAddress]));
    }
  }

  const originalDaoImpl = await getLatestImplementation(daoAddress);
  console.log(`Dao Contract: ${daoAddress}`);
  if (originalDaoImpl.toLowerCase() !== newDeployment.dao.toLowerCase()) {
    console.log(`=> ${originalDaoImpl} -> ${newDeployment.dao}`);
    description.push(`Dao Contract: ${daoAddress}\n${originalDaoImpl} -> ${newDeployment.dao}`);
    calldatas.push(dao.interface.encodeFunctionData('upgradeTo', [newDeployment.dao]));
  }

  await upgradeContract('Membership', membership, newDeployment.membership);
  await upgradeContract('LiquidPool', liquidPool, newDeployment.liquidPool);
  await upgradeContract('Govern', governAddress, newDeployment.govern);

  if (memberToken.toLowerCase() !== ethers.constants.AddressZero) {
    await upgradeContract('MemberToken', memberToken, newDeployment.memberToken);
  }

  if (!calldatas.length) {
    return Promise.resolve();
  }

  const descriptioJson = JSON.stringify({
    category: 'Version',
    subcategory: 'upgrade',
    title: 'Update to latest version 6',
    description: description.join('\n'),
  });

  console.log('\n=== Prepare Proposal Data ===\n');
  console.log(descriptioJson);

  console.log('\n=== Submit Tx for Govern.propose ===\n');
  const tx = await govern.propose(calldatas.map(() => daoAddress), calldatas.map(() => 0), calldatas, descriptioJson);

  console.log('\n=== Wait for 1 block and Vote ===\n');
  const receipt = await tx.wait();
  const event = receipt.events.pop();
  const proposalId = event.args.proposalId;
  console.log('Govern', governAddress);
  console.log('Proposal ID', proposalId);
  console.log('StartBlock', event.args.startBlock);
  console.log('EndBlock', event.args.endBlock);

  fileReader.save('deploy-results', 'results.json', {
    ...deploymentResult,
    initdata_addresses: {
      governAddress,
      proposalId: proposalId.toString(),
    },
  });


  // console.log('\n=== Submit Tx for Govern.castVote(yes) ===\n');
  // const tx1 = await govern.castVote(proposalId, '1');

  // console.log('\n=== Wait for 6 block and Execute ===\n');
  // await tx1.wait(6);

  // console.log('\n=== Submit Tx for Govern.execcute(proposal) ===\n');
  // await govern.execute(calldatas.map(() => daoAddress), calldatas.map(() => 0), calldatas, ethers.utils.id(descriptioJson));
  // console.log('Proposal Executed');

  //   }, Promise.resolve());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
