const { expect } = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { ethers, upgrades } = require('hardhat');
const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
} = require('../utils/constants');

describe('AccountSystem.sol', function () {
  let creator;
  let dao, priceGateway1, priceGateway2, accountSystem, priceGateway3;
  let tokenA, tokenB, notSupportedToken;

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    dao = await smock.fake('Dao');
    priceGateway1 = await smock.fake('EthereumChainlinkPriceGateway');
    priceGateway2 = await smock.fake('EthereumChainlinkPriceGateway');
    priceGateway3 = await smock.fake('EthereumChainlinkPriceGateway');
    tokenA = await smock.fake('ERC20');
    tokenB = await smock.fake('ERC20');
    notSupportedToken = await smock.fake('ERC20');

    const AccountSystem = await ethers.getContractFactory('AccountSystem', { signer: creator });
    accountSystem = await upgrades.deployProxy(AccountSystem, [dao.address, [priceGateway1.address]], { kind: 'uups' });
  });

  describe('initialize', () => {
    it('should initialize the contract and set the dao and price gateways correctly', async () => {
      expect(await accountSystem.dao()).to.equal(dao.address);
      expect(await accountSystem.defaultPriceGateway()).to.equal(priceGateway1.address);
      expect(await accountSystem.priceGateways(priceGateway1.address)).to.be.true;
    });
    it('should fail if the contract is already initialized', async () => {
      await expect(accountSystem.initialize(dao.address, [priceGateway1.address])).to.be.rejected;
    });
  });

  describe('addPriceGateway', () => {
    it('add a price gateway to the whitelist', async () => {
      dao.byPassGovern.returns(true);
      await accountSystem.addPriceGateway(priceGateway2.address);
      expect(await accountSystem.priceGateways(priceGateway2.address)).to.be.true;
    });

    it('fail if the price gateway is already whitelisted', async () => {
      dao.byPassGovern.returns(true);
      await expect(accountSystem.addPriceGateway(priceGateway1.address)).to.be.rejected;
    });

    it('should fail if the sender is not the govern', async () => {
      dao.byPassGovern.returns(false);
      await expect(accountSystem.addPriceGateway(priceGateway3.address)).to.be.rejected;
    });
  });

  describe('setTokenPairPriceGatewayMap', () => {
    it('should set the price gateway for the provided token pairs', async () => {
      dao.byPassGovern.returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountSystem.setTokenPairPriceGatewayMap([tokenA.address, tokenB.address], [tokenB.address, tokenA.address], priceGateway1.address);
      expect(await accountSystem.tokenPairPriceGatewayMap(tokenA.address, tokenB.address)).to.equal(priceGateway1.address);
      expect(await accountSystem.tokenPairPriceGatewayMap(tokenB.address, tokenA.address)).to.equal(priceGateway1.address);
    });

    it('should fail if the sender is not the govern', async () => {
      dao.byPassGovern.returns(false);
      await expect(accountSystem.setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address)).to.be.reverted;
    });
  });

  describe('assetPrice', () => {
    it('should redirect the function call to price Gateway', async () => {
      dao.byPassGovern.returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountSystem.setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address);

      await accountSystem.assetPrice(tokenA.address, tokenB.address, parseEther('1'));
      expect(priceGateway1.assetPrice).to.have.been.calledWith(tokenA.address, tokenB.address, parseEther('1'));

      await accountSystem.assetPrice(tokenB.address, tokenA.address, parseEther('1')); // fallback to default pricegateway
      expect(priceGateway1.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });

    it('reverts with "Not Supported Price Pair" when calls with not Supported token ', async () => {
      await expect(accountSystem.assetPrice(notSupportedToken.address, ADDRESS_ETH, parseEther('1'))).to.be.revertedWithCustomError(accountSystem, 'PairNotSupport');
    });
  });

  describe('isSupportedPair', () => {
    it('should redirect the function call to price Gateway', async () => {
      dao.byPassGovern.returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountSystem.setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address);

      expect(await accountSystem.isSupportedPair(tokenB.address, tokenA.address)).to.be.equal(true);// fallback to defaultPriceGateway

      expect(await accountSystem.isSupportedPair(tokenA.address, tokenB.address)).to.be.equal(true);
      expect(priceGateway1.isSupportedPair).to.have.been.calledWith(tokenA.address, tokenB.address);
    });

    it('reverts with "Not Supported Price Pair" when calls with not Supported token ', async () => {
      expect(await accountSystem.isSupportedPair(notSupportedToken.address, ADDRESS_ETH)).to.be.equal(false);
    });
  });
});
