const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const daoAddress = '0x2e9827Bda7B848BCC469D2a983dC5450E9b63a99';
const transferERC20BudgetApprovalAddress = '0x641332023FC6e5377A7F09106Ce11BCb11aCE660';
const uniswapBudetApprovalAddress = '0xFdbd390cA0Be03C28E55964fDb94B106D95Bf5e0';
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

async function main () {
  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataERC20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [
      // dao address
      daoAddress,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // text
      'Transfer ERC20',
      // transaction type
      'Outflow',
      // allowed addresses (empty = allow all address)
      ['0xBfAA947b65A4350f14895980D0c8f420576fC163'],
      // allowed token (empty = allow all address)
      [DAIAddress],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '10',
    ]);

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize(address,address,string,string,address[],address[],bool,uint256,uint8,address[])',
    [
      // dao address
      daoAddress,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // text
      'Uniswap',
      // transaction type
      'Swap',
      // allowed addresses (empty = allow all address)
      ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
      // allowed token (empty = allow all address)
      [],
      // allow any amount
      true,
      // allowed total amount
      hre.ethers.utils.parseEther('0'),
      // allowed amount percentage
      '100',
      // allowed to token (empty = allow all address)
      [],
    ]);

  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const tx = await dao.createBudgetApprovals(
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap]);
  const receipt = await tx.wait();
  const creationEventLogs = _.filter(receipt.events, { event: 'CreateBudgetApproval' });
  creationEventLogs.forEach(({ args }) => console.log('budget approval created at:', args.budgetApproval));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
