const hre = require('hardhat');
const ethers = require('ethers');
const inquirer = require('inquirer');
const paramsStruct = require('../utils/paramsStruct');
const ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
async function main () {
  inquirer
    .prompt([
      { type: 'input', name: 'adamAddress', message: 'Adam contract address?', default: '0x987747FC7D299500EeaC00B59554515a6E3bBA3f' },
      { type: 'input', name: 'name', message: 'Dao name?', default: 'New Dao' },
      { type: 'input', name: 'description', message: 'Dao description?', default: 'New description' },
      { type: 'input', name: 'logoCID', message: 'Dao logo CID?', default: '' },
      { type: 'number', name: 'lockTime', message: 'Dao locktime? (in seconds)', default: 0 },
      { type: 'confirm', name: 'needMemberToken', message: 'Create Member token?' },

      { type: 'input', name: 'tokenName', message: 'Member token name?', default: 'Dao Member Token', when: (answers) => answers.needMemberToken },
      { type: 'input', name: 'tokenSymbol', message: 'Member token symbol?', default: 'DMT', when: (answers) => answers.needMemberToken },
      { type: 'number', name: 'tokenAmount', message: 'Member token mint to dao amount?', default: 1000, when: (answers) => answers.needMemberToken },

      { type: 'input', name: 'maxMemberLimit', message: 'Max member allowed?', default: ethers.constants.MaxUint256.toString() },

      { type: 'checkbox', name: 'depositTokens', message: 'Deposit Tokens?', default: [ETH], choices: [ETH] },
      { type: 'list', name: 'baseCurrency', message: 'BaseCurrency?', default: ETH, choices: [ETH] },
      { type: 'number', name: 'minDepositAmount', message: 'Min Deposit Amount?', default: 0 },

      { type: 'number', name: 'generalGovernSetting.0', message: 'Govern proposal duration? (in second)', default: 0 },
      { type: 'number', name: 'generalGovernSetting.1', message: 'Govern proposal quorum (input 3000 as 30.00%)?', default: 3000 },
      { type: 'number', name: 'generalGovernSetting.2', message: 'Govern proposal pass threshold (input 3000 as 30.00%)?', default: 5000 },
      {
        type: 'list',
        name: 'generalGovernSetting.3',
        message: 'Govern proposal vote type?',
        default: 0,
        choices: [
          { value: 0, name: 'Membership' },
          { value: 1, name: 'MemberToken' },
          { value: 2, name: 'ExistingToken' },
        ],
      },
      {
        type: 'input',
        name: 'generalGovernSetting.4',
        message: 'Govern proposal external vote token?',
        default: ethers.constants.AddressZero,
      },
      { type: 'number', name: 'generalGovernSetting.5', message: 'Govern proposal duration? (in block)', default: 600 },
    ])
    .then(async (answers) => {
      const adam = await hre.ethers.getContractAt('Adam', answers.adamAddress);
      const tx = await adam.createDao(...paramsStruct.getCreateDaoParams(answers));
      console.log(tx);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
