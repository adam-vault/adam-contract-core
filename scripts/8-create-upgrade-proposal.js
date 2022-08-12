const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const { ethers } = require('hardhat');
const deploymentResult = fileReader.load('deploy-results/results.json', 'utf8');

async function getLatestImplementation(address) {
  const upgradableContract = await hre.ethers.getContractAt('UUPSUpgradeable', address);
  const events = await upgradableContract.queryFilter(upgradableContract.filters.Upgraded());
  return events.pop();
}

async function main () {
  const newDeployment = { // implementation address
    dao: deploymentResult.addresses.dao,
    memberToken: deploymentResult.addresses.memberToken,
    membership: deploymentResult.addresses.membership,
    liquidPool: deploymentResult.addresses.liquidPool,
  };

  const adam = await hre.ethers.getContractAt('Adam', deploymentResult.addresses.adam);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daoAddresses = await events.map(e => e.args.dao);

  await daoAddresses.reduce(async (p, daoAddress) => {
    await p;
    const dao = await hre.ethers.getContractAt('Dao', daoAddress);
    const governAddress = await dao.govern('General');
    const memberToken = await dao.memberToken();
    const membership = await dao.membership();
    const liquidPool = await dao.liquidPool();

    const govern = await hre.ethers.getContractAt('Govern', governAddress);
    const calldatas = [];
    const description = [];

    const originalDaoImpl = await getLatestImplementation(daoAddress);
    if (originalDaoImpl.toLowerCase() !== newDeployment.dao.toLowerCase()) {
      description.push(`Dao Contract: ${originalDaoImpl} -> ${newDeployment.dao}`);
      calldatas.push(dao.interface.encodeFunctionData('upgradeTo', [newDeployment.dao]));
    }

    const originalMembershipImpl = await getLatestImplementation(membership);
    if (originalMembershipImpl.toLowerCase() !== newDeployment.membership.toLowerCase()) {
      description.push(`Membership Contract: ${originalMembershipImpl} -> ${newDeployment.membership}`);
      calldatas.push(dao.interface.encodeFunctionData('upgradeContractTo', [membership, newDeployment.membership]));
    }

    const originalLiquidPoolImpl = await getLatestImplementation(liquidPool);
    if (originalLiquidPoolImpl.toLowerCase() !== newDeployment.liquidPool.toLowerCase()) {
      description.push(`LiquidPool Contract: ${originalLiquidPoolImpl} -> ${newDeployment.liquidPool}`);
      calldatas.push(dao.interface.encodeFunctionData('upgradeContractTo', [liquidPool, newDeployment.liquidPool]));
    }

    if (memberToken.toLowerCase() !== ethers.constants.AddressZero) {
      const originalMemberTokenImpl = await getLatestImplementation(memberToken);
      if (originalMemberTokenImpl.toLowerCase() !== newDeployment.memberToken.toLowerCase()) {
        description.push(`MemberToken Contract: ${originalMemberTokenImpl} -> ${newDeployment.memberToken}`);
        calldatas.push(dao.interface.encodeFunctionData('upgradeContractTo', [memberToken, newDeployment.memberToken]));
      }
    }
    console.log(calldatas);

    if (!calldatas.length) {
      return Promise.resolve();
    }

    const descriptioJson = JSON.stringify({
      category: 'Version',
      subcategory: 'upgrade',
      title: 'Update to latest version',
      description: description.join('/n'),
    });
    console.log(descriptioJson);

    // return govern.propose(calldatas.map(() => daoAddress), calldatas.map(() => 0), calldatas, descriptioJson);
  }, Promise.resolve());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
