const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const _ = require('lodash');
const findEventArgs = require('../../utils/findEventArgs');
const decodeBase64 = require('../utils/decodeBase64');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens } = require('../utils/createContract.js');
const paramsStruct = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_UNISWAP_ROUTER,
  ADDRESS_WETH,
} = require('../utils/constants');

describe('Integration - LiquidPool.sol', function () {
  let adam, dao, membership, tokenC721, tokenA, tokenD1155, uniswapRouter;
  let creator, member, anyone, feedRegistry;

  function createDao () {
    return adam.createDao(paramsStruct.getCreateDaoParams({ name: 'A Company' }));
  };

  beforeEach(async function () {
    [creator, member, anyone] = await ethers.getSigners();
    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    adam = await createAdam();
  });

  context('when deposit() called', async function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('creates Membership', async function () {
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('resolves token uri with member address', async function () {
      const tx = await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await tx.wait();

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
    });

    it('should not recreate Member when deposit() again', async function () {
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });

    context('when has no member token', async function () {
      let memberTokenImpl;
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            mintMemberToken: false,
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        memberTokenImpl = await adam.memberTokenImplementation();
      });

      // TODO: move to unit test
      // it('ables to creates member token again', async function () {
      //   expect(await dao.memberToken()).to.eq(ethers.constants.AddressZero);
      //   await dao.exposedCreateMemberToken(memberTokenImpl, ['name', 'symbol'], 100);
      //   const memberTokenAddr = await dao.memberToken();
      //   const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);
      //   expect(memberTokenAddr).not.to.eq(ethers.constants.AddressZero);
      //   expect(await memberToken.name()).to.eq('name');
      //   expect(await memberToken.symbol()).to.eq('symbol');
      //   expect(await dao.memberToken()).to.eq(memberTokenAddr);
      //   expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      // });

      // it('throw "Member token already initialized" error when create member token twice', async function () {
      //   await dao.exposedCreateMemberToken(memberTokenImpl, ['name', 'symbol'], 100);
      //   await expect(dao.exposedCreateMemberToken(memberTokenImpl, ['name1', 'symbol1'], 100)).to.revertedWith('Member token already initialized');
      // });

      // it('should revert if tokenInfo.length < 2', async function () {
      //   await expect(dao.exposedCreateMemberToken(memberTokenImpl, ['name1'], 100)).to.revertedWith('Insufficient info to create member token');
      // });

      it('allows owner to call deposit()', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.deposit(creator.address, { value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });

      it('allows anyone to call deposit()', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.connect(anyone).deposit(anyone.address, { value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });
    });

    context('when using ERC721 Admission token', async function () {
      let memberTokenImpl;

      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenC721.address, 1, 0, false]],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        memberTokenImpl = await adam.memberTokenImplementation();
      });

      it('allows EOA to deposit successfully with enough ERC721 Admission Token', async function () {
        await tokenC721.mint(member.getAddress(), 1);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('throws "Admission token not enough" error with not enough ERC721 Admission Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    context('when using ERC20 Admission token', async function () {
      let memberTokenImpl;
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenA.address, 1, 0, false]],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        memberTokenImpl = await adam.memberTokenImplementation();
      });

      // TODO: Move to unit test
      // it('should be able to create member token', async function () {
      //   await expect(dao.exposedCreateMemberToken(memberTokenImpl, ['name1', 'symbol1'], 100));
      //   const memberTokenAddr = await dao.memberToken();
      //   const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);

      //   await expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      // });

      it('allows EOA to deposit successfully with enough ERC20 Admission Token', async function () {
        await tokenA.mint(member.getAddress(), 1);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('throws "Admission token not enough" error with not enough ERC20 Admission Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    context('when using ERC1155 Admission token', async function () {
      beforeEach(async function () {
        ({ tokenD1155 } = await createTokens());
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenD1155.address, 1, 0, false]],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with enough ERC1155 Member Token', async function () {
        await tokenD1155.mint(member.address, 0, 1, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
      });

      it('throws "Admission token not enough" error with not enough ERC1155 Member Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    describe('when using ERC20 member token as Admission token', function () {
      let memberTokenImpl;
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            mintMemberToken: true,
            admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
          }),
        );

        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        memberTokenImpl = await adam.memberTokenImplementation();
      });

      // TODO: move to Dao creation
      // it('should minted member token', async function () {
      //   const memberTokenAddr = await dao.memberToken();
      //   const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);

      //   expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      // });
      it('allows EOA to deposit successfully with enough ERC20 Member Token', async function () {
        await dao.exposedTransferMemberToken(creator.address, 100);
        await lp.deposit(creator.address, { value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('throws "Admission token not enough" error with not enough ERC20 Member Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    context('when using mutiple ERC20 and 721 Admission Token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [tokenC721.address, 1, 0, false],
              [tokenA.address, 2, 0, false],
              [tokenD1155.address, 2, 111, false],
            ],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with both admission tokens enough', async function () {
        await tokenA.mint(member.address, 2);
        await tokenC721.mint(member.address, 222);
        await tokenD1155.mint(member.address, 111, 2, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
      });

      it('throws "Admission token not enough" error with both admission tokens not enough', async function () {
        await tokenA.mint(member.address, 1);
        await tokenD1155.mint(member.address, 111, 1, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });

      it('throws "Admission token not enough" error with two admission token not enough', async function () {
        await tokenC721.mint(member.address, 222);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });

      it('throws "Admission token not enough" error with one admission token not enough', async function () {
        await tokenC721.mint(member.address, 222);
        await tokenD1155.mint(member.address, 111, 2, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    context('when using non valid Admission Token', async function () {
      beforeEach(async function () {
        const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
        const nonERC20Contract = await MockUpgrade.deploy();

        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [nonERC20Contract.address, 1, 0, false],
            ],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('throws "Admission token not enough" error when deposit', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
      });
    });

    context('when using non contract Admission Token', async function () {
      it('throws "Admission Token not support!" error', async function () {
        await expect(adam.createDao(
          paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [ethers.constants.AddressZero, 1, 0, false],
            ],
          }),
        )).to.be.revertedWith('Admission Token not Support!');
      });
    });

    context('when minDepositAmount is set', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            minDepositAmount: 50,
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with amount > minDepositAmount', async function () {
        await lp.deposit(creator.address, { value: 100 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(100);
      });

      it('throws "deposit amount not enough" error with amount < minDepositAmount', async function () { // todo: need to create another test case for non DAO creator
        await expect(lp.deposit(creator.address, { value: 1 })).to.revertedWith('deposit amount not enough');
      });
    });

    context('when maxMemberLimit is set', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          paramsStruct.getCreateDaoParams({
            maxMemberLimit: 1,
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        membership = await ethers.getContractAt('Membership', await dao.membership());
      });

      it('allows EOA to deposit successfully when member limit not exceed', async function () { // todo: need to create another test case for non DAO creator
        await lp.deposit(creator.address, { value: 100 });
        expect(await membership.totalSupply()).to.equal(1);
      });

      it('throws "member count exceed limit" error when member limit exceed', async function () {
        await lp.deposit(creator.address, { value: 100 });
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.revertedWith('member count exceed limit');
      });
    });
  });

  context('when redeem() called', async function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await adam.createDao(paramsStruct.getCreateDaoParams({
        lockTime: 1000,
        depositTokens: [ADDRESS_ETH, tokenA.address], // depositTokens
      }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('123') });
    });

    it('redeems and burns exact amount of eth', async function () {
      await ethers.provider.send('evm_increaseTime', [1000]);
      await lp.redeem(ethers.utils.parseEther('3'));

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await lp.balanceOf(creator.address)).to.equal(ethers.utils.parseEther('120'));
    });
    it('cannot redeem and burn exact amount of eth inside lockup period', async function () {
      await expect(lp.redeem(ethers.utils.parseEther('3'))).to.be.revertedWith('lockup time');
    });
  });
});
