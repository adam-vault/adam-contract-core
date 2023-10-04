const hre = require('hardhat');
const inquirer = require('inquirer');
const getDaoInfo = require('./utils/getDaoInfo');

async function main() {
    const daos = await getDaoInfo();

    const {
        category,
        subcategory,
        title,
        description,
        daoAddress,
        targetDaoAddress,
    } = await inquirer.prompt([
        {
            type: 'list',
            name: 'daoAddress',
            message: 'Dao?',
            choices: daos.map(({ dao, name }) => ({
                name: `${dao} - ${name}`,
                value: dao,
            })),
        },
        {
            type: 'list',
            name: 'category',
            message: 'Proposal Category?',
            choices: [
                'TreasuryBudget',
                'BudgetApproval',
                'MemberToken',
                'DaoSetting',
                'Team',
                'General',
            ],
        },
        {
            type: 'list',
            name: 'subcategory',
            message: 'Proposal Subcategory?',
            choices: [
                'budget_swap',
                'budget_outflow',
                'budget_outflow_liquid',
                'mix',
            ],
        },
        { type: 'input', name: 'title', message: 'Proposal title?' },
        {
            type: 'input',
            name: 'description',
            message: 'Proposal description?',
        },
        {
            type: 'list',
            name: 'targetDaoAddress',
            message: 'Target Dao?',
            choices: daos.map(({ dao, name }) => ({
                name: `${dao} - ${name}`,
                value: dao,
            })),
        },
    ]);

    const dao = await hre.ethers.getContractAt('Dao', daoAddress);
    const targetDao = await hre.ethers.getContractAt('Dao', targetDaoAddress);

    const govern = await hre.ethers.getContractAt(
        'Govern',
        await dao.govern('General'),
    );
    const targetGovern = await hre.ethers.getContractAt(
        'Govern',
        await targetDao.govern('General'),
    );

    const proposalEvents = await targetGovern.queryFilter(
        targetGovern.filters.ProposalCreated(),
    );
    const proposals = proposalEvents.map((e) => ({
        proposalId: e.args.proposalId,
        name: e.args.description,
    }));

    const { proposalId, support, reason } = await inquirer.prompt([
        {
            type: 'list',
            name: 'proposalId',
            message: 'Proposal?',
            choices: proposals.map(({ proposalId, name }) => ({
                name,
                value: proposalId,
            })),
        },
        {
            type: 'list',
            name: 'support',
            message: 'Support?',
            choices: [
                { name: 'Against', value: 0 },
                { name: 'For', value: 1 },
                { name: 'Abstain', value: 2 },
            ],
        },
        { type: 'input', name: 'reason', message: 'Reason?' },
    ]);

    const json = JSON.stringify({
        category,
        subcategory,
        title,
        description,
    });
    const calldata = targetGovern.interface.encodeFunctionData(
        'castVoteWithReason',
        [proposalId, support, reason],
    );
    const calldata2 = dao.interface.encodeFunctionData('multicall', [
        [targetGovern.address],
        [0],
        [calldata],
    ]);

    const tx = await govern.propose([dao.address], [0], [calldata2], json);
    console.log(tx);
    const receipt = await tx.wait();
    const event = receipt.events.find((e) => e.event === 'ProposalCreated');
    console.log(event.args);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
