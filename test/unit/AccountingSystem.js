const { expect } = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { ethers, upgrades, testUtils } = require('hardhat');
const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
} = require('../utils/constants');

describe('AccountingSystem.sol', async function () {
  let creator, daoAsSigner;
  let dao, priceGateway1, priceGateway2, accountingSystem, priceGateway3;
  let tokenA, tokenB, notSupportedToken;
//   let ERC1967Proxy, accountingSystemImpl;

//   before(async () => {
//     ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');
//     accountingSystemImpl = await (await ethers.getContractFactory('AccountingSystem')).deploy();
//   });

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    dao = await smock.fake('Dao');
    priceGateway1 = await smock.fake('EthereumChainlinkPriceGateway');
    priceGateway2 = await smock.fake('EthereumChainlinkPriceGateway');
    priceGateway3 = await smock.fake('EthereumChainlinkPriceGateway');
    tokenA = await smock.fake('ERC20');
    tokenB = await smock.fake('ERC20');
    notSupportedToken = await smock.fake('ERC20');

    daoAsSigner = await testUtils.address.impersonate(dao.address);
    await testUtils.address.setBalance(dao.address, parseEther('1'));

    accountingSystem = await (await smock.mock('AccountingSystem')).deploy();
    await accountingSystem.setVariables({
      _owner: dao.address,
      defaultPriceGateway: priceGateway1.address,
      priceGateways: {
        [priceGateway1.address]: true,
      },
    });
  });

  describe('initialize', async () => {
    it('should initialize the contract and set the dao and price gateways correctly', async () => {
      expect(await accountingSystem.owner()).to.equal(dao.address);
      expect(await accountingSystem.defaultPriceGateway()).to.equal(priceGateway1.address);
      expect(await accountingSystem.priceGateways(priceGateway1.address)).to.be.true;
    });
    it('should fail if the contract is already initialized', async () => {
      await expect(accountingSystem.initialize(dao.address, [priceGateway1.address])).to.be.rejected;
    });
  });

  describe('addPriceGateway', async () => {
    it('add a price gateway to the whitelist', async () => {
      dao.canAddPriceGateway.returns(true);
      await accountingSystem.connect(daoAsSigner).addPriceGateway(priceGateway2.address);
      expect(await accountingSystem.priceGateways(priceGateway2.address)).to.be.true;
    });

    it('fail if the price gateway is already whitelisted', async () => {
      await expect(accountingSystem.addPriceGateway(priceGateway1.address)).to.be.rejected;
    });

    it('should fail if the sender is not the govern', async () => {
      await expect(accountingSystem.addPriceGateway(priceGateway3.address)).to.be.rejected;
    });
  });

  describe('setTokenPairPriceGatewayMap', async () => {
    it('should set the price gateway for the provided token pairs', async () => {
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountingSystem.connect(daoAsSigner).setTokenPairPriceGatewayMap([tokenA.address, tokenB.address], [tokenB.address, tokenA.address], priceGateway1.address);
      expect(await accountingSystem.tokenPairPriceGatewayMap(tokenA.address, tokenB.address)).to.equal(priceGateway1.address);
      expect(await accountingSystem.tokenPairPriceGatewayMap(tokenB.address, tokenA.address)).to.equal(priceGateway1.address);
    });

    it('should fail if the sender is not the dao', async () => {
      dao.byPassGovern.returns(false);
      await expect(accountingSystem.setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address)).to.be.reverted;
    });
  });

  describe('assetPrice', async () => {
    it('should redirect the function call to price Gateway', async () => {
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountingSystem.connect(daoAsSigner).setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address);

      await accountingSystem.assetPrice(tokenA.address, tokenB.address, parseEther('1'));
      expect(priceGateway1.assetPrice).to.have.been.calledWith(tokenA.address, tokenB.address, parseEther('1'));

      await accountingSystem.assetPrice(tokenB.address, tokenA.address, parseEther('1')); // fallback to default pricegateway
      expect(priceGateway1.assetPrice).to.have.been.calledWith(tokenB.address, tokenA.address, parseEther('1'));
    });

    it('reverts with "Not Supported Price Pair" when calls with not Supported token ', async () => {
      await expect(accountingSystem.assetPrice(notSupportedToken.address, ADDRESS_ETH, parseEther('1'))).to.be.revertedWith('Not Supported Price Pair');
    });
  });

  describe('isSupportedPair', async () => {
    it('should redirect the function call to price Gateway', async () => {
      priceGateway1.isSupportedPair.whenCalledWith(tokenA.address, tokenB.address).returns(true);
      priceGateway1.isSupportedPair.whenCalledWith(tokenB.address, tokenA.address).returns(true);
      await accountingSystem.connect(daoAsSigner).setTokenPairPriceGatewayMap([tokenA.address], [tokenB.address], priceGateway1.address);

      expect(await accountingSystem.isSupportedPair(tokenB.address, tokenA.address)).to.be.equal(true);// fallback to defaultPriceGateway

      expect(await accountingSystem.isSupportedPair(tokenA.address, tokenB.address)).to.be.equal(true);
      expect(priceGateway1.isSupportedPair).to.have.been.calledWith(tokenA.address, tokenB.address);
    });

    it('reverts with "Not Supported Price Pair" when calls with not Supported token ', async () => {
      expect(await accountingSystem.isSupportedPair(notSupportedToken.address, ADDRESS_ETH)).to.be.equal(false);
    });
  });
});