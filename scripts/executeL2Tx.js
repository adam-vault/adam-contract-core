const inquirer = require('inquirer');
const { providers, Wallet } = require('ethers');
const { L2TransactionReceipt, L2ToL1MessageStatus } = require('@arbitrum/sdk');

async function main () {
  const walletPrivateKey = process.env.PRIVATE_KEY;

  const l1Provider = new providers.JsonRpcProvider(process.env.GOERLI_URL);
  const l2Provider = new providers.JsonRpcProvider(process.env.ARBITRUM_GOERLI_URL);

  const l1Wallet = new Wallet(walletPrivateKey, l1Provider);

  const { txnHash } = await inquirer.prompt([{ name: 'txnHash', message: 'L2 txnHash?' }]);

  const receipt = await l2Provider.getTransactionReceipt(txnHash);
  const l2Receipt = new L2TransactionReceipt(receipt);
  const messages = await l2Receipt.getL2ToL1Messages(l1Wallet, l2Provider);
  const l2ToL1Msg = messages[0];
  const status = await l2ToL1Msg.status(l2Provider);

  if (status === L2ToL1MessageStatus.EXECUTED) {
    throw new Error('Message already executed! Nothing else to do here');
  } else if (status === L2ToL1MessageStatus.UNCONFIRMED) {
    throw new Error('Message not yet confirmed in L1');
  }

  console.log('Outbox entry exists! Trying to execute now');

  const res = await l2ToL1Msg.execute(l2Provider);
  const rec = await res.wait();
  console.log('Done! Your transaction is executed', rec);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
