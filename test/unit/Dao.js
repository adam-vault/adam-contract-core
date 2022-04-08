const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createAdam, createTokens } = require('../utils/createContract.js');

describe('Testing Dao', function () {
  let adam, dao;

    describe('when do not create member token at dao creation', function() {
        beforeEach(async function() {
            adam = await createAdam();
            await adam.createDao([
                'A Company',  //_name
                'Description', //_description
                10000000, //_locktime
                false, //isCreateToken
                [13, 3000, 5000, 0], //budgetApproval
                [13, 3000, 5000, 0], //revokeBudgetApproval
                [13, 3000, 5000, 0], //general
                [13, 3000, 5000, 0], //daoSetting
                [], //tokenInfo
                0,
                0, // minDepositAmount
                0, // minMemberTokenToJoin
            ]);
            const daoAddr = await adam.daos(0);
            dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        });

  describe('when do not create member token at dao creation', function () {
    beforeEach(async function () {
      adam = await createAdam();
      await createDao(false, []);
      const daoAddr = await adam.daos(0);
      dao = await ethers.getContractAt('MockDaoV2', daoAddr);
    });

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
  });

    describe('when create member token at dao creation', function() {
        beforeEach(async function() {
            adam = await createAdam();
            await adam.createDao([
                'A Company',  //_name
                'Description', //_description
                10000000, //_locktime
                true, //isCreateToken
                [13, 3000, 5000, 0], //budgetApproval
                [13, 3000, 5000, 0], //revokeBudgetApproval
                [13, 3000, 5000, 0], //general
                [13, 3000, 5000, 1], //daoSetting
                ['name', 'symbol'], //tokenInfo
                100,
                0, // minDepositAmount
                0, // minMemberTokenToJoin
            ]);

            const daoAddr = await adam.daos(0);
            dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        });

    it('should not be able to call create member token', async function () {
      await expect(dao.exposedCreateMemberToken(['name1', 'symbol1'], 100)).to.revertedWith('Member token already initialized');
    });

    it('should minted member token', async function () {
      const memberTokenAddr = await dao.memberToken();
      const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);

      expect(await memberToken.balanceOf(dao.address)).to.eq(100);
    });
  });
});
