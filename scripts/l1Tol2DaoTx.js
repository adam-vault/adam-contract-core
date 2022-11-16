const hre = require('hardhat');
const inquirer = require('inquirer');

const { providers, Wallet } = require('ethers')
const ethers = require('ethers')
const { hexDataLength } = require('@ethersproject/bytes')
const {
  L1ToL2MessageGasEstimator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
const {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthBridger,
  getL2Network,
} = require('@arbitrum/sdk');



async function main () {
  const walletPrivateKey = process.env.PRIVATE_KEY;
  const l1Provider = new providers.JsonRpcProvider(process.env.GOERLI_URL);
  const l2Provider = new providers.JsonRpcProvider(process.env.ARBITRUM_GOERLI_URL);

  const l1Wallet = new Wallet(walletPrivateKey, l1Provider);
  const l2Wallet = new Wallet(walletPrivateKey, l2Provider);

  const l2Network = await getL2Network(l2Provider);
  const ethBridger = new EthBridger(l2Network);
  const inboxAddress = ethBridger.l2Network.ethBridge.inbox;
  const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider);

  const { get } = hre.deployments;
  const adamDeployment = await get('Adam');
  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address, l1Wallet);
  const events = await adam.queryFilter(adam.filters.CreateDao());
  const daos = events.map(e => ({ dao: e.args.dao, name: e.args.name }));
  const L2_ADAM = '0xC103eafa82a3F9C4a7405f7787184aA6C1848F39';

  const { daoAddress, ...answers } = await inquirer.prompt([
    { type: 'list', name: 'daoAddress', message: 'Dao?', choices: daos.map(({ dao, name }) => ({ name: `${dao} - ${name}`, value: dao })) },
    { type: 'input', name: 'name', message: 'L2 DaoName?', default: 'L2 New Dao' },
    { type: 'input', name: 'description', message: 'L2 DaoDescription?', default: '...' },
    { type: 'input', name: 'baseCurrency', message: 'L2 Dao baseCurrency?', default: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
    { type: 'input', name: 'maxMemberLimit', message: 'L2 Dao maxMemberLimit?', default: 1 },
    { type: 'input', name: '_memberTokenName', message: 'L2 Dao memberTokenName?', default: '' },
    { type: 'input', name: '_memberTokenSymbol', message: 'L2 Dao memberTokenSymbol?', default: '' },
    { type: 'input', name: 'depositTokens', message: 'L2 Dao depositTokens?', default: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  ]);

  const l1Dao = await hre.ethers.getContractAt('Dao', daoAddress, l1Wallet);
  const params = [
    answers.name,
    answers.description,
    answers.baseCurrency,
    answers.maxMemberLimit,
    answers._memberTokenName,
    answers._memberTokenSymbol,
    answers.depositTokens.split(','),
  ];

  const Dao = await hre.ethers.getContractFactory('Dao');
  const calldataGovern = Dao.interface.encodeFunctionData('createGovern', ['General', 0, 3000,5000, 0, ethers.constants.AddressZero, 100]);

  const Adam = await hre.ethers.getContractFactory('Adam');
  const calldata = Adam.interface.encodeFunctionData('createDao', [params, [calldataGovern]]);

  const newDaoBytesLength = hexDataLength(calldata);

  const _submissionPriceWei = await l1ToL2MessageGasEstimate.estimateSubmissionFee(
    l1Provider,
    await l1Provider.getGasPrice(),
    newDaoBytesLength);
  const submissionPriceWei = _submissionPriceWei.mul(5);
  const gasPriceBid = await l2Provider.getGasPrice();

  console.log(`Current retryable base submission price: ${_submissionPriceWei.toString()}`);
  console.log(`L2 gas price: ${gasPriceBid.toString()}`);

  const maxGas = await l1ToL2MessageGasEstimate.estimateRetryableTicketGasLimit({
    from: daoAddress,
    to: L2_ADAM,
    l2CallValue: 0,
    excessFeeRefundAddress: daoAddress,
    callValueRefundAddress: daoAddress,
    data: calldata,
  }, ethers.utils.parseEther('1'));

  const tx = await l1Dao.createArbRetryableTicket(L2_ADAM, 0, calldata, submissionPriceWei, maxGas, gasPriceBid);
  console.log(tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
