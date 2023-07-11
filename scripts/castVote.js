const hre = require('hardhat');
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
    const { proposalId, support, reason } = await inquirer.prompt([
        {
            type: 'list',
            name: 'proposalId',
            message: 'Proposal?',
            choices: proposalCreatedEvents.map((event) => ({
                name: `${event.args.proposalId}\n\t${event.args.description}`,
                value: event.args.proposalId,
            })),
        },
        {
            type: 'list',
            name: 'support',
            message: 'Support?',
            choices: [
                { value: 1, name: 'For' },
                { value: 0, name: 'Against' },
                { value: 2, name: 'Abstain' },
            ],
        },
        {
            type: 'input',
            name: 'reason',
        },
    ]);

    if (reason) {
        await govern.castVoteWithReason(proposalId, support, reason);
    } else {
        await govern.castVote(proposalId, support);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
