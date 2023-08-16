const hre = require('hardhat');
const inquirer = require('inquirer');
const ethers = require('ethers');
const getDaoInfo = require('./utils/getDaoInfo');
async function main() {
    const daos = await getDaoInfo();
    inquirer
        .prompt([
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
            { type: 'input', name: 'target', message: 'Proposal call target' },
            {
                type: 'number',
                name: 'value',
                message: 'Proposal call value',
                default: 0,
            },
            {
                type: 'input',
                name: 'calldata',
                message: 'Proposal call data',
                default:
                    '0xdf79812e0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000003278224600bd939a5cbbe7d61d2f4ea6bc914d47000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000304cec90f2c00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000078ca39de54225cc449877a3d15df4c1dd631658d0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000002d61d2ea8c296305c4af461f12a172cf1d0af5990000000000000000000000002d61d2ea8c296305c4af461f12a172cf1d0af5990000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000064b79ac7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001653656c6620436c61696d20455243323020546f6b656e00000000000000000000000000000000000000000000000000000000000000000000000000000000000e73656c66436c61696d4552433230000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            },
        ])
        .then(
            async ({
                category,
                subcategory,
                title,
                description,
                daoAddress,
                target,
                value,
                calldata,
            }) => {
                const dao = await hre.ethers.getContractAt('Dao', daoAddress);
                const governAddress = await dao.govern('General');
                const govern = await hre.ethers.getContractAt(
                    'Govern',
                    governAddress,
                );
                const json = JSON.stringify({
                    category,
                    subcategory,
                    title,
                    description,
                });
                const tx = await govern.propose(
                    [target],
                    [value],
                    [calldata],
                    json,
                );
                const receipt1 = await tx.wait();
                const event = receipt1.events.find(
                    (e) => e.event === 'ProposalCreated',
                );

                console.log(receipt1);
                console.log(event.args);
            },
        );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
