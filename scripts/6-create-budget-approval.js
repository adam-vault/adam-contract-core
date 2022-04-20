const hre = require('hardhat');
const _ = require('lodash');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const overwriteAddressEnv = require('./utils/overwriteAddressEnv');

// rinkeby
const daoAddress = process.env.DAO_LOCK_TIME_0;
const transferERC20BudgetApprovalAddress = process.env.TRANSFER_ERC20_APPROVAL_IMPLEMENTATION;
const uniswapBudetApprovalAddress = process.env.UNISWAP_APPROVAL_IMPLEMENTATION;
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

const budgetApprovalAddresses = [];

async function main () {
  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataERC20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [[
      // dao address
      daoAddress,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // approvers
      ['0x525BaB223a5F7D3E81699995DaA92fAe7329C5D9'],
      // text
      'Transfer ERC20',
      // transaction type
      'Outflow',
      // allow all addresses,
      false,
      // allowed addresses (use when above = false)
      ['0xBfAA947b65A4350f14895980D0c8f420576fC163'],
      // alow all tokens,
      false,
      // allowed token (use when above = false)
      [DAIAddress],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '10',
      Math.round(Date.now() / 1000) - 86400, // startTime
      Math.round(Date.now() / 1000) + 86400, // endTime
    ]]);

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8,uint256,uint256),bool,address[])',
    [
      // common params
      [
      // dao address
        daoAddress,
        // executor
        '0xBfAA947b65A4350f14895980D0c8f420576fC163',
        // approvers
        [],
        // text
        'Uniswap',
        // transaction type
        'Swap',
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
        // alow all tokens,
        true,
        // allowed token (use when above = false)
        [],
        // allow any amount
        true,
        // allowed total amount
        hre.ethers.utils.parseEther('0'),
        // allowed amount percentage
        '100',
        Math.round(Date.now() / 1000) - 86400, // startTime
        Math.round(Date.now() / 1000) + 86400, // endTime
      ],
      // extra params
      // allow all to tokens,
      true,
      // allowed to token (use when above = false)
      [],
    ]);

  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const tx = await dao.createBudgetApprovals(
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap]);
  const receipt = await tx.wait();
  const creationEventLogs = _.filter(receipt.events, { event: 'CreateBudgetApproval' });
  creationEventLogs.forEach(({ args }) => {
    console.log('budget approval created at:', args.budgetApproval);
    budgetApprovalAddresses.push(args.budgetApproval);
  });

  overwriteAddressEnv({
    TRANSFER_ERC20_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[0],
    UNISWAP_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[1],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
