const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens, createPriceGateways, createBudgetApprovals } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', function () {
  let adam, tokenA, tokenB;
  let creator, daoMember;
  let budgetApprovalAddresses;
  let priceGatewayAddresses, ethereumChainlinkPriceGateway, arbitrumChainlinkPriceGateway, dao, feedRegistry;
  let tokenBEthAggregator, tokenAEthAggregator;

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
    ({ tokenA, tokenB } = await createTokens());

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    const MockAggregatorV3 = await ethers.getContractFactory('MockAggregatorV3', { signer: creator });

    await tokenA.mint(daoMember.address, ethers.utils.parseEther('100'));
    tokenAEthAggregator = await MockAggregatorV3.deploy();
    tokenAEthAggregator.setPrice(ethers.utils.parseEther('0.25'));
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, ethers.utils.parseEther('0.25'));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, tokenAEthAggregator.address);

    await tokenB.mint(daoMember.address, ethers.utils.parseEther('100'));
    tokenBEthAggregator = await MockAggregatorV3.deploy();
    tokenBEthAggregator.setPrice(ethers.utils.parseEther('0.25'));
    await feedRegistry.setPrice(tokenB.address, ADDRESS_ETH, ethers.utils.parseEther('0.25'));
    await feedRegistry.setDecimal(tokenB.address, ADDRESS_ETH, 18);
    await feedRegistry.setAggregator(tokenB.address, ADDRESS_ETH, tokenBEthAggregator.address);

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
      // deposit ETH
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('0.5'));
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('0.5') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('1'));
      // deposit Token A
      await (tokenA.connect(daoMember)).approve(liquidPool.address, ethers.utils.parseEther('100'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('2'));
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('1.5'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('2'));
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('2'));

      // after someone send ETH to the Pool
      await daoMember.sendTransaction({
        to: liquidPool.address,
        value: ethers.utils.parseEther('2'),
      });
      await (liquidPool.connect(daoMember)).deposit(daoMember.address, { value: ethers.utils.parseEther('1') });
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('2.5'));

      // after someone send Token A to the Pool
      await (tokenA.connect(daoMember)).transfer(liquidPool.address, ethers.utils.parseEther('20'));
      await (liquidPool.connect(daoMember)).depositToken(daoMember.address, tokenA.address, ethers.utils.parseEther('40'));
      expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(ethers.utils.parseEther('5'));
    });
  });
});
