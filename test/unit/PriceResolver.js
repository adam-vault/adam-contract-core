const { ethers } = require('hardhat');
const { expect } = require('chai');
const { parseUnits } = require('ethers/lib/utils');

const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('PriceResolver.sol', () => {
  let creator, signer1, signer2;
  let feedRegistry;
  let tokenA, tokenB;
  let priceResolver;

  beforeEach(async () => {
    [creator, signer1, signer2] = await ethers.getSigners();

    const MockPriceResolver = await ethers.getContractFactory('MockPriceResolver', { signer: creator });
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const MockAggregatorV3 = await ethers.getContractFactory('MockAggregatorV3', { signer: creator });

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);

    tokenA = await MockToken.deploy();
    const tokenAEthAggregator = await MockAggregatorV3.deploy();
    tokenAEthAggregator.setPrice(parseEther('0.25'));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, parseEther('0.25'));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, tokenAEthAggregator.address);

    tokenB = await MockToken.deploy();
    await tokenB.setDecimals(6);
    const tokenBEthAggregator = await MockAggregatorV3.deploy();
    tokenBEthAggregator.setPrice(parseEther('0.5'));
    await feedRegistry.setPrice(tokenB.address, ADDRESS_ETH, parseEther('0.5'));
    await feedRegistry.setDecimal(tokenB.address, ADDRESS_ETH, 18);
    await feedRegistry.setAggregator(tokenB.address, ADDRESS_ETH, tokenBEthAggregator.address);

    priceResolver = await MockPriceResolver.deploy();
  });

  describe('assetBaseCurrency(): base currency = ETH', function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(ADDRESS_ETH);
    });
    it('asset = 1ETH, should return 1 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
    });
    it('asset = 1tokenA, should return 0.25 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenA.address, parseEther('1'))).to.eq(parseEther('0.25'));
    });
    it('asset = 1tokenB, should return 0.5 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenB.address, parseUnits('1', 6))).to.eq(parseEther('0.5'));
    });
  });

  describe('assetBaseCurrency(): base currency = tokenA', function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(tokenA.address);
      await priceResolver.setBaseCurrency(tokenA.address);
    });

    it('asset = 1ETH, should return 4 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('4'));
    });

    it('asset = 1tokenA, should return 1 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenA.address, parseEther('1'))).to.eq(parseEther('1'));
    });

    it('asset = 1tokenB, should return 2 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenB.address, parseUnits('1', 6))).to.eq(parseEther('2'));
    });
  });

  describe('assetBaseCurrency(): base currency = tokenB', function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(tokenB.address);
    });

    it('asset = 1ETH, should return 2 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseUnits('2', 6));
    });

    it('asset = 1tokenA, should return 0.5 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenA.address, parseEther('1'))).to.eq(parseUnits('0.5', 6));
    });

    it('asset = 1tokenB, should return 1 base currency', async function () {
      expect(await priceResolver.assetBaseCurrencyPrice(tokenB.address, parseUnits('1', 6))).to.eq(parseUnits('1', 6));
    });
  });

  describe('assetEthPrice()', function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(ADDRESS_ETH);
    });
    it('asset = 1ETH, return 1', async function () {
      expect(await priceResolver.assetEthPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
    });

    it('asset = 1tokenA, return 0.25', async function () {
      expect(await priceResolver.assetEthPrice(tokenA.address, parseEther('1'))).to.eq(parseEther('0.25'));
    });

    it('asset = 1tokenB, return 0.5', async function () {
      expect(await priceResolver.assetEthPrice(tokenB.address, parseUnits('1', 6))).to.eq(parseEther('0.5'));
    });
  });

  describe('ethAssetPrice()', function () {
    it('give 1ETH, return 1ETH', async function () {
      expect(await priceResolver.ethAssetPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
    });

    it('give 1ETH, return 4tokenA', async function () {
      expect(await priceResolver.ethAssetPrice(tokenA.address, parseEther('1'))).to.eq(parseEther('4'));
    });

    it('give 1ETH, return 2tokenB', async function () {
      expect(await priceResolver.ethAssetPrice(tokenB.address, parseEther('1'))).to.eq(parseUnits('2', 6));
    });
  });
});
