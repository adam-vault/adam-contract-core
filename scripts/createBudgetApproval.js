const hre = require('hardhat');
const _ = require('lodash');
const ethers = require('ethers');
const inquirer = require('inquirer');
const getDaoInfo = require('./utils/getDaoInfo');
const {
    getCreateTransferERC20BAParams,
    getCreateTransferLiquidErc20TokenBAParams,
    getCreateTransferERC721BAParams,
    getCreateUniswapBAParams,
    getCreateVestingERC20BAParams,
    getCreateBasicBudgetApprovalParams,
    getCreateSelfClaimErc20TokenBAParams,
} = require('../utils/paramsStruct');

const commonTransferERC20Prompts = [
    {
        type: 'input',
        name: 'text',
        message: 'Text',
        default: 'Transfer Arb Token',
    },
    {
        type: 'input',
        name: 'transactionType',
        message: 'Transaction Type',
        default: 'outflow',
    },
    {
        type: 'confirm',
        name: 'allowAllAddress',
        message: 'Allow all toAddresses?',
    },
    {
        type: 'input',
        name: 'toAddresses',
        message: 'To addresses? (comma separated)',
        when: ({ allowAllAddress }) => !allowAllAddress,
    },
    { type: 'confirm', name: 'allowAllTokens', message: 'Allow all tokens?' },
    {
        type: 'input',
        name: 'token',
        message: 'Specific token?',
        when: ({ allowAllTokens }) => !allowAllTokens,
    },
    { type: 'confirm', name: 'allowAnyAmount', message: 'Allow all amount?' },
    {
        type: 'number',
        name: 'totalAmount',
        message: 'Total Amount limited?',
        when: ({ allowAnyAmount }) => !allowAnyAmount,
    },
    {
        type: 'input',
        name: 'team',
        message: 'Team address?',
        default: ethers.constants.AddressZero,
    },
    { type: 'input', name: 'toTeamIds', message: 'Team Ids? (Comma sep)' },
];

