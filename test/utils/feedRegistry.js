const { ethers } = require('hardhat');

const {
    ADDRESS_MOCK_FEED_REGISTRY,
    ADDRESS_MOCK_AGGRGATOR,
} = require('../utils/constants');
const setMock = async () => {
    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
        ADDRESS_MOCK_FEED_REGISTRY,
        feedRegistryArticfact.deployedBytecode,
    ]);
};

const setFeed = async (base, quota, rate, { decimal }) => {
    const feedRegistry = await ethers.getContractAt(
        'MockFeedRegistry',
        ADDRESS_MOCK_FEED_REGISTRY,
    );
    await feedRegistry.setAggregator(quota, base, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(quota, base, rate);
    if (decimal) {
        await feedRegistry.setDecimal(quota, base, decimal);
    }
};

module.exports = {
    setMock,
    setFeed,
};
