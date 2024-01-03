const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
/**
 * @description help to export the deployment result
 */
async function main() {
    const { get } = hre.deployments;
    const deployNetwork = hre.network.name || 'kovan';

    const adamDeployment = await get('Adam');

    const contractAddresses = {
        adam: adamDeployment.address,
        dao: (await get('Dao')).address,
        membership: (await get('Membership')).address,
        govern: (await get('Govern')).address,
        memberToken: (await get('MemberToken')).address,
        liquidPool: (await get('LiquidPool')).address,
        team: (await get('Team')).address,
        transferErc721BudgetApproval: (
            await get('TransferERC721BudgetApproval')
        ).address,
        transferERC20BudgetApproval: (await get('TransferERC20BudgetApproval'))
            .address,
        uniswapAnyTokenBudgetApproval: (
            await get('UniswapAnyTokenBudgetApproval')
        ).address,
    };

    console.log(contractAddresses);

    fileReader.save('deploy-results', 'results.json', {
        network: getNetwork(deployNetwork),
        block_number: adamDeployment.receipt.blockNumber,
        addresses: contractAddresses,
        initdata_addresses: {},
    });
}

function getNetwork(deployNetwork) {
    const networks = deployNetwork.split('-');
    networks.pop();
    return networks.join('-');
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
