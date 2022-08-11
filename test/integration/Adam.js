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

    adam = await createAdam();
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
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('gives token uri with member address', async function () {
      const tx = await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await tx.wait();

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
    });

    it('should not recreate Member when deposit() again by same EOA', async function () {
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000369'));
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
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('123') });
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
