const hre = require('hardhat');
const ethers = require('ethers');
const inquirer = require('inquirer');

async function main () {
  const { get } = hre.deployments;
  const adamDeployment = await get('Adam');
  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daos = events.map(e => ({ dao: e.args.dao, name: e.args.name }));

  const { daoAddress } = await inquirer
    .prompt([
      { type: 'list', name: 'daoAddress', message: 'Dao?', choices: daos.map(({ dao, name }) => ({ name: `${dao} - ${name}`, value: dao })) },
    ]);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const governAddress = await dao.govern('General');

  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const proposalCreatedEvents = await govern.queryFilter(govern.filters.ProposalCreated());
  const { proposal } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'proposal',
        message: 'Proposal?',
        choices: proposalCreatedEvents.map(event => ({
          name: `${event.args.proposalId}\n\t${event.args.description}`,
          value: event.args,
        })),
      },
    ]);

  await govern.execute(proposal.target, proposal.values, proposal.calldatas, ethers.utils.id(proposal.description));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
