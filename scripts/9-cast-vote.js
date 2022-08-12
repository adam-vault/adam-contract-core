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
  const tx = await govern.castVote(proposalId, '1');
  await tx.wait();

  console.log('\n=== Submit Tx for Govern.castVote(yes) ===\n');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
