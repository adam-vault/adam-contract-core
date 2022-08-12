const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const { ethers } = require('hardhat');
const deploymentResult = fileReader.load('deploy-results/results.json', 'utf8');

async function main () {
  const proposalId = deploymentResult.initdata_addresses.proposalId;
  const governAddress = deploymentResult.initdata_addresses.governAddress;

  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log('blockNumber', blockNumber);

  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const events = await govern.queryFilter(govern.filters.ProposalCreated());
  const event = events.find(e => e.args.proposalId.toString() === proposalId);

  const state = await govern.state(proposalId);

  console.log('\n=== Check proposal state ===\n');

  console.log(state);
  if (state.toString() === '3') {
    console.log('Proposal deadline passed and no one voted');
    return;
  }
  if (state.toString() === '7') {
    console.log('Proposal already executed');
    return;
  }
  if (state.toString() !== '4') {
    console.log('Proposal deadline havent passed yet');
    return;
  }
  const { targets, calldatas, description } = event.args;

  console.log('\n=== Submit Tx for Govern.execcute(proposal) ===\n');

  console.log(targets, calldatas.map(() => 0), calldatas, ethers.utils.id(description));

  const tx = await govern.execute(targets, calldatas.map(() => 0), calldatas, ethers.utils.id(description));
  await tx.wait();
  console.log(JSON.stringify(JSON.parse(description), null, 2));

  console.log('Proposal Executed');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
