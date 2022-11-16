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

const BA_TYPES_MAPPING = {
  'Transfer ERC20 Budget Approval': 'TransferERC20BudgetApproval',
  'Transfer ERC721 Budget Approval': 'TransferERC721BudgetApproval',
  'Transfer From Arbitrum ERC20 Budget Approval': 'TransferFromArbitrumERC20BudgetApproval',
  'Transfer Liquid ERC20 Budget Approval': 'TransferLiquidERC20BudgetApproval',
  'Transfer To Arbitrum ERC20 Budget Approval': 'TransferToArbitrumERC20BudgetApproval',
  'Uniswap Any Token Budget Approval': 'UniswapAnyTokenBudgetApproval',
  'Uniswap Liquid Budget Approval': 'UniswapLiquidBudgetApproval',
  'GMX Any Token Budget Approval': 'GMXAnyTokenBudgetApproval',
  'Create Arbitrum Dao Budget Approval': 'CreateArbitrumDaoBudgetApproval',
};

async function main () {
  const { get } = hre.deployments;

  const adamDeployment = await get('Adam');
  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daos = events.map(e => ({ dao: e.args.dao, name: e.args.name }));

  const { daoAddress } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'daoAddress',
        message: 'Dao?',
        choices: daos.map(({ dao, name }) => ({
          name: `${dao} - ${name}`,
          value: dao,
        })),
      }]);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);
  const createEvents = await dao.queryFilter(dao.filters.CreateBudgetApproval());
  const revokeEvents = await dao.queryFilter(dao.filters.RevokeBudgetApproval());

  const revokedBA = revokeEvents.map(e => e.args.budgetApproval);
  const createdBA = createEvents
    .map(e => e.args.budgetApproval)
    .filter(ba => !revokedBA.includes(ba));

  const baTypeAddresses = (await Promise.all(createdBA.map(async (ba) => {
    const baContract = await hre.ethers.getContractAt('TransferERC20BudgetApproval', ba);
    const name = await baContract.name();
    return [BA_TYPES_MAPPING[name], ba];
  }))).filter(deployment => !!deployment);

  const { budgetApprovalOptions } = await inquirer.prompt([
    {
      type: 'list',
      name: 'budgetApprovalOptions',
      message: 'Budget Approval?',
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

  if (budgetApprovalOptions.key === 'CreateArbitrumDaoBudgetApproval') {
    const l1Provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL);
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_GOERLI_URL);
    const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider);
    const gasPriceBid = await l2Provider.getGasPrice();
    const executee = await budgetApproval.executee();

    const Adam = await hre.ethers.getContractFactory('Adam');
    console.log(answers);

    const data = Adam.interface.encodeFunctionData('createDao', [
      [
        answers.name,
        answers.description,
        answers.baseCurrency,
        answers.maxMemberLimit,
        answers.memberTokenName,
        answers.memberTokenSymbol,
        answers.depositTokens.split(','),
      ],
      answers.data.split(','),
    ]);

    const newDaoBytesLength = hexDataLength(data);
    const _submissionPriceWei = await l1ToL2MessageGasEstimate.estimateSubmissionFee(
      l1Provider,
      await l1Provider.getGasPrice(),
      newDaoBytesLength);
    const submissionPriceWei = _submissionPriceWei.mul(5);
    const maxGas = await l1ToL2MessageGasEstimate.estimateRetryableTicketGasLimit({
      from: executee,
      to: '0xC103eafa82a3F9C4a7405f7787184aA6C1848F39', // TODO change based on network
      l2CallValue: 0,
      excessFeeRefundAddress: executee,
      callValueRefundAddress: executee,
      data,
    }, ethers.utils.parseEther('1'));

    answers = {
      ...answers,
      depositTokens: answers.depositTokens.split(','),
      data: answers.data.split(','),
      maxSubmissionCost: submissionPriceWei,
      maxGas,
      gasPriceBid,
    };
    console.log(answers);
  } else if (budgetApprovalOptions.key === 'TransferToArbitrumERC20BudgetApproval') {
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
        value: ethers.utils.parseEther(answers.value),
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
        maxSubmissionCost: 134745111621500,
        maxGas: 100000,
        gasPriceBid: 300000000,
      };
    }
  } else if (budgetApprovalOptions.key === 'TransferFromArbitrumERC20BudgetApproval') {
    if (answers.l1token.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      answers = {
        ...answers,
        value: toBigNumber(answers.value, 18),
      };
    } else {
      const l1Provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL);
      const ERC20 = await hre.ethers.getContractFactory('ERC20');
      const erc20 = new ethers.Contract(answers.l1token, ERC20.interface, l1Provider);
      const decimals = await erc20.decimals();
      answers = {
        ...answers,
        value: toBigNumber(answers.value, decimals),
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
