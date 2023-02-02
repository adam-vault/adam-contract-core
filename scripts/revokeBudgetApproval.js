const hre = require('hardhat');
const _ = require('lodash');
const inquirer = require('inquirer');

const BA_TYPES_MAPPING = {
  'Transfer ERC20 Budget Approval': 'TransferERC20BudgetApproval',
  'Transfer ERC721 Budget Approval': 'TransferERC721BudgetApproval',
  'Transfer Liquid ERC20 Budget Approval': 'TransferLiquidERC20BudgetApproval',
  'Uniswap Any Token Budget Approval': 'UniswapAnyTokenBudgetApproval',
  'Uniswap Liquid Budget Approval': 'UniswapLiquidBudgetApproval',
  'Vesting ERC20 Budget Approval': 'VestingERC20BudgetApproval',
};

async function main () {
  const { get } = hre.deployments;
  const adamDeployment = await get('Adam');
  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daos = events.map(e => ({ dao: e.args.dao, name: e.args.name }));

  const { daoAddress, dest } = await inquirer
    .prompt([
      { type: 'list', name: 'daoAddress', message: 'Dao?', choices: daos.map(({ dao, name }) => ({ name: `${dao} - ${name}`, value: dao })) },
      { type: 'list', name: 'dest', message: 'To where?', default: 0, choices: ['Treasury', 'LiquidPool'] },
    ]);

  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const createEvents = await dao.queryFilter(dao.filters.CreateBudgetApproval());
  const revokeEvents = await dao.queryFilter(dao.filters.RevokeBudgetApproval());

  const revokedBA = revokeEvents.map(e => e.args.budgetApproval);
  const createdBA = createEvents
    .map(e => e.args.budgetApproval)
    .filter(ba => !revokedBA.includes(ba));

  const baTypeAddresses = (await Promise.all(createdBA.map(async (ba) => {
    const baContract = await hre.ethers.getContractAt('TransferERC20BudgetApproval', ba);
    const name = await baContract.name();
    return [BA_TYPES_MAPPING[name], ba];
  }))).filter(deployment => !!deployment);

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
  const budgetApproval = await hre.ethers.getContractAt(budgetApprovalOptions.key, budgetApprovalOptions.address);

  let tx;
  if (dest === 'LiquidPool') {
    tx = await dao.executePlugin(
      hre.ethers.utils.id('adam.dao.liquid_pool'),
      dao.interface.encodeFunctionData('revokeBudgetApprovals', [
        [budgetApproval.address],
      ]),
      0,
    );
  } else {
    tx = await dao.revokeBudgetApprovals(
      [budgetApproval.address],
    );
  }

  console.log(tx);

  const receipt1 = await tx.wait();
  console.log(receipt1);
  const RevokeEventLogs1 = _.filter(receipt1.events, { event: 'RevokeBudgetApproval' });
  console.log(RevokeEventLogs1);

  RevokeEventLogs1.forEach(({ args }) => {
    console.log('budget approval revoked:', args.budgetApproval);
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
