const hre = require('hardhat');
const _ = require('lodash');
const deployResultStore = require('./utils/deploy-result-store');
const deploymentResult = deployResultStore.load();

// rinkeby
const daoAddress = deploymentResult.addresses.DAO_LOCK_TIME_0;
const transferERC20BudgetApprovalAddress = deploymentResult.addresses.transferErc20BudgetApproval;
const uniswapBudetApprovalAddress = deploymentResult.addresses.uniswapBudgetApproval;
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

const budgetApprovalAddresses = [];

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const lpAddress = await dao.liquidPool();

  const lp = await hre.ethers.getContractAt('LiquidPool', lpAddress);

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

  const tx1 = await dao.createBudgetApprovals(
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap]);
  const receipt1 = await tx1.wait();
  const creationEventLogs1 = _.filter(receipt1.events, { event: 'CreateBudgetApproval' });
  creationEventLogs1.forEach(({ args }) => {
    console.log('budget approval created at:', args.budgetApproval);
    budgetApprovalAddresses.push(args.budgetApproval);
  });

  const tx2 = await lp.createBudgetApprovals(
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap]);
  const receipt2 = await tx2.wait();
  const creationEventLogs2 = _.filter(receipt2.events, { event: 'CreateBudgetApproval' });
  creationEventLogs2.forEach(({ args }) => {
    console.log('budget approval created at:', args.budgetApproval);
    budgetApprovalAddresses.push(args.budgetApproval);
  });

  deployResultStore.save({
    ...deploymentResult,
    addresses: {
      ...deploymentResult.addresses,
      TRANSFER_ERC20_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[0],
      UNISWAP_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[1],
      LP_TRANSFER_ERC20_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[2],
      LP_UNISWAP_APPROVAL_DAO_LOCK_TIME_0: budgetApprovalAddresses[3],
    },
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
