const { expect } = require('chai');
const { ethers } = require('hardhat');
const { parseEther } = ethers.utils;
const { parseUnits } = require('ethers/lib/utils');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_WETH,
  ADDRESS_USD,
} = require('../utils/constants');

describe('ArbitrumChainlinkPriceGateway', async () => {
  let creator, unknown;
  let tokenA, tokenB, tokenC;
  let ArbitrumChainlinkPriceGateway, priceGateway;
  let feedRegistry;

  beforeEach(async () => {
    [creator, unknown] = await ethers.getSigners();
    ArbitrumChainlinkPriceGateway = await ethers.getContractFactory('ArbitrumChainlinkPriceGateway', { signer: creator });
    priceGateway = await ArbitrumChainlinkPriceGateway.deploy();

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
    tokenAEthAggregator.setPrice(parseUnits('0.25', 8));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_USD, parseUnits('0.25', 8));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_USD, tokenAEthAggregator.address);

    tokenB = await MockToken.deploy();
    await tokenB.setDecimals(6);
    const tokenBEthAggregator = await MockAggregatorV3.deploy();
    tokenBEthAggregator.setPrice(parseUnits('0.5', 8));
    await feedRegistry.setPrice(tokenB.address, ADDRESS_USD, parseUnits('0.5', 8));
    await feedRegistry.setDecimal(tokenB.address, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(tokenB.address, ADDRESS_USD, tokenBEthAggregator.address);

    tokenC = await MockToken.deploy();
    await tokenC.setDecimals(6);
    const tokenCEthAggregator = await MockAggregatorV3.deploy();
    tokenCEthAggregator.setPrice(parseUnits('-1', 8));
    await feedRegistry.setPrice(tokenC.address, ADDRESS_USD, parseUnits('-1', 8));
    await feedRegistry.setDecimal(tokenC.address, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(tokenC.address, ADDRESS_USD, tokenCEthAggregator.address);

    const ethUsdAggregator = await MockAggregatorV3.deploy();
    ethUsdAggregator.setPrice(parseUnits('10', 8));
    await feedRegistry.setPrice(ADDRESS_ETH, ADDRESS_USD, parseUnits('10', 8));
    await feedRegistry.setDecimal(ADDRESS_ETH, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(ADDRESS_ETH, ADDRESS_USD, ethUsdAggregator.address);
  });

  describe('isSupportedPair()', function () {
    it('returns fail if asset is not support', async function () {
      expect(await priceGateway.isSupportedPair(ADDRESS_USD, unknown.address)).to.eq(false);
    });
    it('returns fail if base is not support', async function () {
      expect(await priceGateway.isSupportedPair(unknown.address, ADDRESS_USD)).to.eq(false);
    });
    it('returns true if both base and asset supported', async function () {
      expect(await priceGateway.isSupportedPair(tokenA.address, tokenB.address)).to.eq(true);
    });
    it('returns true if asset/base = ETH/ WETH, and others is a supported token', async function () {
      expect(await priceGateway.isSupportedPair(tokenA.address, ADDRESS_ETH)).to.eq(true);
      expect(await priceGateway.isSupportedPair(ADDRESS_ETH, tokenA.address)).to.eq(true);
      expect(await priceGateway.isSupportedPair(tokenA.address, ADDRESS_WETH)).to.eq(true);
      expect(await priceGateway.isSupportedPair(ADDRESS_WETH, tokenA.address)).to.eq(true);
      expect(await priceGateway.isSupportedPair(ADDRESS_WETH, ADDRESS_ETH)).to.eq(true);
      expect(await priceGateway.isSupportedPair(ADDRESS_ETH, ADDRESS_WETH)).to.eq(true);
    });
  });

  describe('assetPrice(): base currency = ETH', function () {
    it('asset = 1ETH, should return 1 base currency', async function () {
      expect(await priceGateway.assetPrice(ADDRESS_ETH, ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
    });
    it('asset = 1tokenA, should return 0.25 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenA.address, ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('0.025'));
    });
    it('asset = 1tokenB, should return 0.5 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenB.address, ADDRESS_ETH, parseUnits('1', 6))).to.eq(parseEther('0.05'));
    });
  });

  describe('assetPrice(): base currency = tokenA', function () {
    it('asset = 1ETH, should return 4 base currency', async function () {
      expect(await priceGateway.assetPrice(ADDRESS_ETH, tokenA.address, parseEther('1'))).to.eq(parseEther('40'));
    });

    it('asset = 1tokenA, should return 1 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenA.address, tokenA.address, parseEther('1'))).to.eq(parseEther('1'));
    });

    it('asset = 1tokenB, should return 2 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenB.address, tokenA.address, parseUnits('1', 6))).to.eq(parseEther('2'));
    });
  });

  describe('assetPrice(): base currency = tokenB', function () {
    it('asset = 1ETH, should return 2 base currency', async function () {
      expect(await priceGateway.assetPrice(ADDRESS_ETH, tokenB.address, parseEther('1'))).to.eq(parseUnits('20', 6));
    });

    it('asset = 1tokenA, should return 0.5 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenA.address, tokenB.address, parseEther('1'))).to.eq(parseUnits('0.5', 6));
    });

    it('asset = 1tokenB, should return 1 base currency', async function () {
      expect(await priceGateway.assetPrice(tokenB.address, tokenB.address, parseUnits('1', 6))).to.eq(parseUnits('1', 6));
    });
  });

  describe('assetPrice(): base currency = tokenC ,  price < 0', function () {
    it('asset = 1ETH, should return 0 ', async function () {
      expect(await priceGateway.assetPrice(tokenA.address, tokenC.address, parseEther('1'))).to.eq(parseUnits('0', 6));
    });
  });

  describe('assetUSDPrice(): base currency = tokenC ,  price < 0', function () {
    it('asset = 1ETH, should return 0 ', async function () {
      expect(await priceGateway.assetUSDPrice(tokenC.address, parseEther('1'))).to.eq(parseUnits('0', 6));
    });
  });

  describe('usdAssetPrice(): base currency = tokenC ,  price < 0', function () {
    it('asset = 1ETH, should return 0 ', async function () {
      expect(await priceGateway.usdAssetPrice(tokenC.address, parseEther('1'))).to.eq(parseUnits('0', 6));
    });
  });

  describe('assetUSDPrice()', function () {
    it('asset = 1ETH, return 1', async function () {
      expect(await priceGateway.assetUSDPrice(ADDRESS_ETH, parseEther('1'))).to.eq(parseUnits('10', 8));
    });

    it('asset = 1tokenA, return 0.25', async function () {
      expect(await priceGateway.assetUSDPrice(tokenA.address, parseEther('1'))).to.eq(parseUnits('0.25', 8));
    });

    it('asset = 1tokenB, return 0.5', async function () {
      expect(await priceGateway.assetUSDPrice(tokenB.address, parseUnits('1', 6))).to.eq(parseUnits('0.5', 8));
    });
  });

  describe('usdAssetPrice()', function () {
    it('give 1ETH, return 1ETH', async function () {
      expect(await priceGateway.usdAssetPrice(ADDRESS_ETH, parseUnits('1', 8))).to.eq(parseEther('0.1'));
    });

    it('give 1ETH, return 4tokenA', async function () {
      expect(await priceGateway.usdAssetPrice(tokenA.address, parseUnits('1', 8))).to.eq(parseEther('4'));
    });

    it('give 1ETH, return 2tokenB', async function () {
      expect(await priceGateway.usdAssetPrice(tokenB.address, parseUnits('1', 8))).to.eq(parseUnits('2', 6));
    });
  });

  describe('Expiry Timestamp in Chainlink', function () {
    beforeEach(async () => {
      await feedRegistry.setBlockTimestamp(tokenB.address, ADDRESS_USD, Math.round(Date.now() / 1000) - 86400);
    });
    it('get usdAssetPrice fail ', async function () {
      await expect(priceGateway.usdAssetPrice(tokenB.address, parseEther('1'))).to.be.revertedWith('Stale price in Chainlink 113');
    });
    it('get assetUSDPrice fail ', async function () {
      await expect(priceGateway.assetUSDPrice(tokenB.address, parseEther('1'))).to.be.revertedWith('Stale price in Chainlink 113');
    });
    it('get assetPrice fail ', async function () {
      await expect(priceGateway.assetPrice(tokenA.address, tokenB.address, parseEther('1'))).to.be.revertedWith('Stale price in Chainlink 113');
    });
  });
});