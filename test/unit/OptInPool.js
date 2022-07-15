const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const ETH_TOKEN_ID = 1;
const FAKE_TOKEN_ID = 2;

describe('OptInPool.sol', function () {
  let dp, op, opAsSigner1, opAsSigner2;
  let creator;
  let signer1, signer2;
  let token, tokenAsSigner1, tokenAsSigner2;
  let feedRegistry, dao, memberToken;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', {
      signer: creator,
    });
    const MockDepositPool = await ethers.getContractFactory('MockDepositPool', {
      signer: creator,
    });

    const OptInPool = await ethers.getContractFactory('OptInPool', {
      signer: creator,
    });

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);

    dp = await MockDepositPool.deploy();
    token = await MockToken.deploy();

    await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0.0046'));
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ethers.constants.AddressZero);
    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    await dp.setId(ADDRESS_ETH, ETH_TOKEN_ID);
    await dp.setId(token.address, FAKE_TOKEN_ID);

    const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    op = await upgrades.deployProxy(
      OptInPool,
      [
        dp.address,
        ADDRESS_ETH,
        parseEther('100'),
        currentBlock.timestamp + 100,
        [token.address],
        currentBlock.timestamp + 200,
        [],
        [],
      ],
      { kind: 'uups' },
    );

    opAsSigner1 = op.connect(signer1);
    opAsSigner2 = op.connect(signer2);
    tokenAsSigner1 = token.connect(signer1);
    tokenAsSigner2 = token.connect(signer2);

    await ethers.provider.send('hardhat_setBalance', [
      signer1.address,
      parseEther('1000').toHexString(),
    ]);
    await ethers.provider.send('hardhat_setBalance', [
      signer2.address,
      parseEther('1000').toHexString(),
    ]);
  });

  describe('join()', function () {
    it('succeed if deadline not passed', async function () {
      await ethers.provider.send('evm_increaseTime', [50]);
      await ethers.provider.send('evm_mine');
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('10'));
      await dp.setApprovalForAll(op.address, true);
      await op.join(parseEther('10'));
      expect(await dp.balanceOf(creator.address, ETH_TOKEN_ID)).to.be.equal(0);
      expect(await op.balanceOf(creator.address)).to.be.equal(parseEther('10'));
    });
    it('fail if deadline passed', async function () {
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('10'));
      await dp.setApprovalForAll(op.address, true);
      await expect(op.join(parseEther('10'))).to.be.reverted;
    });
    it('fail if not enough balance', async function () {
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('5'));
      await dp.setApprovalForAll(op.address, true);
      await expect(op.join(parseEther('10'))).to.be.reverted;
    });
    it('fail if not approved', async function () {
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('10'));
      await expect(op.join(parseEther('10'))).to.be.reverted;
    });
  });

  describe('refund()', function () {
    beforeEach(async function () {
      await ethers.provider.send('evm_increaseTime', [50]);
      await ethers.provider.send('evm_mine');
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('10'));
      await dp.setApprovalForAll(op.address, true);
      await op.join(parseEther('10'));
      await creator.sendTransaction({ to: op.address, value: parseEther('100') });
    });
    it('succeed if deadline passed', async function () {
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await op.refund([creator.address]);
      expect(await op.balanceOf(creator.address)).to.be.equal(0);
    });
    it('succeed if someone else trigger refund for others', async function () {
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await opAsSigner1.refund([creator.address]);
      expect(await op.balanceOf(creator.address)).to.be.equal(0);
    });
    it('fail if deadline not passed', async function () {
      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await expect(op.refund([creator.address])).to.be.reverted;
    });
    it('fail if deadline passed, but threshold passed', async function () {
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('100'));
      await op.join(parseEther('100'));
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('100'));
      await expect(op.refund([creator.address])).to.be.reverted;
    });
  });
  describe('redeem()', function () {
    beforeEach(async function () {
      await ethers.provider.send('evm_increaseTime', [50]);
      await ethers.provider.send('evm_mine');
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('10'));
      await dp.setApprovalForAll(op.address, true);
      await op.join(parseEther('10'));
      await creator.sendTransaction({ to: op.address, value: parseEther('100') });
    });
    it('succeed if redeemTime passed', async function () {
      await ethers.provider.send('evm_increaseTime', [150]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await op.redeem([creator.address]);
      expect(await op.balanceOf(creator.address)).to.be.equal(0);
    });
    it('succeed if someone else trigger refund for others', async function () {
      await ethers.provider.send('evm_increaseTime', [150]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await opAsSigner1.redeem([creator.address]);
      expect(await op.balanceOf(creator.address)).to.be.equal(0);
    });
    it('fail if deadline not passed', async function () {
      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('10'));
      await expect(op.redeem([creator.address])).to.be.reverted;
    });
    it('fail if deadline passed but not yet redeemTime', async function () {
      await dp.mint(creator.address, ETH_TOKEN_ID, parseEther('100'));
      await op.join(parseEther('100'));
      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      await dp.mint(op.address, ETH_TOKEN_ID, parseEther('100'));
      await expect(op.redeem([creator.address])).to.be.reverted;
    });
  });
});
