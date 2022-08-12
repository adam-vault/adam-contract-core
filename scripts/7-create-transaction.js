const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const deploymentResult = fileReader.load('deploy-results/results.json', 'utf8');
const abiCoder = hre.ethers.utils.defaultAbiCoder;
const { parseEther } = hre.ethers.utils;
const _ = require('lodash');

const deployNetwork = deploymentResult.network;
const {
  ETH_ADDRESS,
} = fileReader.load(`constant/${deployNetwork}.json`, 'utf-8');

// rinkeby
const budgetApprovalAddress = deploymentResult.initdata_addresses.budgetApprovals[0].address;
const daoAddress = deploymentResult.initdata_addresses.daos[0].address;

async function main () {
  const budgetApproval = await hre.ethers.getContractAt(
    'TransferLiquidERC20BudgetApproval',
    budgetApprovalAddress,
  );

  const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
    ETH_ADDRESS,
    daoAddress,
    parseEther('101'),
  ]);
  const tx = await budgetApproval.createTransaction(
    [transactionData],
    Math.round(Date.now() / 1000) + 86400,
    false,
  );

  const receipt = await tx.wait();
  const creationEventLogs = _.filter(receipt.events, { event: 'CreateTransaction' });

  creationEventLogs.forEach(({ args }) => {
    console.log(`Transaction created id = ${args.id.toString()}, BA = ${budgetApprovalAddress}`);
  });
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
