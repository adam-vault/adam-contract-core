
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', function () {
  let adam, tokenA;
  let creator, daoMember;
  let ethereumChainlinkPriceGateway, arbitrumChainlinkPriceGateway, dao;
  let SmockERC20;

  function createDao () {
    return adam.createDao(...getCreateDaoParams({
      name: 'A Company',
      priceGateways: [ethereumChainlinkPriceGateway],
      depositTokens: [ADDRESS_ETH, tokenA.address],
      baseCurrency: ADDRESS_ETH,
      creator: creator.address,
    }));
  };

  before(async function () {
    SmockERC20 = await smock.mock('ERC20');
  });

  beforeEach(async function () {
    [creator, daoMember] = await ethers.getSigners();

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    const MockAggregatorV3 = await ethers.getContractFactory('MockAggregatorV3', { signer: creator });

    tokenA = await SmockERC20.deploy('', '');
    const tokenAUsdAggregator = await MockAggregatorV3.deploy();
    tokenAUsdAggregator.setPrice(ethers.utils.parseUnits('0.25', 8));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, ethers.utils.parseUnits('0.25', 8));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, tokenAUsdAggregator.address);

    // const ethUsdAggregator = await MockAggregatorV3.deploy();
    // ethUsdAggregator.setPrice(ethers.utils.parseUnits('1000', 8));
    // await feedRegistry.setPrice(ADDRESS_ETH, ADDRESS_USD, ethers.utils.parseUnits('1000', 8));
    // await feedRegistry.setDecimal(ADDRESS_ETH, ADDRESS_USD, 8);
    // await feedRegistry.setAggregator(ADDRESS_ETH, ADDRESS_USD, ethUsdAggregator.address);

    const result = await createAdam();
    adam = result.adam;
    ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
    arbitrumChainlinkPriceGateway = result.arbPriceGateway.address;

    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
  });

  describe('CreateDao()', function () {
    it('creates Dao successfully with correct param', async function () {
      const accountingSystem = await ethers.getContractAt('AccountingSystem', await dao.accountingSystem());
      expect(await accountingSystem.priceGateways(ethereumChainlinkPriceGateway)).to.be.equal(true);
      expect(await accountingSystem.priceGateways(arbitrumChainlinkPriceGateway)).to.be.equal(false);
      expect(await accountingSystem.defaultPriceGateway()).to.be.equal(ethereumChainlinkPriceGateway);
    });
    it('creates Liquid successfully with correct param', async function () {
      const accountingSystem = await ethers.getContractAt('AccountingSystem', await dao.accountingSystem());
      const liquidPool = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      expect(await liquidPool.accountingSystem()).to.be.equal(accountingSystem.address);
    });
  });

  describe('Deposit()', async function () {
    it('creates mint correct amount of Liquid Pool token', async function () {
      const liquidPool = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('0.5'));
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('1'));

      await tokenA.setVariable('_balances', { [daoMember.address]: ethers.utils.parseEther('1') });
      await tokenA.connect(daoMember).approve(liquidPool.address, ethers.utils.parseEther('1'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('1'));
    });
  });
});
