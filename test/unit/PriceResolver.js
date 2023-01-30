const { ethers } = require('hardhat');
const { expect } = require('chai');

const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
} = require('../utils/constants');
const { smock } = require('@defi-wonderland/smock');

describe('PriceResolver.sol - test/unit/PriceResolver.js', () => {
  let creator;
  let accountSystem;
  let tokenA, tokenB;
  let priceResolver;

  beforeEach(async () => {
    [creator] = await ethers.getSigners();
    priceResolver = await (await smock.mock('MockPriceResolver', creator)).deploy();
    accountSystem = await smock.fake('AccountSystem');
    await priceResolver.setAccountSystem(accountSystem.address);

    tokenA = await smock.fake('TokenA');
    tokenB = await smock.fake('TokenB');
  });

  describe('assetBaseCurrency()', async function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(tokenA.address);
    });
    it('redirect call to accountSystem correcly if accountSystem support the pair', async function () {
      accountSystem.isSupportedPair.returns(true);
      await priceResolver.assetBaseCurrencyPrice(tokenB.address, parseEther('1'));
      expect(accountSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountSystem.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });
    it('redirect call to accountSystem correcly if accountSystem not support the pair', async function () {
      accountSystem.isSupportedPair.returns(false);
      await expect(priceResolver.assetBaseCurrencyPrice(tokenB.address, parseEther('1'))).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
      expect(accountSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountSystem.assetPrice).to.have.callCount(0);
    });
  });

  describe('assetPrice()', function () {
    it('redirect call to accountSystem correcly if accountSystem support the pair', async function () {
      accountSystem.isSupportedPair.returns(true);
      await priceResolver.assetPrice(tokenB.address, tokenA.address, parseEther('1'));
      expect(accountSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountSystem.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });
    it('redirect call to accountSystem correcly if accountSystem not support the pair', async function () {
      accountSystem.isSupportedPair.returns(false);
      await expect(priceResolver.assetPrice(tokenB.address, tokenA.address, parseEther('1'))).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
      expect(accountSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
      expect(accountSystem.assetPrice).to.have.callCount(0);
    });
  });

  describe('baseCurrencyDecimals()', function () {
    it('returns the correct value if base currency = Eth', async function () {
      await priceResolver.setBaseCurrency(ADDRESS_ETH);
      expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(18);
    });

    it('returns the correct value if base currency = ERC 20 token', async function () {
      await priceResolver.setBaseCurrency(tokenA.address);
      await tokenA.decimals.returns(5);
      expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(5);
    });
  });

  describe('canResolvePrice()', function () {
    beforeEach(async () => {
      await priceResolver.setBaseCurrency(tokenA.address);
    });
    it('redirect call to accountSystem correcly if accountSystem support the pair', async function () {
      accountSystem.isSupportedPair.returns(true);
      await priceResolver.canResolvePrice(tokenB.address);
      expect(accountSystem.isSupportedPair).to.have.been.calledWith(tokenB.address, tokenA.address);
    });
  });
});
