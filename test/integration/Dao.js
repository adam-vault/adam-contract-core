const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const { createAdam, createTokens } = require('../utils/createContract.js');

describe('Integration - Dao', function () {
  let adam, dao, tokenC721, tokenA, lp;
  let creator, member;

  describe('when do not create member token at dao creation', function () {
    beforeEach(async function () {
      [creator, member] = await ethers.getSigners();
      adam = await createAdam();
      const tx1 = await adam.createDao([
        'A Company', // _name
        'Description', // _description
        10000000, // _locktime
        0, // MemberTokenType
        '0x0000000000000000000000000000000000000000', // memberToken
        [13, 3000, 5000, 0], // budgetApproval
        [13, 3000, 5000, 0], // revokeBudgetApproval
        [13, 3000, 5000, 0], // general
        [13, 3000, 5000, 0], // daoSetting
        [], // tokenInfo
        0,
        0, // minDepositAmount
        0, // minMemberTokenToJoin
        [],
      ]);
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      const daoAddr = creationEventLog.args.dao;
      dao = await ethers.getContractAt('MockDaoV2', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    describe('when do not create member token at dao creation', function () {
      it('should be able to call create member token', async function () {
        expect(await dao.memberToken()).to.eq(ethers.constants.AddressZero);
        await dao.exposedCreateMemberToken(['name', 'symbol'], 100);
        const memberTokenAddr = await dao.memberToken();
        const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);
        expect(memberTokenAddr).not.to.eq(ethers.constants.AddressZero);
        expect(await memberToken.name()).to.eq('name');
        expect(await memberToken.symbol()).to.eq('symbol');
        expect(await dao.memberToken()).to.eq(memberTokenAddr);
        expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      });

      it('should not call create member token twice', async function () {
        await dao.exposedCreateMemberToken(['name', 'symbol'], 100);

        await expect(dao.exposedCreateMemberToken(['name1', 'symbol1'], 100)).to.revertedWith('Member token already initialized');
      });

      it('should revert if tokenInfo.length < 2', async function () {
        await expect(dao.exposedCreateMemberToken(['name1'], 100)).to.revertedWith('Insufficient info to create member token');
      });

      it('owner should be able to deposit', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });

      it('new member should be able to deposit', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.connect(member).deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });
    });

    describe('when import 721 member token at dao creation', function () {
      beforeEach(async function () {
        adam = await createAdam();
        tokenC721 = (await createTokens()).tokenC721;
        const tx1 = await adam.createDao([
          'A Company', // _name
          'Description', // _description
          10000000, // _locktime
          2, // MemberTokenType
          tokenC721.address, // memberToken
          [13, 3000, 5000, 0], // budgetApproval
          [13, 3000, 5000, 0], // revokeBudgetApproval
          [13, 3000, 5000, 0], // general
          [13, 3000, 5000, 1], // daoSetting
          ['name', 'symbol'], // tokenInfo
          100,
          0, // minDepositAmount
          1, // minMemberTokenToJoin
          [],
        ]);
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('should not be able to call create member token', async function () {
        await expect(dao.exposedCreateMemberToken(['name1', 'symbol1'], 100)).to.revertedWith('Member token already initialized');
      });

      it('should not able to deposit when not enough minMemberTokenToJoin', async function () { // todo: need to create another test case for non DAO creator
        await lp.deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('should be able to deposit when enough minMemberTokenToJoin', async function () {
        await tokenC721.mint(creator.address);
        await lp.deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });
    });

    describe('when import Not 721 member token at dao creation', function () {
      beforeEach(async function () {
        adam = await createAdam();
        tokenA = (await createTokens()).tokenA;
      });

      it('should not able to create DAO with importing ERC 20 address', async function () {
        const initParaWithIncorrectAddress = [
          'A Company', // _name
          'Description', // _description
          10000000, // _locktime
          2, // MemberTokenType
          tokenA.address, // memberToken
          [13, 3000, 5000, 0], // budgetApproval
          [13, 3000, 5000, 0], // revokeBudgetApproval
          [13, 3000, 5000, 0], // general
          [13, 3000, 5000, 1], // daoSetting
          ['name', 'symbol'], // tokenInfo
          100,
          0, // minDepositAmount
          1, // minMemberTokenToJoin
          [],
        ];
        await expect(adam.createDao(initParaWithIncorrectAddress)).to.revertedWith('Not ERC 721 standard');
      });

      it('should not able to create DAO with importing zero address', async function () {
        const initParaWithIncorrectAddress = [
          'A Company', // _name
          'Description', // _description
          10000000, // _locktime
          2, // MemberTokenType
          ethers.constants.AddressZero, // memberToken
          [13, 3000, 5000, 0], // budgetApproval
          [13, 3000, 5000, 0], // revokeBudgetApproval
          [13, 3000, 5000, 0], // general
          [13, 3000, 5000, 1], // daoSetting
          ['name', 'symbol'], // tokenInfo
          100,
          0, // minDepositAmount
          1, // minMemberTokenToJoin
          [],
        ];
        await expect(adam.createDao(initParaWithIncorrectAddress)).to.revertedWith('');
      });
    });

    describe('when create ERC20 member token at dao creation', function () {
      beforeEach(async function () {
        adam = await createAdam();
        const tx1 = await adam.createDao([
          'A Company', // _name
          'Description', // _description
          10000000, // _locktime
          1, // MemberTokenType
          '0x0000000000000000000000000000000000000000', // memberToken
          [13, 3000, 5000, 0], // budgetApproval
          [13, 3000, 5000, 0], // revokeBudgetApproval
          [13, 3000, 5000, 0], // general
          [13, 3000, 5000, 1], // daoSetting
          ['name', 'symbol'], // tokenInfo
          100,
          0, // minDepositAmount
          50, // minMemberTokenToJoin
          [],
        ]);

        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('should not be able to call create member token', async function () {
        await expect(dao.exposedCreateMemberToken(['name1', 'symbol1'], 100)).to.revertedWith('Member token already initialized');
      });

      it('should minted member token', async function () {
        const memberTokenAddr = await dao.memberToken();
        const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);

        expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      });

      it('should not able to deposit when not enough minMemberTokenToJoin', async function () { // todo: need to create another test case for non DAO creator
        await lp.deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('should be able to deposit when enough minMemberTokenToJoin', async function () {
        await dao.exposedTransferMemberToken(creator.address, 100);

        await lp.deposit({ value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });
    });

    describe('when set minDepositAmount at dao creation', function () {
      beforeEach(async function () {
        adam = await createAdam();
        const tx1 = await adam.createDao([
          'A Company', // _name
          'Description', // _description
          10000000, // _locktime
          1, // MemberTokenType
          '0x0000000000000000000000000000000000000000', // memberToken
          [13, 3000, 5000, 0], // budgetApproval
          [13, 3000, 5000, 0], // revokeBudgetApproval
          [13, 3000, 5000, 0], // general
          [13, 3000, 5000, 1], // daoSetting
          ['name', 'symbol'], // tokenInfo
          100,
          50, // minDepositAmount
          0, // minMemberTokenToJoin
          [],
        ]);
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('should not be able to deposit when not enough', async function () { // todo: need to create another test case for non DAO creator
        await expect(lp.deposit({ value: 1 })).to.revertedWith('deposit amount not enough');
      });

      it('should be able to deposit when enough', async function () {
        await lp.deposit({ value: 100 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(100);
      });
    });
  });
});