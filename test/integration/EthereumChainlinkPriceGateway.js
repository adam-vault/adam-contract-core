const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens, createPriceGateways, createBudgetApprovals } = require('../utils/createContract.js');

const { getCreateTransferLiquidErc20TokenBAParams, getCreateDaoParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_USD,
} = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', function () {
  let adam, tokenA;
  let creator, daoMember;
  let budgetApprovalAddresses;
  let priceGatewayAddresses, ethereumChainlinkPriceGateway, arbitrumChainlinkPriceGateway, dao;

  function createDao () {
    return adam.createDao(...getCreateDaoParams({
      name: 'A Company',
      priceGateways: [ethereumChainlinkPriceGateway],
      depositTokens: [ADDRESS_ETH, tokenA.address],
      baseCurrency: ADDRESS_ETH,
    }));
  };

  beforeEach(async function () {
    [creator, daoMember] = await ethers.getSigners();

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    const MockAggregatorV3 = await ethers.getContractFactory('MockAggregatorV3', { signer: creator });

    tokenA = await smock.fake('ERC20');
    const tokenAUsdAggregator = await MockAggregatorV3.deploy();
    tokenAUsdAggregator.setPrice(ethers.utils.parseUnits('0.25', 8));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_USD, ethers.utils.parseUnits('0.25', 8));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_USD, 18);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_USD, tokenAUsdAggregator.address);

    const ethUsdAggregator = await MockAggregatorV3.deploy();
    ethUsdAggregator.setPrice(ethers.utils.parseUnits('1000', 8));
    await feedRegistry.setPrice(ADDRESS_ETH, ADDRESS_USD, ethers.utils.parseUnits('1000', 8));
    await feedRegistry.setDecimal(ADDRESS_ETH, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(ADDRESS_ETH, ADDRESS_USD, ethUsdAggregator.address);

    priceGatewayAddresses = await createPriceGateways(creator);
    arbitrumChainlinkPriceGateway = priceGatewayAddresses[0];
    ethereumChainlinkPriceGateway = priceGatewayAddresses[1];

    budgetApprovalAddresses = await createBudgetApprovals(creator);

    adam = await createAdam({ budgetApprovalAddresses, priceGatewayAddresses });

    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
  });

  describe('CreateDao()', function () {
    it('creates Dao successfully with correct param', async function () {
      const accountSystem = await ethers.getContractAt('AccountSystem', await dao.accountSystem());
      expect(await accountSystem.priceGateways(ethereumChainlinkPriceGateway)).to.be.equal(true);
      expect(await accountSystem.priceGateways(arbitrumChainlinkPriceGateway)).to.be.equal(false);
      expect(await accountSystem.defaultPriceGateway()).to.be.equal(ethereumChainlinkPriceGateway);
    });
    it('creates Liquid successfully with correct param', async function () {
      const accountSystem = await ethers.getContractAt('AccountSystem', await dao.accountSystem());
      const liquidPool = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      expect(await liquidPool.accountSystem()).to.be.equal(accountSystem.address);
    });
  });

  describe('Deposit()', function () {
    it('creates mint correct amount of Liquid Pool token', async function () {
      const liquidPool = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('0.5'));
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('1'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('1'));
    });
  });
});
