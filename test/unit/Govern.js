const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');
const { ethers, waffle } = require('hardhat');
const { createAdam, createTokens } = require('../utils/createContract');
const { iteratee } = require("lodash");

describe('Govern', function() {
    let adam, dao, governFactory, govern;
    let creator, owner1, owner2, owner3;
    let tokenA;
    const provider = waffle.provider;

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();

        ({ tokenA } = await createTokens());
        adam = await createAdam();
        await adam.createDao('A Company', 'ACOM');
        const daoAddr = await adam.daos(0);
        dao = await ethers.getContractAt('Dao', daoAddr);
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
    });

    describe('add category in dao', function() {
        it('should add category', async function() {
            await expect(dao.createCategory(
                'Test',
                360,
                10,
                300,
                [20],
                [tokenA.address],
            )).emit(dao, 'CreateCategory');

            expect(await governFactory.governCategories(0)).to.be.eq('Test');
            expect(await governFactory.governCategoryMap('Test')).to.be.exists;
        });
    });

    describe('create govern in dao', function() {
        it('should create govern', async function() {
            await dao.createCategory(
                'Test',
                6570,
                1000,
                300,
                [20],
                [tokenA.address],
            )
            
            await expect(governFactory.createGovern('Test')).emit(dao, 'CreateGovern');

            expect(await governFactory.governMap('Test')).to.be.exists;
        });
    });
});