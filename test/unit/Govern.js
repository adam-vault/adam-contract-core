const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');
const { ethers, waffle } = require('hardhat');
const { createTokens, createAdam } = require('../utils/createContract');
const { iteratee } = require("lodash");

describe('Testing Govern', function() {
    let adam, dao, governFactory;
    let creator, owner1, owner2, owner3;
    const provider = waffle.provider;
    const category = {
        name: 'salary',
        duration: 6570, //1 day
        quorum: 1000, //10%
        passThreshold: 1000, //10%
        voteWights: [1],
        voteTokens: [],
    }

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();

        adam = await createAdam();
        await adam.createDao('Test', 'Test');
        const daoAddr = await adam.daos(0);
        dao = await ethers.getContractAt('Dao', daoAddr);
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
        const { tokenA } = await createTokens();
        category.voteTokens = [tokenA.address];
    });

    describe('GovernFactory', function() {
        it('should create a category', async function () {
            await expect(dao.createCategory(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                category.voteWights,
                category.voteTokens,
            )).to.emit(governFactory, 'CreateCategory');

            expect(await governFactory.governCategories(0)).to.eq('salary');
            expect(await governFactory.governCategoryMap('salary')).to.be.exist;
        })
    });

    describe('GovernFactory', function() {
        it('should create a govern', async function () {
            await dao.createCategory(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                category.voteWights,
                category.voteTokens,
            );

            await expect(dao.createGovern('salary'))
            .to.emit(governFactory, 'CreateGovern');
        
            expect(await governFactory.governMap('salary')).to.be.exist;
        })
    });

    it('should be able to propose a proposal and vote', async function() {
        await dao.createCategory(
            category.name,
            category.duration,
            category.quorum,
            category.passThreshold,
            category.voteWights,
            category.voteTokens,
        );

        await dao.createGovern('salary');
        const governAddr = await governFactory.governMap('salary');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('ERC20', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
            'transfer', [owner1.address, 1000]
        );

        let tx = await govern.propose(
            [tokenA.address],
            [0],
            [transferCalldata],
            "Proposal #1: Transfer token",
        );
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        await govern.castVote(proposalId, 0);
        const hasVoted = await govern.hasVoted(proposalId, creator.address);
        expect(hasVoted).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); //Active

        const descriptionHash = ethers.utils.id("Proposal #1: Transfer token");

        await expect(govern.execute(
            [tokenA.address],
            [0],
            [transferCalldata],
            descriptionHash
        )).to.be.revertedWith('Governor: proposal not successful');
    });

    it.only('should be able to propose a proposal, vote and execute', async function() {
        await dao.createCategory(
            category.name,
            13, //make it end soon
            category.quorum,
            category.passThreshold,
            category.voteWights,
            category.voteTokens,
        );

        await dao.createGovern('salary');
        const governAddr = await governFactory.governMap('salary');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('TokenA', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
            'mint', [owner1.address, 1000]
        );

        let tx = await govern.propose(
            [tokenA.address],
            [0],
            [transferCalldata],
            "Proposal #1: Transfer token",
        );
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        await govern.castVote(proposalId, 0);
        const hasVoted = await govern.hasVoted(proposalId, creator.address);
        expect(hasVoted).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); //Active

        const descriptionHash = ethers.utils.id("Proposal #1: Transfer token");

        await expect(govern.execute(
            [tokenA.address],
            [0],
            [transferCalldata],
            descriptionHash
        ));

        expect(await govern.state(proposalId)).to.eq(7); //Active
        expect(await token.balanceOf(owner1.address)).to.eq(1000);
    });
});