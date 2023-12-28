const { ethers } = require('hardhat');
const { ADDRESS_MOCK_FEED_REGISTRY } = require('./constants');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');

module.exports = {
    setMockFeedRegistry: async (aggregatorParams) => {
        let feedRegistry;
        await ethers.provider.send('hardhat_setCode', [
            ADDRESS_MOCK_FEED_REGISTRY,
            feedRegistryArticfact.deployedBytecode,
        ]);

        feedRegistry = await ethers.getContractAt(
            'MockFeedRegistry',
            ADDRESS_MOCK_FEED_REGISTRY,
        );

        const MockAggregatorV3 = await ethers.getContractFactory(
            'MockAggregatorV3',
        );

        const aggregators = await Promise.all(
            aggregatorParams.map(async ({ token1, token2, price, decimal }) => {
                const aggregator = await MockAggregatorV3.deploy();
                aggregator.setPrice(price);
                feedRegistry.setPrice(token1, token2, price);
                feedRegistry.setDecimal(token1, token2, decimal);
                feedRegistry.setAggregator(token1, token2, aggregator.address);
                return aggregator;
            }),
        );

        return { feedRegistry, aggregators };
    },
};