const questions = {
    TransferERC20BudgetApproval: commonTransferERC20Prompts,
    TransferLiquidERC20BudgetApproval: [
        {
            type: 'input',
            name: 'text',
            message: 'Text',
            default: 'Transfer Liquid ERC20 Token',
        },
        {
            type: 'input',
            name: 'transactionType',
            message: 'Transaction Type',
            default: 'outflow',
        },
        {
            type: 'confirm',
            name: 'allowAllAddress',
            message: 'Allow all toAddresses?',
        },
        {
            type: 'input',
            name: 'toAddresses',
            message: 'To addresses? (comma separated)',
            when: ({ allowAllAddress }) => !allowAllAddress,
        },
        { type: 'input', name: 'tokens', message: 'tokens? (comma separated)' },
        { type: 'input', name: 'baseCurrency', message: 'baseCurrency?' },
        {
            type: 'confirm',
            name: 'allowAnyAmount',
            message: 'Allow all amount?',
        },
        {
            type: 'number',
            name: 'totalAmount',
            message: 'Total Amount limited?',
            when: ({ allowAnyAmount }) => !allowAnyAmount,
        },
        {
            type: 'input',
            name: 'team',
            message: 'Team address?',
            default: ethers.constants.AddressZero,
        },
        { type: 'input', name: 'toTeamIds', message: 'Team Ids? (Comma sep)' },
    ],
    TransferERC721BudgetApproval: [
        {
            type: 'input',
            name: 'text',
            message: 'Text',
            default: 'Transfer ERC721 Token',
        },
        {
            type: 'input',
            name: 'transactionType',
            message: 'Transaction Type',
            default: 'outflow',
        },
        {
            type: 'confirm',
            name: 'allowAllAddress',
            message: 'Allow all toAddresses?',
        },
        {
            type: 'input',
            name: 'toAddresses',
            message: 'To addresses? (comma separated)',
            when: ({ allowAllAddress }) => !allowAllAddress,
        },
        {
            type: 'confirm',
            name: 'allowAllTokens',
            message: 'Allow all tokens?',
        },
        { type: 'input', name: 'tokens', message: 'tokens? (comma separated)' },
        {
            type: 'confirm',
            name: 'allowAnyAmount',
            message: 'Allow all amount?',
        },
        {
            type: 'number',
            name: 'totalAmount',
            message: 'Total Amount limited?',
            when: ({ allowAnyAmount }) => !allowAnyAmount,
        },
        {
            type: 'input',
            name: 'team',
            message: 'Team address?',
            default: ethers.constants.AddressZero,
        },
        { type: 'input', name: 'toTeamIds', message: 'Team Ids? (Comma sep)' },
    ],
    UniswapLiquidBudgetApproval: [
        {
            type: 'input',
            name: 'text',
            message: 'Text',
            default: 'Uniswap Liquid',
        },
        {
            type: 'input',
            name: 'transactionType',
            message: 'Transaction Type',
            default: 'swap',
        },
        {
            type: 'input',
            name: 'fromTokens',
            message: 'From Tokens? (comma separated)',
        },
        {
            type: 'confirm',
            name: 'allowAllToTokens',
            message: 'Allow all to tokens?',
        },
        {
            type: 'input',
            name: 'toTokens',
            message: 'To Tokens? (comma separated)',
            when: ({ allowAllToTokens }) => !allowAllToTokens,
        },
        {
            type: 'confirm',
            name: 'allowAnyAmount',
            message: 'Allow all amount?',
        },
        { type: 'input', name: 'baseCurrency', message: 'baseCurrency?' },
        {
            type: 'number',
            name: 'totalAmount',
            message: 'Total Amount limited?',
            when: ({ allowAnyAmount }) => !allowAnyAmount,
        },
        {
            type: 'number',
            name: 'amountPercentage',
            message: 'Amount Percentage?',
            default: 100,
        },
        {
            type: 'input',
            name: 'team',
            message: 'Team address?',
            default: ethers.constants.AddressZero,
        },
        { type: 'input', name: 'toTeamIds', message: 'Team Ids? (Comma sep)' },
    ],
    VestingERC20BudgetApproval: [
        // cliffPeriod: 0, cyclePeriod: 86400 * 30, cycleCount: 24, cycleTokenAmount: 20, initTokenAmount: 0
        {
            type: 'input',
            name: 'token',
            message: 'Token to be vested (should be ERC20)',
            default: '0xc944b73fba33a773a4a07340333a3184a70af1ae',
        },
        { type: 'input', name: 'toAddress', message: 'The beneficial address' },
        {
            type: 'input',
            name: 'cliffPeriod',
            message: 'Period of Cliff',
            default: 60,
        },
        {
            type: 'input',
            name: 'cyclePeriod',
            message: 'Period per cycle',
            default: 300,
        },
        {
            type: 'input',
            name: 'cycleCount',
            message: 'Number of periods',
            default: 12,
        },
        {
            type: 'input',
            name: 'cycleTokenAmount',
            message: 'Vesting Amount in each cycle',
            default: 10000,
        },
        {
            type: 'input',
            name: 'initTokenAmount',
            message: 'Init Token Amount before Vesting ',
            default: 5000,
        },
    ],
    SelfClaimERC20BudgetApproval: [
        {
            type: 'input',
            name: 'text',
            message: 'Text',
            default: 'Self Claim ERC20 Token',
        },
        {
            type: 'input',
            name: 'transactionType',
            message: 'Transaction Type',
            default: 'selfClaimERC20',
        },
        {
            type: 'confirm',
            name: 'allowAllAddress',
            message: 'Allow all toAddresses?',
        },
        {
            type: 'input',
            name: 'toAddresses',
            message: 'To addresses? (comma separated)',
            when: ({ allowAllAddress }) => !allowAllAddress,
        },
        {
            type: 'confirm',
            name: 'allowAllTokens',
            message: 'Allow all tokens?',
        },
        {
            type: 'input',
            name: 'token',
            message: 'Specific token?',
            when: ({ allowAllTokens }) => !allowAllTokens,
        },
        { type: 'input', name: 'fixAmount', message: 'Fix Amount limited?' },
        {
            type: 'input',
            name: 'validator',
            message: 'Validator address?',
            default: ethers.constants.AddressZero,
        },
    ],
    GMXAnyTokenBudgetApproval: [
        {
            type: 'input',
            name: 'text',
            message: 'Text',
            default: 'GMX Any token',
        },
        {
            type: 'input',
            name: 'transactionType',
            message: 'Transaction Type',
            default: 'others',
        },
    ],
};

const encodeFn = {
    TransferERC20BudgetApproval: getCreateTransferERC20BAParams,
    TransferLiquidERC20BudgetApproval:
        getCreateTransferLiquidErc20TokenBAParams,
    TransferERC721BudgetApproval: getCreateTransferERC721BAParams,
    UniswapLiquidBudgetApproval: getCreateUniswapBAParams,
    VestingERC20BudgetApproval: getCreateVestingERC20BAParams,
    SelfClaimERC20BudgetApproval: getCreateSelfClaimErc20TokenBAParams,
    GMXAnyTokenBudgetApproval: getCreateBasicBudgetApprovalParams,
};

