const hre = require('hardhat');
const ethers = require('ethers');
const inquirer = require('inquirer');
const abiCoder = hre.ethers.utils.defaultAbiCoder;
const _ = require('lodash');
const { hexDataLength } = require('@ethersproject/bytes');
const {
  L1ToL2MessageGasEstimator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')

const toBigNumber = (val, decimals) => {
  if (val._isBigNumber) {
    return val;
  }

  const [integerStr, decimalStr = ''] = val.split('.');
  const bnStr = integerStr + decimalStr.substring(0, decimals).padEnd(decimals, '0');
  return ethers.BigNumber.from(bnStr);
};

const BA_TYPES = [
  'TransferERC20BudgetApproval',
  'TransferERC721BudgetApproval',
  'TransferFromArbitrumERC20BudgetApproval',
  'TransferLiquidERC20BudgetApproval',
  'TransferToArbitrumERC20BudgetApproval',
  'UniswapAnyTokenBudgetApproval',
  'UniswapLiquidBudgetApproval',
  'GMXAnyTokenBudgetApproval',
];

async function main () {
  const { getOrNull } = hre.deployments;

  const baTypeAddresses = (await Promise.all(BA_TYPES.map(async (key) => {
    const d = await getOrNull(key);
    if (!d) return null;
    return [key, d.address];
  }))).filter(deployment => !!deployment);

  const { budgetApprovalOptions } = await inquirer.prompt([
    {
      type: 'list',
      name: 'budgetApprovalOptions',
      message: 'Budget Approval Type?',
      choices: baTypeAddresses.map(([key, address]) => ({
        name: key,
        value: { key, address },
      })),
    },
  ]);

  const budgetApproval = await hre.ethers.getContractAt(budgetApprovalOptions.key, budgetApprovalOptions.address);
  const params = await budgetApproval.executeParams();
  let answers = await inquirer.prompt(params.map(param => param.split(' ')).map(([pType, pKey]) => ({
    type: pType === 'bool' ? 'confirm' : 'input',
    name: pKey,
    message: pKey,
  })));

  if (budgetApprovalOptions.key === 'TransferToArbitrumERC20BudgetApproval') {
    const l1Provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL);
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_GOERLI_URL);
    const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider);
    const gasPriceBid = await l2Provider.getGasPrice();
    const executee = await budgetApproval.executee();

    if (answers.token.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      const newDaoBytesLength = hexDataLength('0x');
      const _submissionPriceWei = await l1ToL2MessageGasEstimate.estimateSubmissionFee(
        l1Provider,
        await l1Provider.getGasPrice(),
        newDaoBytesLength);

      const submissionPriceWei = _submissionPriceWei.mul(5);

      const maxGas = await l1ToL2MessageGasEstimate.estimateRetryableTicketGasLimit({
        from: executee,
        to: answers.to,
        l2CallValue: ethers.utils.parseEther(answers.value),
        excessFeeRefundAddress: executee,
        callValueRefundAddress: executee,
        data: '0x',
      }, ethers.utils.parseEther('1'));

      answers = {
        ...answers,
        maxSubmissionCost: submissionPriceWei,
        maxGas,
        gasPriceBid,
      };
    } else {
      const erc20 = await hre.ethers.getContractAt('ERC20', answers.token);
      const decimals = await erc20.decimals();
      const amountBN = toBigNumber(answers.value, decimals);

      answers = {
        ...answers,
        value: amountBN,
        maxSubmissionCost: 3000000000000,
        maxGas: 120473,
        gasPriceBid: 300000000,
      };
    }
  }
  const transactionData = abiCoder.encode(params, Object.values(answers));

  console.log(answers);

  const { shouldExecute } = await inquirer.prompt([{ type: 'confirm', name: 'shouldExecute', message: 'Execute now?'}]);

  const tx = await budgetApproval.createTransaction(
    [transactionData],
    Math.round(Date.now() / 1000) + 86400,
    shouldExecute,
    '',
  );
  const receipt = await tx.wait();
  const creationEventLogs = _.filter(receipt.events, { event: 'CreateTransaction' });
  creationEventLogs.forEach(({ args }) => {
    console.log(`Transaction created id = ${args.id.toString()}, BA = ${budgetApprovalOptions.type} ${budgetApprovalOptions.address}`);
  });
  console.log(tx);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
