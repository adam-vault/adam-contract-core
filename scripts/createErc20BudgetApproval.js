const hre = require('hardhat');
const _ = require('lodash');
const ethers = require('ethers');
const inquirer = require('inquirer');
const {
  getCreateTransferERC20BAParams,
} = require('../utils/paramsStruct');

const commonTransferERC20Prompts = [
  { type: 'input', name: 'text', message: 'Text', default: 'Transfer Arb Token' },
  { type: 'input', name: 'transactionType', message: 'Transaction Type', default: 'outflow' },
  { type: 'confirm', name: 'allowAllAddress', message: 'Allow all toAddresses?' },
  { type: 'input', name: 'toAddresses', message: 'To addresses? (comma separated)', when: ({ allowAllAddress }) => !allowAllAddress },
  { type: 'confirm', name: 'allowAllTokens', message: 'Allow all tokens?' },
  { type: 'input', name: 'token', message: 'Specific token?', when: ({ allowAllTokens }) => !allowAllTokens },
  { type: 'confirm', name: 'allowAnyAmount', message: 'Allow all amount?' },
  { type: 'number', name: 'totalAmount', message: 'Total Amount limited?', when: ({ allowAnyAmount }) => !allowAnyAmount },
  { type: 'input', name: 'team', message: 'Team address?', default: ethers.constants.AddressZero },
  { type: 'input', name: 'toTeamIds', message: 'Team Ids? (Comma sep)' },
];

const questions = {
  TransferERC20BudgetApproval: commonTransferERC20Prompts,
  TransferToArbitrumERC20BudgetApproval: commonTransferERC20Prompts,
  TransferFromArbitrumERC20BudgetApproval: commonTransferERC20Prompts,
};

const BA_TYPES = [
  'TransferERC20BudgetApproval',
  'TransferERC721BudgetApproval',
  'TransferFromArbitrumERC20BudgetApproval',
  'TransferLiquidERC20BudgetApproval',
  'TransferToArbitrumERC20BudgetApproval',
  'UniswapAnyTokenBudgetApproval',
  'UniswapLiquidBudgetApproval',
  'GMXAnyTokenBudgetApproval',
];

async function main () {
  const [signer] = await hre.ethers.getSigners();
  const { get, getOrNull } = hre.deployments;
  const adamDeployment = await get('Adam');
  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daos = events.map(e => ({ dao: e.args.dao, name: e.args.name }));

  const baTypeAddresses = (await Promise.all(BA_TYPES.map(async (key) => {
    const d = await getOrNull(key);
    if (!d) return null;
    return [key, d.address];
  }))).filter(deployment => !!deployment);

  const answers = await inquirer
    .prompt([
      { type: 'confirm', name: 'exportEncodeData', message: 'Only export encode data?' },
      {
        type: 'list',
        name: 'daoAddress',
        message: 'Dao?',
        choices: daos.map(({ dao, name }) => ({
          name: `${dao} - ${name}`,
          value: dao,
        })),
      },
      { type: 'list', name: 'dest', message: 'To where?', default: 0, choices: ['Treasury', 'LiquidPool'] },

      { type: 'input', name: 'executor', message: 'Executor?', default: signer.address },
      { type: 'number', name: 'executorTeamId', message: 'Executor Team ID?', default: 0 },

      { type: 'input', name: 'minApproval', message: 'Min Approval needed?', default: 0 },
      { type: 'input', name: 'approvers', message: 'Approvers? (comma separated)', when: ({ minApproval }) => minApproval },
      { type: 'number', name: 'approverTeamId', message: 'Approver Team ID?', default: 0, when: ({ minApproval }) => minApproval },

      { type: 'number', name: 'startTime', message: 'Start time?', default: 0 },
      { type: 'number', name: 'endTime', message: 'End time?', default: ethers.constants.MaxUint256 },

      { type: 'confirm', name: 'allowUnlimitedUsageCount', message: 'Allow Unlimited Usage Count?' },
      { type: 'number', name: 'usageCount', message: 'Usage Count?', default: 3, when: ({ allowUnlimitedUsageCount }) => !allowUnlimitedUsageCount },

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
  const answers2 = await inquirer.prompt(questions[answers.budgetApprovalOptions.key]);

  const transferERC20BudgetApproval = await hre.ethers.getContractAt(answers.budgetApprovalOptions.key, answers.budgetApprovalOptions.address);
  const dataErc20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    getCreateTransferERC20BAParams({
      ...answers,
      ...answers2,
      approvers: (answers.approvers || '').split(',').filter(str => !!str),
      toAddresses: (answers2.toAddresses || '').split(',').filter(str => !!str),
      toTeamIds: (answers2.toTeamIds || '').split(',').filter(str => !!str),
    }),
  );

  let target = await hre.ethers.getContractAt('Dao', answers.daoAddress);
  if (answers.dest === 'LiquidPool') {
    const lpAddress = await target.liquidPool();
    target = await hre.ethers.getContractAt('LiquidPool', lpAddress);
  }

  if (answers.exportEncodeData) {
    console.log('address', target.address);
    console.log('encodeFunctionData', target.interface.encodeFunctionData('createBudgetApprovals', [[answers.budgetApprovalOptions.address], [dataErc20]]));
    return;
  }

  const tx1 = await target.createBudgetApprovals(
    [answers.budgetApprovalOptions.address],
    [dataErc20]);
  const receipt1 = await tx1.wait();
  const creationEventLogs1 = _.filter(receipt1.events, { event: 'CreateBudgetApproval' });
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