const BA_TYPES = [
    'TransferERC20BudgetApproval',
    'TransferERC721BudgetApproval',
    'TransferLiquidERC20BudgetApproval',
    'UniswapAnyTokenBudgetApproval',
    'UniswapLiquidBudgetApproval',
    'VestingERC20BudgetApproval',
    'SelfClaimERC20BudgetApproval',
    'GMXAnyTokenBudgetApproval',
];

function toArray(str) {
    return (str || '').split(',').filter((str) => !!str);
}

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const { getOrNull } = hre.deployments;
    const daos = await getDaoInfo();

    const baTypeAddresses = (
        await Promise.all(
            BA_TYPES.map(async (key) => {
                const d = await getOrNull(key);
                if (!d) return null;
                return [key, d.address];
            }),
        )
    ).filter((deployment) => !!deployment);

    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'exportEncodeData',
            message: 'Only export encode data?',
        },
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
            name: 'dest',
            message: 'To where?',
            default: 0,
            choices: ['Treasury', 'LiquidPool'],
        },
        {
            type: 'input',
            name: 'executor',
            message: 'Executor?',
            default: signer.address,
        },
        {
            type: 'number',
            name: 'executorTeamId',
            message: 'Executor Team ID?',
            default: 0,
        },
        {
            type: 'input',
            name: 'minApproval',
            message: 'Min Approval needed?',
            default: 0,
        },
        {
            type: 'input',
            name: 'approvers',
            message: 'Approvers? (comma separated)',
            when: ({ minApproval }) => minApproval,
        },
        {
            type: 'number',
            name: 'approverTeamId',
            message: 'Approver Team ID?',
            default: 0,
            when: ({ minApproval }) => minApproval,
        },
        {
            type: 'number',
            name: 'startTime',
            message: 'Start time?',
            default: Math.round(new Date().getTime() / 1000),
        },
        {
            type: 'number',
            name: 'endTime',
            message: 'End time?',
            default: ethers.constants.MaxUint256,
        },
        {
            type: 'confirm',
            name: 'allowUnlimitedUsageCount',
            message: 'Allow Unlimited Usage Count?',
        },
        {
            type: 'number',
            name: 'usageCount',
            message: 'Usage Count?',
            default: 3,
            when: ({ allowUnlimitedUsageCount }) => !allowUnlimitedUsageCount,
        },
        {
            type: 'list',
            name: 'budgetApprovalOptions',
            message: 'Budget Approval Type?',
            choices: baTypeAddresses.map(([key, address]) => ({
                name: key,
                value: { key, address },
            })),
        },
    ]);
    const answers2 = await inquirer.prompt(
        questions[answers.budgetApprovalOptions.key],
    );
    const transferERC20BudgetApproval = await hre.ethers.getContractAt(
        answers.budgetApprovalOptions.key,
        answers.budgetApprovalOptions.address,
    );
    const dataErc20 = transferERC20BudgetApproval.interface.encodeFunctionData(
        'initialize',
        encodeFn[answers.budgetApprovalOptions.key]({
            ...answers,
            ...answers2,
            approvers: toArray(answers.approvers),
            toAddresses: toArray(answers2.toAddresses),
            toTeamIds: toArray(answers2.toTeamIds),
            tokens: toArray(answers2.tokens),
            fromTokens: toArray(answers2.fromTokens),
            toTokens: toArray(answers2.toTokens),
        }),
    );

    const dao = await hre.ethers.getContractAt('Dao', answers.daoAddress);

    if (answers.exportEncodeData) {
        console.log('address', dao.address);
        console.log(
            'encodeFunctionData',
            dao.interface.encodeFunctionData('createBudgetApprovals', [
                [answers.budgetApprovalOptions.address],
                [dataErc20],
            ]),
        );
        return;
    }

    let tx;

    if (answers.dest === 'LiquidPool') {
        tx = await dao.executePlugin(
            ethers.utils.id('adam.dao.liquid_pool'),
            dao.interface.encodeFunctionData('createBudgetApprovals', [
                [answers.budgetApprovalOptions.address],
                [dataErc20],
            ]),
            0,
        );
    } else {
        tx = await dao.createBudgetApprovals(
            [answers.budgetApprovalOptions.address],
            [dataErc20],
        );
    }
    console.log(tx);

    const receipt1 = await tx.wait();
    console.log(receipt1);
    const creationEventLogs1 = _.filter(receipt1.events, {
        event: 'CreateBudgetApproval',
    });
    console.log(creationEventLogs1);

    creationEventLogs1.forEach(({ args }) => {
        console.log('budget approval created at:', args.budgetApproval);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
