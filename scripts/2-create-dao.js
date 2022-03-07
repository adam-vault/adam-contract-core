const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const adamAddress = '0x2669b524745B1D2dAF9235D890FCc3ca2c45C952';
const transferERC20BudgetApprovalAddress = '0x1278E8DB886efD798F6563239A2ca7518489B36c';

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);
  const tx = await adam.createDao('Dao', 'D');
  const receipt = await tx.wait();
  const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });

  console.log('dao created at:', creationEventLog.args.dao);

  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const data = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [
      // dao address
      creationEventLog.args.dao,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // text
      'Transfer ERC20',
      // transaction type
      'Outflow',
      // allow all address
      false,
      // allowed addresses (use when above = false)
      ['0xBfAA947b65A4350f14895980D0c8f420576fC163'],
      // allow all token
      false,
      // allowed token (use when above = false)
      ['0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '10',
    ]);

  const dao = await hre.ethers.getContractAt('Dao', creationEventLog.args.dao);
  const tx2 = await dao.createBudgetApprovals([transferERC20BudgetApprovalAddress], [data]);
  const receipt2 = await tx2.wait();
  const creationEventLog2 = _.find(receipt2.events, { event: 'CreateBudgetApproval' });
  console.log('budget approval created at:', creationEventLog2.args.budgetApproval);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
