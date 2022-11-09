const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');

const {
  ADDRESS_ETH,
} = require('../utils/constants');

describe('PriceResolver.sol - test/unit/PriceResolver.js', () => {
  let creator;
  let priceRouter;
  let tokenA;
  let priceResolver;

  describe('Modifier priceRouterExist', function () {
    beforeEach(async () => {
      [creator] = await ethers.getSigners();

      const MockPriceResolver = await ethers.getContractFactory('MockPriceResolver', { signer: creator });
      priceResolver = await MockPriceResolver.deploy();

      const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: creator });
      priceRouter = await smock.fake('PriceRouter');
      tokenA = await smock.fake('TokenA');
      const proxyPriceResolver = await ERC1967Proxy.deploy(priceResolver.address,
        MockPriceResolver.interface.encodeFunctionData('initialize', [ethers.constants.AddressZero, ADDRESS_ETH]));

      priceResolver = await ethers.getContractAt('MockPriceResolver', proxyPriceResolver.address, creator);
    });

    it('reverts if not Price Router set', async function () {
      await expect(priceResolver.baseCurrency()).to.be.revertedWith('Price router not Exist');
      await expect(priceResolver.assetBaseCurrencyPrice(tokenA.address, 1000)).to.be.revertedWith('Price router not Exist');
      await expect(priceResolver.ethAssetPrice(tokenA.address, 1000)).to.be.revertedWith('Price router not Exist');
      await expect(priceResolver.assetEthPrice(tokenA.address, 1000)).to.be.revertedWith('Price router not Exist');
      await expect(priceResolver.baseCurrencyDecimals()).to.be.revertedWith('Price router not Exist');
      await expect(priceResolver.canResolvePrice(tokenA.address)).to.be.revertedWith('Price router not Exist');
    });
  });

  describe('baseCurrency()', function () {
    beforeEach(async () => {
      [creator] = await ethers.getSigners();

      const MockPriceResolver = await ethers.getContractFactory('MockPriceResolver', { signer: creator });
      priceResolver = await MockPriceResolver.deploy();

      const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: creator });
      priceRouter = await smock.fake('PriceRouter');
      tokenA = await smock.fake('TokenA');
      const proxyPriceResolver = await ERC1967Proxy.deploy(priceResolver.address,
        MockPriceResolver.interface.encodeFunctionData('initialize', [priceRouter.address, ADDRESS_ETH]));

      priceResolver = await ethers.getContractAt('MockPriceResolver', proxyPriceResolver.address, creator);
    });

    it('returns baseCurrency correctly', async function () {
      expect(await priceResolver.baseCurrency()).to.eq(ADDRESS_ETH);
    });
  });

  describe('assetBaseCurrencyPrice()', function () {
    beforeEach(async () => {
      await priceResolver.assetBaseCurrencyPrice(tokenA.address, 1000);
    });
    it('redirects the call to Price Router', async function () {
      expect(priceRouter.assetBaseCurrencyPrice).to.be.calledWith(tokenA.address, 1000, ADDRESS_ETH);
    });
  });

  describe('ethAssetPrice()', function () {
    beforeEach(async () => {
      await priceResolver.ethAssetPrice(tokenA.address, 1000);
    });
    it('redirects the call to Price Router', async function () {
      expect(priceRouter.ethAssetPrice).to.be.calledWith(tokenA.address, 1000);
    });
  });

  describe('assetEthPrice()', function () {
    beforeEach(async () => {
      await priceResolver.assetEthPrice(tokenA.address, 1000);
    });
    it('redirects the call to Price Router', async function () {
      expect(priceRouter.assetEthPrice).to.be.calledWith(tokenA.address, 1000);
    });
  });

  describe('baseCurrencyDecimals()', function () {
    beforeEach(async () => {
      await priceResolver.baseCurrencyDecimals();
    });
    it('redirects the call to Price Router', async function () {
      expect(priceRouter.baseCurrencyDecimals).to.be.calledWith(ADDRESS_ETH);
    });
  });

  describe('canResolvePrice()', function () {
    beforeEach(async () => {
      await priceResolver.canResolvePrice(tokenA.address);
    });
    it('redirects the call to Price Router', async function () {
      expect(priceRouter.canResolvePrice).to.be.calledWith(tokenA.address);
    });
  });
});
