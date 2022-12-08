const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
/**
 * @description help to export the deployment result
 */
async function main () {
  const { get } = hre.deployments;
  const deployNetwork = hre.network.name || 'kovan';

  const adamDeployment = await get('Adam');

  const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
  const events = await adam.queryFilter(adam.filters.ImplementationUpgrade());

  const {
    daoImplementation: dao,
    membershipImplementation: membership,
    liquidPoolImplementation: liquidPool,
    memberTokenImplementation: memberToken,
    governImplementation: govern,
  } = events.pop().args;

  const contractAddresses = {
    adam: adamDeployment.address,
    dao,
    membership,
    govern,
    memberToken,
    liquidPool,
    team: (await get('Team')).address,
    governFactory: (await get('GovernFactory')).address,
    transferLiquidERC20BudgetApproval: (await get('TransferLiquidERC20BudgetApproval')).address,
    transferErc721BudgetApproval: (await get('TransferERC721BudgetApproval')).address,
    transferERC20BudgetApproval: (await get('TransferERC20BudgetApproval')).address,
    uniswapAnyTokenBudgetApproval: (await get('UniswapAnyTokenBudgetApproval')).address,
    uniswapLiquidBudgetApproval: (await get('UniswapLiquidBudgetApproval')).address,
  };

  console.log(contractAddresses);

  fileReader.save('deploy-results', 'results.json', {
    network: deployNetwork.split('-')[0],
    block_number: adamDeployment.receipt.blockNumber,
    addresses: contractAddresses,
    initdata_addresses: {},
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
