const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const deployNetwork = hre.network.name || 'goerli';

    if (deployNetwork.includes('mumbai') || deployNetwork.includes('polygon')) {
        await deploy('PolygonChainlinkPriceGateway', {
            from: deployer,
            log: true,
            skipIfAlreadyDeployed: true,
            gasLimit: 6000000,
            ...(await gasFeeConfig()),
        });
    } else {
        await deploy('EthereumChainlinkPriceGateway', {
            from: deployer,
            log: true,
            skipIfAlreadyDeployed: true,
            gasLimit: 6000000,
            ...(await gasFeeConfig()),
        });
    }
};

module.exports.tags = ['phase2'];
