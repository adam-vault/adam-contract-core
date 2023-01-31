const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens, createPriceGateways, createBudgetApprovals } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_USD,
} = require('../utils/constants');

describe('Integration - Dao.sol to ArbitrumChainlinkPriceGateway.sol', async function () {
  let adam, tokenA;
  let creator, daoMember;
  let budgetApprovalAddresses;
  let priceGatewayAddresses, ethereumChainlinkPriceGateway, arbitrumChainlinkPriceGateway, dao;

  function createDao () {
    return adam.createDao(...getCreateDaoParams({
      name: 'A Company',
      priceGateways: [arbitrumChainlinkPriceGateway],
      depositTokens: [tokenA.address, ADDRESS_ETH],
      baseCurrency: ADDRESS_USD,
    }));
  };

  beforeEach(async function () {
    [creator, daoMember] = await ethers.getSigners();
    ({ tokenA } = await createTokens());

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    const MockAggregatorV3 = await ethers.getContractFactory('MockAggregatorV3', { signer: creator });

    await tokenA.mint(daoMember.address, ethers.utils.parseEther('100'));
    const tokenAUsdAggregator = await MockAggregatorV3.deploy();
    tokenAUsdAggregator.setPrice(ethers.utils.parseUnits('0.0025', 8));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_USD, ethers.utils.parseUnits('0.0025', 8));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_USD, tokenAUsdAggregator.address);

    const ethUsdAggregator = await MockAggregatorV3.deploy();
    ethUsdAggregator.setPrice(ethers.utils.parseUnits('0.000625', 8));
    await feedRegistry.setPrice(ADDRESS_ETH, ADDRESS_USD, ethers.utils.parseUnits('0.000625', 8));
    await feedRegistry.setDecimal(ADDRESS_ETH, ADDRESS_USD, 8);
    await feedRegistry.setAggregator(ADDRESS_ETH, ADDRESS_USD, ethUsdAggregator.address);

    const result = await createAdam();
    adam = result.adam;
    ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
    arbitrumChainlinkPriceGateway = result.arbPriceGateway.address;

    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
  });

  describe('CreateDao()', async function () {
    it('creates Dao successfully with correct param', async function () {
      const accountingSystem = await ethers.getContractAt('AccountingSystem', await dao.accountingSystem());
      expect(await accountingSystem.priceGateways(ethereumChainlinkPriceGateway)).to.be.equal(false);
      expect(await accountingSystem.priceGateways(arbitrumChainlinkPriceGateway)).to.be.equal(true);
      expect(await accountingSystem.defaultPriceGateway()).to.be.equal(arbitrumChainlinkPriceGateway);
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
      // deposit ETH
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.0003125', 8));
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.000625', 8)); // 0.000625 USD : 0.00625 LP Token

      // deposit Token A
      await (tokenA.connect(daoMember)).approve(liquidPool.address, ethers.utils.parseEther('100'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('1')); // 0.0025 USD
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.003125', 8)); // 0.003125 USD : 0.003125 LP Token
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('1'));
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.005625', 8)); // 0.005625 USD : 0.005625 LP Token

      // after someone send ETH to the Pool
      await daoMember.sendTransaction({
        to: liquidPool.address,
        value: ethers.utils.parseEther('2'), // 0.00125 USD   , 0.006875 USD : 0.005625 LP Token, 1.22222222222 USD per Token
      });

      expect(await liquidPool.totalPrice()).to.be.equal(ethers.utils.parseUnits('0.006875', 8));
      expect(await liquidPool.totalSupply()).to.be.equal(ethers.utils.parseUnits('0.005625', 8));
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('1') }); // 0.000625 USD
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.00613636', 8)); // 0.000511363636 + 0.005625

      // after someone send Token A to the Pool

      expect(await liquidPool.totalPrice()).to.be.equal(ethers.utils.parseUnits('0.0075', 8));
      expect(await liquidPool.totalSupply()).to.be.equal(ethers.utils.parseUnits('0.00613636', 8));
      await (tokenA.connect(daoMember)).transfer(liquidPool.address, ethers.utils.parseEther('20')); // 0.05 USD , 0.0575 USD : 0.00613636 LP Token, 9.37037592319 USD per Token

      expect(await liquidPool.totalPrice()).to.be.equal(ethers.utils.parseUnits('0.0575', 8));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('40')); // 0.1 USD
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseUnits('0.01680829', 8)); // 0.01067193043 + 0.00613636
    });
  });
});
