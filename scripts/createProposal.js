const hre = require('hardhat');
const inquirer = require('inquirer');
const ethers = require('ethers');

async function main () {
  inquirer
    .prompt([
      { type: 'input', name: 'daoAddress', message: 'Dao contract address?', default: '0xC6e1Ca4b8e9ceAa7A0cC82Cc13A6F991bcB48453' },
      { type: 'list', name: 'category', message: 'Proposal Category?', choices: ['TreasuryBudget', 'BudgetApproval', 'MemberToken', 'DaoSetting', 'Team', 'General']},
      { type: 'list', name: 'subcategory', message: 'Proposal Subcategory?', choices: ['budget_swap', 'budget_outflow', 'budget_outflow_liquid', 'mix']},
      { type: 'input', name: 'title', message: 'Proposal title?' },
      { type: 'input', name: 'description', message: 'Proposal description?' },
      { type: 'input', name: 'target', message: 'Proposal call target' },
      { type: 'number', name: 'value', message: 'Proposal call value', default: 0 },
      { type: 'input', name: 'calldata', message: 'Proposal call data', default: '0x' },
    ])
    .then(async ({ category, subcategory, title, description, daoAddress, target, value, calldata }) => {
      const dao = await hre.ethers.getContractAt('Dao', daoAddress);
      const govern = await dao.govern('General');
      const json = JSON.stringify({
        category,
        subcategory,
        title,
        description,
      });
      const tx = await govern.propose([target], [value], [calldata], json);

      console.log(tx);
      console.log('Description Hash', ethers.utils.id(json));
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
