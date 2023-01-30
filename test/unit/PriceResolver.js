const { ethers } = require('hardhat');
const { expect } = require('chai');

const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
} = require('../utils/constants');
const { smock } = require('@defi-wonderland/smock');

describe('PriceResolver.sol - test/unit/PriceResolver.js', () => {
  let creator;
  let accountingSystem;
  let tokenA, tokenB;
  let priceResolver;

  beforeEach(async () => {
    [creator] = await ethers.getSigners();
    priceResolver = await (await smock.mock('MockPriceResolver', creator)).deploy();
    accountingSystem = await smock.fake('AccountingSystem');
    await priceResolver.setVariable('_accountingSystem', accountingSystem.address);

    tokenA = await smock.fake('TokenA');
    tokenB = await smock.fake('TokenB');
  });

  describe('assetBaseCurrency()', function () {
    beforeEach(async () => {
      await priceResolver.setVariable('_baseCurrency', tokenA.address);
    });
    it('redirect call to accountingSystem correcly if accountingSystem support the pair', async function () {
      accountingSystem.isSupportedPair.returns(true);
      await priceResolver.assetBaseCurrencyPrice(tokenB.address, parseEther('1'));
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountingSystem.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });
    it('redirect call to accountingSystem correcly if accountingSystem not support the pair', async function () {
      accountingSystem.isSupportedPair.returns(false);
      await expect(priceResolver.assetBaseCurrencyPrice(tokenB.address, parseEther('1'))).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountingSystem.assetPrice).to.have.callCount(0);
    });
  });

  describe('assetPrice()', function () {
    it('redirect call to accountingSystem correcly if accountingSystem support the pair', async function () {
      accountingSystem.isSupportedPair.returns(true);
      await priceResolver.assetPrice(tokenB.address, tokenA.address, parseEther('1'));
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountingSystem.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });
    it('redirect call to accountingSystem correcly if accountingSystem not support the pair', async function () {
      accountingSystem.isSupportedPair.returns(false);
      await expect(priceResolver.assetPrice(tokenB.address, tokenA.address, parseEther('1'))).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountingSystem.assetPrice).to.have.callCount(0);
    });
  });

  describe('baseCurrencyDecimals()', function () {
    it('returns the correct value if base currency = Eth', async function () {
      await priceResolver.setVariable('_baseCurrency', ADDRESS_ETH);
      expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(18);
    });

    it('returns the correct value if base currency = ERC 20 token', async function () {
      await priceResolver.setVariable('_baseCurrency', tokenA.address);
      await tokenA.decimals.returns(5);
      expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(5);
    });
  });

  describe('canResolvePrice()', function () {
    beforeEach(async () => {
      await priceResolver.setVariable('_baseCurrency', tokenA.address);
    });
    it('redirect call to accountingSystem correcly if accountingSystem support the pair', async function () {
      accountingSystem.isSupportedPair.returns(true);
      await priceResolver.canResolvePrice(tokenB.address);
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
    });
  });
});