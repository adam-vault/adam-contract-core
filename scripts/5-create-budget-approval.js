const hre = require('hardhat');
const _ = require('lodash');
const fileReader = require('../utils/fileReader');
const {
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateUniswapBAParams,
  getCreateTransferERC20BAParams,
} = require('../utils/paramsStruct');

const deploymentResult = fileReader.load('deploy/results.json', 'utf8');
const deployNetwork = deploymentResult.network;
const {
  ETH_ADDRESS, DAI_ADDRESS,
} = fileReader.load(`constant/${deployNetwork}.json`, 'utf-8');

// rinkeby
const daoAddress = deploymentResult.initdata_addresses.daos[0].address;
const transferLiquidERC20BudgetApprovalAddress = deploymentResult.addresses.transferLiquidERC20BudgetApproval;
const uniswapBudetApprovalAddress = deploymentResult.addresses.uniswapBudgetApproval;
const transferERC20BudgetApprovalAddress = deploymentResult.addresses.transferERC20BudgetApproval;

const budgetApprovalAddresses = [];

async function main () {
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const lpAddress = await dao.liquidPool();

  const lp = await hre.ethers.getContractAt('LiquidPool', lpAddress);

  const transferLiquidERC20BudgetApproval = await hre.ethers.getContractAt('TransferLiquidERC20BudgetApproval', transferLiquidERC20BudgetApprovalAddress);
  const dataLiquidERC20 = transferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize',
    getCreateTransferLiquidErc20TokenBAParams({
      dao: daoAddress,
      executor: '0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A',
      allowUnlimitedUsageCount: true,
      usageCount: 0,
      toAddresses: ['0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A'],
      tokens: [ETH_ADDRESS, DAI_ADDRESS],
      totalAmount: hre.ethers.utils.parseEther('1000'),
    }),
  );

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize',
    getCreateUniswapBAParams({
      dao: daoAddress,
      executor: '0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A',
      allowUnlimitedUsageCount: true,
      usageCount: 0,
      fromTokens: [ETH_ADDRESS, DAI_ADDRESS],
      toTokens: [ETH_ADDRESS, DAI_ADDRESS],
      allowAnyAmount: true,
      totalAmount: hre.ethers.utils.parseEther('0'),
      amountPercentage: '100',
    }),
  );

  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataErc20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    getCreateTransferERC20BAParams({
      dao: daoAddress,
      executor: '0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A',
      allowUnlimitedUsageCount: true,
      usageCount: 0,
      toAddresses: ['0xBa2c5715A58162D61F08B87D84e7E15DCc40d47A'],
      token: DAI_ADDRESS,
      totalAmount: '1000',
    }),
  );

  const tx1 = await dao.createBudgetApprovals(
    [transferERC20BudgetApprovalAddress],
    [dataErc20]);
  const receipt1 = await tx1.wait();
  const creationEventLogs1 = _.filter(receipt1.events, { event: 'CreateBudgetApproval' });
  creationEventLogs1.forEach(({ args }) => {
    console.log('budget approval created at:', args.budgetApproval);
    budgetApprovalAddresses.push(args.budgetApproval);
  });

  const tx2 = await lp.createBudgetApprovals(
    [transferLiquidERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataLiquidERC20, dataUniswap]);
  const receipt2 = await tx2.wait();
  const creationEventLogs2 = _.filter(receipt2.events, { event: 'CreateBudgetApproval' });
  creationEventLogs2.forEach(({ args }) => {
    console.log('budget approval created at:', args.budgetApproval);
    budgetApprovalAddresses.push(args.budgetApproval);
  });

  fileReader.save('deploy', 'results.json', {
    ...deploymentResult,
    initdata_addresses: {
      ...deploymentResult.initdata_addresses,
      budgetApprovals: [{
        address: budgetApprovalAddresses[0],
        description: 'Treasury, ERC20 transfer, dao0 ',
      }, {
        address: budgetApprovalAddresses[1],
        description: 'Treasury, uniswap, dao0 ',
      }, {
        address: budgetApprovalAddresses[2],
        description: 'Lp, ERC20 transfer, dao0 ',
      }, {
        address: budgetApprovalAddresses[3],
        description: 'Lp, uniswap, dao0 ',
      }],
    },
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
