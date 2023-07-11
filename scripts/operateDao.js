const hre = require('hardhat');
const inquirer = require('inquirer');
const getDaoInfo = require('./utils/getDaoInfo');

async function main() {
    const daos = await getDaoInfo();

    const { daoAddress } = await inquirer.prompt([
        {
            type: 'input',
            name: 'daoAddress',
            message: 'Dao?',
            choices: daos.map(({ dao, name }) => ({
                name: `${dao} - ${name}`,
                value: dao,
            })),
        },
    ]);

    const dao = await hre.ethers.getContractAt('Dao', daoAddress);
    const fns = Object.entries(dao.interface.functions)
        .filter(([key, value]) => !value.constant)
        .map(([key, value]) => {
            return {
                name: key,
                value: {
                    key,
                    ...value,
                },
            };
        });
    const { contractFn, txValue } = await inquirer.prompt([
        { type: 'list', name: 'contractFn', message: 'Dao?', choices: fns },
        {
            type: 'input',
            name: 'txValue',
            message: 'How much ETH to pass?',
            default: '0',
        },
    ]);

    const params = await inquirer.prompt(
        contractFn.inputs.map((pType, i) => ({
            type: 'input',
            name: `${i}`,
            message: `${pType.name} - ${pType.type}`,
        })),
    );

    const finalParams = contractFn.inputs.map((pType, i) => {
        if (pType.type.includes('[]')) {
            return params[`${i}`].split(',');
        }
        if (pType.type === 'bool') {
            return params[`${i}`] === 'true';
        }
        return params[`${i}`];
    });

    console.log(
        'Going to run with',
        contractFn.key,
        'with params',
        finalParams,
        'with value',
        hre.ethers.utils.parseEther(txValue),
    );

    const { shouldExecute } = await inquirer.prompt([
        { type: 'confirm', name: 'shouldExecute', message: 'Should Execute?' },
    ]);
    if (shouldExecute) {
        const tx = await dao[contractFn.key](...finalParams, {
            value: hre.ethers.utils.parseEther(txValue),
        });
        console.log(tx);
    } else {
        console.log(
            dao.interface.encodeFunctionData(contractFn.key, finalParams),
        );
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
