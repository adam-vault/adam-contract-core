const { expect } = require("chai");
const { ethers } = require('hardhat');
const { createAdam, createTokens } = require("../utils/createContract.js");

describe('Testing Dao', function() {
    let adam, dao;

    async function createDao(isCreateToken, tokenInfo) {
        return adam.createDao([
            'A Company',  //_name
            'Description', //_description
            10000000, //_locktime
            isCreateToken, //isCreateToken
            [13, 3000, 5000], //budgetApproval
            [13, 3000, 5000], //revokeBudgetApproval
            [13, 3000, 5000], //general
            tokenInfo //tokenInfo
        ]);
    }

    describe('when do not create member token at dao creation', function() {
        beforeEach(async function() {
            adam = await createAdam();
            await createDao(false, []);
            const daoAddr = await adam.daos(0);
            dao = await ethers.getContractAt('Dao', daoAddr);
        });


        it('should be able to call create member token', async function() {
            expect(await dao.memberToken()).to.eq(ethers.constants.AddressZero);
            await dao.createMemberToken(['name', 'symbol']);

            const memberTokenAddr = await dao.memberToken();
            const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);
            expect(memberTokenAddr).not.to.eq(ethers.constants.AddressZero);
            expect(await memberToken.name()).to.eq('name');
            expect(await memberToken.symbol()).to.eq('symbol');
            expect(await dao.memberToken()).to.eq(memberTokenAddr);
        });

        it('should not call create member token twice', async function() {
            await dao.createMemberToken(['name', 'symbol']);

            await expect(dao.createMemberToken(['name1', 'symbol1'])).to.revertedWith('Member token already initialized');
        });

        it('should revert if tokenInfo.length < 2', async function() {
            await expect(dao.createMemberToken(['name1'])).to.revertedWith('Insufficient info to create member token');
        });

        it('should emit event', async function() {
            await expect(dao.createMemberToken(['name', 'symbol'])).to.emit(dao, 'CreateMemberToken');
        });
    });

    describe('when create member token at dao creation', function() {
        beforeEach(async function() {
            adam = await createAdam();
            await createDao(true, ['name', 'symbol']);
            const daoAddr = await adam.daos(0);
            dao = await ethers.getContractAt('Dao', daoAddr);
        });

        it('should not be able to call create member token', async function() {
            await dao.createMemberToken(['name', 'symbol']);

            await expect(dao.createMemberToken(['name1', 'symbol1'])).to.revertedWith('Member token already initialized');
        });

        it('should emit event', async function() {
            await expect(dao.createMemberToken(['name', 'symbol'])).to.emit(dao, 'CreateMemberToken');
        });
    });
});
