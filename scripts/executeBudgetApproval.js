const hre = require('hardhat');
const inquirer = require('inquirer');
const abiCoder = hre.ethers.utils.defaultAbiCoder;
const _ = require('lodash');
const getDaoInfo = require('./utils/getDaoInfo');

const BA_TYPES_MAPPING = {
    'Transfer ERC20 Budget Approval': 'TransferERC20BudgetApproval',
    'Transfer ERC721 Budget Approval': 'TransferERC721BudgetApproval',
    'Transfer Liquid ERC20 Budget Approval':
        'TransferLiquidERC20BudgetApproval',
    'Uniswap Any Token Budget Approval': 'UniswapAnyTokenBudgetApproval',
    'Uniswap Liquid Budget Approval': 'UniswapLiquidBudgetApproval',
    'Vesting ERC20 Budget Approval': 'VestingERC20BudgetApproval',
};

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

    const lp = await hre.ethers.getContractAt(
        'LiquidPool',
        await dao.liquidPool(),
    );

    const createEvents = await dao.queryFilter(
        dao.filters.CreateBudgetApproval(),
    );
    const revokeEvents = await dao.queryFilter(
        dao.filters.RevokeBudgetApproval(),
    );

    const lpCreateEvents = await lp.queryFilter(
        lp.filters.CreateBudgetApproval(),
    );
    const lpRevokeEvents = await lp.queryFilter(
        lp.filters.RevokeBudgetApproval(),
    );

    const revokedBA = revokeEvents
        .concat(lpRevokeEvents)
        .map((e) => e.args.budgetApproval)
        .concat();
    const createdBA = createEvents
        .concat(lpCreateEvents)
        .map((e) => e.args.budgetApproval)
        .filter((ba) => !revokedBA.includes(ba));

    const baTypeAddresses = (
        await Promise.all(
            createdBA.map(async (ba) => {
                const baContract = await hre.ethers.getContractAt(
                    'TransferERC20BudgetApproval',
                    ba,
                );
                const name = await baContract.name();
                return [BA_TYPES_MAPPING[name], ba];
            }),
        )
    ).filter((deployment) => !!deployment);

    const { budgetApprovalOptions } = await inquirer.prompt([
        {
            type: 'list',
            name: 'budgetApprovalOptions',
            message: 'Budget Approval?',
            choices: baTypeAddresses.map(([key, address]) => ({
                name: `${key} : ${address}`,
                value: { key, address },
            })),
        },
    ]);

    const budgetApproval = await hre.ethers.getContractAt(
        budgetApprovalOptions.key,
        budgetApprovalOptions.address,
    );
    const params = await budgetApproval.executeParams();
    const answers = await inquirer.prompt(
        params
            .map((param) => param.split(' '))
            .map(([pType, pKey]) => ({
                type: pType === 'bool' ? 'confirm' : 'input',
                name: pKey,
                message: pKey,
            })),
    );

    const transactionData = abiCoder.encode(params, Object.values(answers));

    console.log(answers);

    const { shouldExecute } = await inquirer.prompt([
        { type: 'confirm', name: 'shouldExecute', message: 'Execute now?' },
    ]);

    const tx = await budgetApproval.createTransaction(
        [transactionData],
        Math.round(Date.now() / 1000) + 86400,
        shouldExecute,
        '',
    );
    const receipt = await tx.wait();
    const creationEventLogs = _.filter(receipt.events, {
        event: 'CreateTransaction',
    });
    creationEventLogs.forEach(({ args }) => {
        console.log(
            `Transaction created id = ${args.id.toString()}, BA = ${
                budgetApprovalOptions.type
            } ${budgetApprovalOptions.address}`,
        );
    });
    console.log(tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
