const { gasFeeConfig } = require('../utils/getGasInfo');

const toBeAddBudgetApprovals = [
    {
        name: 'TransferERC721BudgetApproval',
        contract: 'TransferERC721BudgetApproval',
    },
    {
        name: 'TransferERC20BudgetApproval',
        contract: 'TransferERC20BudgetApproval',
    },
    {
        name: 'DepositRewardBudgetApproval',
        contract: 'DepositRewardBudgetApproval',
    },
    {
        name: 'VestingERC20BudgetApproval',
        contract: 'VestingERC20BudgetApproval',
    },
    {
        name: 'UniswapAnyTokenBudgetApproval',
        contract: 'UniswapAnyTokenBudgetApproval',
    },
    {
        name: 'SelfClaimERC20BudgetApproval',
        contract: 'SelfClaimERC20BudgetApproval',
    },
];

const toBeRemoveBudgetApprovals = [];

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, getOrNull, execute, read } = deployments;
    const { deployer } = await getNamedAccounts();

    const toBeRemove = [];
    const toBeAdd = [];

    await toBeAddBudgetApprovals.reduce(async (pm, { name, contract }) => {
        await pm;
        const existing = await getOrNull(name);
        const result = await deploy(name, {
            contract,
            from: deployer,
            log: true,
            gasLimit: 6000000,
            ...(await gasFeeConfig()),
        });
        if (!existing || existing.address !== result.address) {
            if (
                existing &&
                (await read('Adam', 'budgetApprovals', existing.address))
            ) {
                toBeRemove.push(existing.address);
            }
            if (!(await read('Adam', 'budgetApprovals', result.address))) {
                toBeAdd.push(result.address);
            }
        }
    }, Promise.resolve());

    await toBeRemoveBudgetApprovals.reduce(async (pm, contractName) => {
        await pm;
        const existing = await getOrNull(contractName);
        console.log(
            `${contractName} is ${existing ? 'existing.' : 'not existing.'}${
                existing ? existing.address : ''
            }`,
        );
        if (existing) {
            const isWhitelisted = await read(
                'Adam',
                'budgetApprovals',
                existing.address,
            );
            console.log(
                `${contractName} is ${
                    isWhitelisted ? 'whitelisted.' : 'not whitelisted.'
                }`,
            );
            if (isWhitelisted) {
                toBeRemove.push(existing.address);
            }
        }
    }, Promise.resolve());

    if (toBeRemove.length) {
        console.log(`${toBeRemove} to be abandoned.`);
        await execute(
            'Adam',
            { from: deployer, log: true, ...(await gasFeeConfig()) },
            'abandonBudgetApprovals',
            toBeRemove,
        );
    }

    if (toBeAdd.length) {
        console.log(`${toBeAdd} to be whitelisted.`);
        await execute(
            'Adam',
            { from: deployer, log: true, ...(await gasFeeConfig()) },
            'whitelistBudgetApprovals',
            toBeAdd,
        );
    }
};

module.exports.tags = ['budgetApproval'];
