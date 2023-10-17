const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, getOrNull, execute, read } = deployments;
    const { deployer } = await getNamedAccounts();
    const deployNetwork = hre.network.name || 'goerli';

    let priceGatewayName;

    if (deployNetwork.includes('mumbai') || deployNetwork.includes('polygon')) {
        priceGatewayName = 'PolygonChainlinkPriceGateway';
    } else {
        priceGatewayName = 'EthereumChainlinkPriceGateway';
    }

    const existing = await getOrNull(priceGatewayName);
    const result = await deploy(priceGatewayName, {
        priceGatewayName,
        from: deployer,
        log: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });

    if (!existing || existing.address !== result.address) {
        if (
            existing &&
            (await read('Adam', 'priceGateways', existing.address))
        ) {
            await execute(
                'Adam',
                { from: deployer, log: true, ...(await gasFeeConfig()) },
                'abandonPriceGateways',
                [existing.address],
            );
        }
        if (!(await read('Adam', 'priceGateways', result.address))) {
            await execute(
                'Adam',
                { from: deployer, log: true, ...(await gasFeeConfig()) },
                'whitelistPriceGateways',
                [result.address],
            );
        }
    }
};

module.exports.tags = ['v2', 'priceGateway'];
