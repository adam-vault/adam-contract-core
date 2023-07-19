const hre = require('hardhat');
const inquirer = require('inquirer');
const getDaoInfo = require('./utils/getDaoInfo');

async function main() {
    const daos = await getDaoInfo();

    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'mintToDao',
            message: 'Mint To Dao?',
        },
        {
            type: 'list',
            name: 'daoAddress',
            message: 'Dao?',
            choices: daos.map(({ dao, name }) => ({
                name: `${dao} - ${name}`,
                value: dao,
            })),
            when: ({ mintToDao }) => mintToDao,
        },
        {
            type: 'input',
            name: 'address',
            message: 'To Address?',
            when: ({ mintToDao }) => !mintToDao,
        },
        {
            type: 'input',
            name: 'contractName',
            message: 'Contract name?',
        },
        {
            type: 'input',
            name: 'token',
            message: 'Token Address?',
        },
        { type: 'input', name: 'amount', message: 'mint Amount' },
    ]);

    const token = await hre.ethers.getContractAt(
        answers.contractName,
        answers.token,
    );
    const tx = await token.mint(
        answers.mintToDao ? answers.daoAddress : answers.address,
        answers.amount,
    );

    const receipt1 = await tx.wait();
    console.log(receipt1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
