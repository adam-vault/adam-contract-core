const hre = require('hardhat');
const _ = require('lodash');

// rinkeby
const daoAddress = '0xA3183A78A3E5bEe6Bb44022B6CB806Ee4ECAa688';
const transferERC20BudgetApprovalAddress = '0x60EA35bB45019d1fa3cAE7FEFd6445aC9Fa3B608';
const uniswapBudetApprovalAddress = '0x16a08c8fD57C90A55713b26ccc49A10ba14856c6';
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

async function main () {
  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataERC20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [[
      // dao address
      daoAddress,
      // executor
      '0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A',
      // approvers
      [],
      // text
      'Transfer ERC20',
      // transaction type
      'outflow',
      // allow all addresses,
      false,
      // allowed addresses (use when above = false)
      ['0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A'],
      // allowed token (use when above = false)
      [hre.ethers.constants.AddressZero, DAIAddress],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '10',
      Math.round(Date.now() / 1000) - 86400, // startTime
      Math.round(Date.now() / 1000) + 86400, // endTime
      true, // allow unlimited usage count
      0, // usage count
    ]]);

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize((address,address,address[],string,string,bool,address[],address[],bool,uint256,uint8,uint256,uint256,bool,uint256),bool,address[])',
    [
      // common params
      [
      // dao address
        daoAddress,
        // executor
        '0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A',
        // approvers
        [],
        // text
        'Uniswap',
        // transaction type
        'swap',
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
        // allowed token (use when above = false)
        [hre.ethers.constants.AddressZero],
        // allow any amount
        true,
        // allowed total amount
        hre.ethers.utils.parseEther('0'),
        // allowed amount percentage
        '100',
        Math.round(Date.now() / 1000) - 86400, // startTime
        Math.round(Date.now() / 1000) + 86400, // endTime
        true, // allow unlimited usage count
        0, // usage count
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
  creationEventLogs.forEach(({ args }) => console.log('budget approval created at:', args.budgetApproval));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
