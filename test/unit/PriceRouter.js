const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const findEventArgs = require('../../utils/findEventArgs');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_WETH,
} = require('../utils/constants');

describe('PriceRouter.sol - test/unit/PriceRouter.js', function () {
  let signer, dao, mockDao;
  let PriceRouter, priceRouter, baseCurrency, asset, feedRegistry, notSupportedTokenA, notSupportedTokenB, generalGovern;

  beforeEach(async function () {
    [dao, signer, generalGovern] = await ethers.getSigners();
    PriceRouter = await ethers.getContractFactory('PriceRouter');
    baseCurrency = await smock.fake('TokenB');
    asset = await smock.fake('TokenA');
    notSupportedTokenA = await smock.fake('TokenA');
    notSupportedTokenB = await smock.fake('TokenB');
    mockDao = await smock.fake('Dao', { address: dao.address });
    mockDao.govern.whenCalledWith('General').returns(generalGovern.address);

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
      await expect(priceRouter.connect(signer).upgradeTo(mockV2Impl.address)).to.revertedWith('not dao');
    });
  });

  describe('assetBaseCurrencyPrice() - asset = baseCurrency', function () {
    it('returns amount if asset = baseCurrency', async function () {
      expect(await priceRouter.assetBaseCurrencyPrice(baseCurrency.address, 1000, baseCurrency.address)).eq(1000);
    });
  });

  describe('assetBaseCurrencyPrice() - Have Marked Price', function () {
    it('returns amount with most updated marked price', async function () {
      await expect(priceRouter.assetBaseCurrencyPrice(notSupportedTokenA.address, 1000, notSupportedTokenB.address)).to.be.reverted;
      // notSupportedTokenA : notSupportedTokenB = 1:1
      await priceRouter.connect(generalGovern).setMarkedPrice(notSupportedTokenA.address, notSupportedTokenB.address, ethers.utils.parseEther('1.124314'));
      expect(await priceRouter.assetBaseCurrencyPrice(notSupportedTokenA.address, 1000, notSupportedTokenB.address)).eq(1124);
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
      expect(await priceRouter.canResolvePrice(ADDRESS_WETH, ADDRESS_ETH)).eq(true);
      expect(await priceRouter.canResolvePrice(ADDRESS_ETH, ADDRESS_WETH)).eq(true);
    });
    it('returns true if asset can resolve price, baseCurrency = ETH / WETH', async function () {
      expect(await priceRouter.canResolvePrice(asset.address, ADDRESS_ETH)).eq(true);
    });
    it('returns true if baseCurrency can resolve price, asset = ETH / WETH', async function () {
      expect(await priceRouter.canResolvePrice(ADDRESS_ETH, asset.address)).eq(true);
    });
    it('returns true if asset = baseCurrency', async function () {
      expect(await priceRouter.canResolvePrice(asset.address, asset.address)).eq(true);
    });
    it('returns true if asset = baseCurrency', async function () {
      expect(await priceRouter.canResolvePrice(asset.address, baseCurrency.address)).eq(true);
    });
    it('returns false if asset cannot resolve price, baseCurrency = ETH / WETH', async function () {
      expect(await priceRouter.canResolvePrice(notSupportedTokenA.address, ADDRESS_ETH)).eq(false);
    });
    it('returns false if baseCurrency cannot resolve price, asset = ETH / WETH', async function () {
      expect(await priceRouter.canResolvePrice(ADDRESS_ETH, notSupportedTokenA.address)).eq(false);
    });
    it('returns true if price is set by govern', async function () {
      await priceRouter.connect(generalGovern).setMarkedPrice(notSupportedTokenA.address, ADDRESS_ETH, ethers.utils.parseEther('1'));
      expect(await priceRouter.canResolvePrice(notSupportedTokenA.address, ADDRESS_ETH)).eq(true);
    });
  });

  describe('ethAssetPrice()', function () { // most of the logic is covered in assetBaseCurrencyPrice() - asset = ETH/WETH
    it('returns amount directly if asset = ETH/WETH', async function () {
      expect(await priceRouter.ethAssetPrice(ADDRESS_WETH, 1000)).eq(1000);
      expect(await priceRouter.ethAssetPrice(ADDRESS_ETH, 1000)).eq(1000);
    });
  });

  describe('assetDecimals()', function () { // most of the logic is covered in assetBaseCurrencyPrice()
    it('returns baseCurrency for ETH and ERC20', async function () {
      expect(await priceRouter.assetDecimals(ADDRESS_ETH)).eq(18);
      asset.decimals.returns(12);
      expect(await priceRouter.assetDecimals(asset.address)).eq(12);
      asset.decimals.reverts('Something went wrong');
      expect(await priceRouter.assetDecimals(asset.address)).eq(0);
    });
  });

  describe('setMarkedPrice()', function () {
    it('Emits correct Marked Price info', async function () {
      const tx = await priceRouter.connect(generalGovern).setMarkedPrice(notSupportedTokenA.address, notSupportedTokenB.address, ethers.utils.parseEther('1.124314'));

      const { asset, baseCurrency, price } = await findEventArgs(tx, 'MarkedPriceSet');
      await expect(asset).to.equal(notSupportedTokenA.address);
      await expect(baseCurrency).to.equal(notSupportedTokenB.address);
      await expect(price).to.equal(ethers.utils.parseEther('1.124314'));
    });
  });
});
