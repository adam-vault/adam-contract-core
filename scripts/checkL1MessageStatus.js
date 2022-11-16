const inquirer = require('inquirer');
const { providers, Wallet } = require('ethers');
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

async function main () {
  const walletPrivateKey = process.env.PRIVATE_KEY;

  const l1Provider = new providers.JsonRpcProvider(process.env.GOERLI_URL);
  const l2Provider = new providers.JsonRpcProvider(process.env.ARBITRUM_GOERLI_URL);

  const l2Wallet = new Wallet(walletPrivateKey, l2Provider);

  const { txnHash } = await inquirer.prompt([{ name: 'txnHash', message: 'L1 txnHash?' }]);

  const receipt = await l1Provider.getTransactionReceipt(txnHash);

  const l1Receipt = new L1TransactionReceipt(receipt);
  const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
  const status = await messages[0].status();
  console.log(status);


  if (status === L1ToL2MessageStatus.REDEEMED) {
    console.log(`L2 retryable txn executed 🥳 ${messages[0].retryableCreationId}`)
  } else {
    console.log(
      `L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`
    )
  }
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
