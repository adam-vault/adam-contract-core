const hre = require('hardhat');
const ethers = require('ethers');
const inquirer = require('inquirer');
const getDaoInfo = require('./utils/getDaoInfo');

async function main() {
    const daos = await getDaoInfo();

    const { daoAddress } = await inquirer.prompt([
        {
            type: 'list',
            name: 'daoAddress',
            message: 'Dao?',
            choices: daos.map(({ dao, name }) => ({
                name: `${dao} - ${name}`,
                value: dao,
            })),
        },
    ]);
    const dao = await hre.ethers.getContractAt('Dao', daoAddress);
    const governAddress = await dao.govern('General');

    const govern = await hre.ethers.getContractAt('Govern', governAddress);
    const proposalCreatedEvents = await govern.queryFilter(
        govern.filters.ProposalCreated(),
    );
    const { proposal } = await inquirer.prompt([
        {
            type: 'list',
            name: 'proposal',
            message: 'Proposal?',
            choices: proposalCreatedEvents.map((event) => ({
                name: `${event.args.proposalId}\n\t${event.args.description}`,
                value: event.args,
            })),
        },
    ]);

    const tx = await govern.execute(
        proposal.targets,
        proposal[3],
        proposal.calldatas,
        ethers.utils.id(proposal.description),
    );
    console.log(tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
