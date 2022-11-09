const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_WETH,
} = require('../utils/constants');

describe('PriceRouter.sol - test/unit/PriceRouter.js', function () {
  let signer, dao;
  let PriceRouter, priceRouter, executee, baseCurrency, asset, feedRegistry;

  beforeEach(async function () {
    [dao, signer] = await ethers.getSigners();
    executee = await smock.fake('MockBudgetApprovalExecutee');
    PriceRouter = await ethers.getContractFactory('PriceRouter');
    baseCurrency = await smock.fake('TokenB');
    asset = await smock.fake('TokenA');

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);

    await feedRegistry.setAggregator(asset.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(asset.address, ADDRESS_ETH, ethers.utils.parseEther('1'));
    await feedRegistry.setDecimal(asset.address, ADDRESS_ETH, 18);

    await feedRegistry.setAggregator(baseCurrency.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(baseCurrency.address, ADDRESS_ETH, ethers.utils.parseEther('2'));
    await feedRegistry.setDecimal(baseCurrency.address, ADDRESS_ETH, 18);

    priceRouter = await upgrades.deployProxy(PriceRouter, [dao.address], { kind: 'uups', signer: dao });
  });

  describe('initialize()', function () {
    it('inits with correct dao address', async function () {
      const contract = await upgrades.deployProxy(PriceRouter, [dao.address], { kind: 'uups', signer: dao });
      expect(await contract.dao()).to.equal(dao.address);
    });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    beforeEach(async function () {
      const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
      mockV2Impl = await MockUpgrade.deploy();
      await mockV2Impl.deployed();
    });
    it('allows owner to upgrade', async function () {
      await priceRouter.connect(dao).upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', priceRouter.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "Not dao" error if upgrade by non dao', async function () {
      await expect(priceRouter.connect(signer).upgradeTo(mockV2Impl.address)).to.revertedWith('Not dao');
    });
  });

  describe('assetBaseCurrencyPrice() - asset = baseCurrency', function () {
    it('returns amount if asset = baseCurrency', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(baseCurrency.address, 1000, baseCurrency.address)).eq(1000);
    });
  });

  describe('assetBaseCurrencyPrice() - baseCurrency = ETH/WETH', function () {
    it('returns amount if baseCurrency = Denominations.ETH', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(baseCurrency.address, 1000, ADDRESS_ETH)).eq(ethers.utils.parseEther('2000'));
    });
    it('returns amount if baseCurrency = _WETH9', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(baseCurrency.address, 1000, ADDRESS_WETH)).eq(ethers.utils.parseEther('2000'));
    });
    it('returns 0 if FeedRegistry return 0 price', async function () {
      await feedRegistry.setPrice(baseCurrency.address, ADDRESS_ETH, ethers.utils.parseEther('0'));
      expect(await priceRouter.assetBaseCurrencyPrice(baseCurrency.address, 1000, ADDRESS_WETH)).eq(ethers.utils.parseEther('0'));
    });
    it('returns amount directly if asset is ETH/WETH', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_WETH, 1000, ADDRESS_WETH)).eq(1000);
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_ETH, 1000, ADDRESS_ETH)).eq(1000);
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_WETH, 1000, ADDRESS_ETH)).eq(1000);
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_ETH, 1000, ADDRESS_WETH)).eq(1000);
    });
  });

  describe('assetBaseCurrencyPrice() - asset = ETH/WETH', function () {
    it('returns amount if asset = Denominations.ETH', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_ETH, ethers.utils.parseEther('2000'), asset.address)).eq(2000);
    });
    it('returns amount if asset = _WETH9', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_WETH, ethers.utils.parseEther('1000'), asset.address)).eq(1000);
    });
    it('returns 0 if FeedRegistry return 0 price', async function () {
      await feedRegistry.setPrice(asset.address, ADDRESS_ETH, ethers.utils.parseEther('0'));
      expect(await priceRouter.assetBaseCurrencyPrice(ADDRESS_WETH, ethers.utils.parseEther('1000'), asset.address)).eq(0);
    });
  });

  describe('assetBaseCurrencyPrice() - cannot get from FeedRegistry directly', function () {
    it('returns amount if price cannot get from FeedRegistry directly', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(asset.address, 1000, baseCurrency.address)).eq(500);
    });

    it('returns 0 if FeedRegistry return 0 price', async function () {
      await feedRegistry.setPrice(asset.address, ADDRESS_ETH, ethers.utils.parseEther('0'));
      expect(await priceRouter.assetBaseCurrencyPrice(asset.address, 1000, baseCurrency.address)).eq(0);
    });
  });

  describe('canResolvePrice()', function () {
    it('returns true if ETH / WETH', async function () {
      expect(await priceRouter.canResolvePrice(ADDRESS_WETH)).eq(true);
      expect(await priceRouter.canResolvePrice(ADDRESS_ETH)).eq(true);
    });
    it('returns true if can resolver price', async function () {
      expect(await priceRouter.canResolvePrice(asset.address)).eq(true);
    });
    it('returns false if cannot resolver price', async function () {
      expect(await priceRouter.canResolvePrice(executee.address)).eq(false);
    });
  });

  describe('ethAssetPrice()', function () { // most of the logic is covered in assetBaseCurrencyPrice() - asset = ETH/WETH
    it('returns amount directly if asset = ETH/WETH', async function () {
      expect(await priceRouter.ethAssetPrice(ADDRESS_WETH, 1000)).eq(1000);
      expect(await priceRouter.ethAssetPrice(ADDRESS_ETH, 1000)).eq(1000);
    });
  });

  describe('baseCurrencyDecimals()', function () { // most of the logic is covered in assetBaseCurrencyPrice()
    it('returns baseCurrency for ETH and ERC20', async function () {
      expect(await priceRouter.baseCurrencyDecimals(ADDRESS_ETH)).eq(18);
      expect(await priceRouter.baseCurrencyDecimals(asset.address)).eq(0);
      asset.decimals.returns(12);
      expect(await priceRouter.baseCurrencyDecimals(asset.address)).eq(12);
    });
  });
});
