const hre = require('hardhat');
const _ = require('lodash');

// ropsten

const strategyAddress = '0x311Bd9A31E65b878fE03ec9cF955932d50793C17';

async function main () {
  const strategy = await hre.ethers.getContractAt('Strategy', strategyAddress);
  const tx = await strategy.deposit({ value: hre.ethers.utils.parseEther('0.000345') });
  const receipt = await tx.wait();
  const creationEventLog = _.find(receipt.events, { event: 'CreatePortfolio' });
  console.log(creationEventLog);
  console.log('portfolio created at:', creationEventLog.args.portfolio);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
