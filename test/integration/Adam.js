const chai = require('chai');
const hre = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam, createTokens } = require('../utils/createContract');
const decodeBase64 = require('../utils/decodeBase64');
const paramsStruct = require('../../utils/paramsStruct');
chai.use(smock.matchers);
const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Create DAO', function () {
  let creator, owner1, owner2;
  let token;
  let feedRegistry;
  let adam;

  beforeEach(async function () {
    [creator, owner1, owner2] = await ethers.getSigners();
    const tokens = await createTokens();
    token = tokens.tokenA;

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    adam = await createAdam(feedRegistry);
  });

  function createDao () {
    return adam.createDao(paramsStruct.getCreateDaoParams({ name: 'A Company' }));
  };

  it('can create dao', async function () {
    await expect(createDao())
      .to.emit(adam, 'CreateDao');
  });

  it('can upgrade dao', async function () {
    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

    const MockDaoV2 = await ethers.getContractFactory('MockDaoV2');
    const mockDaoV2 = await MockDaoV2.deploy();
    await mockDaoV2.deployed();

    const dao = await ethers.getContractAt('Dao', daoAddr);
    await dao.upgradeTo(mockDaoV2.address);

    const daoUpgraded = await ethers.getContractAt('MockDaoV2', daoAddr);

    expect(await daoUpgraded.v2()).to.equal(true);
  });

  describe('Deposit ETH to DAO', function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('create Membership when deposit()', async function () {
      await lp.deposit({ value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('gives token uri with member address', async function () {
      const tx = await lp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await tx.wait();

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
    });

    it('should not recreate Member when deposit() again by same EOA', async function () {
      await lp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await lp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await lp.deposit({ value: ethers.utils.parseEther('0.000123') });

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });
  });

  describe('Deposit ETH to DP', function () {
    let dao, dp, membership;
    beforeEach(async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      dp = await ethers.getContractAt('DepositPool', await dao.depositPool());
    });

    it('create Membership when deposit()', async function () {
      await dp.deposit({ value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(await ethers.provider.getBalance(dp.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('gives token uri with member address', async function () {
      const tx = await dp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await tx.wait();

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
    });

    it('should not recreate Member when deposit() again by same EOA', async function () {
      await dp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await dp.deposit({ value: ethers.utils.parseEther('0.000123') });
      await dp.deposit({ value: ethers.utils.parseEther('0.000123') });

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(dp.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });
  });

  describe('Join Opt-in Pool', function () {
    let dao, dp, optInPool;
    beforeEach(async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      const membershipAddr = await dao.membership();
      await ethers.getContractAt('Membership', membershipAddr);
      dp = await ethers.getContractAt('DepositPool', await dao.depositPool());
      const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const team = await adam.team();
      const tx2 = await dao.createOptInPool(
        ADDRESS_ETH,
        ethers.utils.parseEther('1'),
        currentBlock.timestamp + 100,
        [ADDRESS_ETH],
        currentBlock.timestamp + 200,
        [],
        [],
        team,
      );
      const { optInPool: optInPoolAddr } = await findEventArgs(tx2, 'CreateOptInPool');
      optInPool = await ethers.getContractAt('OptInPool', optInPoolAddr);

      await dp.connect(owner1).deposit({ value: ethers.utils.parseEther('1') });
      await dp.connect(owner1).setApprovalForAll(optInPool.address, true);
      await dp.connect(owner2).deposit({ value: ethers.utils.parseEther('1') });
      await dp.connect(owner2).setApprovalForAll(optInPool.address, true);
    });

    it('allow client to join before deadline', async function () {
      await optInPool.connect(owner1).join(ethers.utils.parseEther('0.000123'));
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });
    it('allow client to refund after deadline', async function () {
      await optInPool.connect(owner1).join(ethers.utils.parseEther('0.000123'));
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('0.000123'));
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');
      await optInPool.connect(owner1).refund([owner1.address]);
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('0'));
    });
    it('allow client to redeem after pool executed', async function () {
      await optInPool.connect(owner1).join(ethers.utils.parseEther('1'));
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('1'));
      await ethers.provider.send('evm_increaseTime', [200]);
      await ethers.provider.send('evm_mine');
      await optInPool.connect(owner1).redeem([owner1.address]);
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('0'));
    });
    it('allow 2 client to redeem after pool executed', async function () {
      await optInPool.connect(owner1).join(ethers.utils.parseEther('1'));
      await optInPool.connect(owner2).join(ethers.utils.parseEther('1'));
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('2'));
      await ethers.provider.send('evm_increaseTime', [200]);
      await ethers.provider.send('evm_mine');
      await optInPool.connect(owner1).redeem([owner1.address, owner2.address]);
      expect(await ethers.provider.getBalance(optInPool.address)).to.equal(ethers.utils.parseEther('0'));
    });
  });

  describe('Redeem ETH from DAO', function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await adam.createDao(paramsStruct.getCreateDaoParams({
        lockTime: 1000,
        depositTokens: [ADDRESS_ETH, token.address], // depositTokens
      }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      await lp.deposit({ value: ethers.utils.parseEther('123') });
    });

    it('redeem and burn exact amount of eth', async function () {
      await hre.ethers.provider.send('evm_increaseTime', [1000]);
      await lp.redeem(ethers.utils.parseEther('3'));

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await lp.balanceOf(creator.address)).to.equal(ethers.utils.parseEther('120'));
    });
    it('cannot redeem and burn exact amount of eth inside lockup period', async function () {
      await expect(lp.redeem(ethers.utils.parseEther('3'))).to.be.revertedWith('lockup time');
    });
  });
});
