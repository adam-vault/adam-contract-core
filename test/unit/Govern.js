const { expect } = require("chai");
const { ethers, waffle, network } = require('hardhat');
const { createTokens, createAdam } = require('../utils/createContract');

describe('Testing Govern', function() {
    let adam, dao, governFactory;
    let creator, owner1, owner2, owner3;
    const provider = waffle.provider;
    const category = {
        name: 'salary',
        duration: 6570, //1 day
        quorum: 10, //10%
        passThreshold: 10, //10%
        voteWights: [70, 30],
        voteTokens: [],
    }

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();

        adam = await createAdam();
        await adam.createDao('A Company', 'ACOM', 'Description', 10000000, [ethers.constants.AddressZero]);
        const daoAddr = await adam.daos(0);
        dao = await ethers.getContractAt('Dao', daoAddr);
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
        const { tokenA, tokenB } = await createTokens();
        category.voteTokens = [tokenA.address, tokenB.address];
    });

    describe('GovernFactory', function() {
        it('should create a category', async function () {
            await expect(dao.createGovern(
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
            await expect(dao.createGovern(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                category.voteWights,
                category.voteTokens,
            )).to.emit(governFactory, 'CreateGovern');
        
            expect(await governFactory.governMap('salary')).to.be.exist;
        })
    });

    it('should be able to propose a proposal and vote', async function() {
        await tokenA.setTotalSupply(1);
        await dao.createGovern(
            category.name,
            category.duration,
            category.quorum,
            category.passThreshold,
            category.voteWights,
            category.voteTokens,
        );

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

        await govern.castVote(proposalId, 1);
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

    it('should be able to propose a proposal, vote and execute', async function() {
        await tokenA.setTotalSupply(1);
        await dao.createGovern(
            category.name,
            13, //make it end soon
            category.quorum,
            category.passThreshold,
            category.voteWights,
            category.voteTokens,
        );

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

        await govern.castVote(proposalId, 1);
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

    // it.only('should use two tokens for voting and should fail if weight higher vote against', async function() {
    //     console.log("===current block number==", await ethers.provider.getBlockNumber());

    //     await tokenA.setTotalSupply(1);
    //     await tokenB.setTotalSupply(1);

    //     await tokenA.mint(owner1.address, 1);
    //     await tokenB.mint(owner2.address, 1);

    //     await dao.createGovern(
    //         category.name,
    //         39, //make it end soon
    //         category.quorum,
    //         category.passThreshold,
    //         category.voteWights,
    //         category.voteTokens,
    //     );

    //     const governAddr = await governFactory.governMap('salary');
    //     const govern = await ethers.getContractAt('Govern', governAddr);

    //     const token = await ethers.getContractAt('TokenA', tokenA.address);
    //     const transferCalldata = token.interface.encodeFunctionData(
    //         'mint', [owner1.address, 1000]
    //     );

    //     let tx = await govern.propose(
    //         [tokenA.address],
    //         [0],
    //         [transferCalldata],
    //         "Proposal #1: Transfer token",
    //     );
    //     const rc = await tx.wait();
    //     const event = rc.events.find(event => event.event === 'ProposalCreated');
    //     const [proposalId,,,,,,snapshot,deadline] = event.args;

    //     console.log("===vote deadline=====", deadline);

    //     await govern.connect(owner1).castVote(proposalId, 0);
    //     await govern.connect(owner2).castVote(proposalId, 1)
    //     expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
    //     expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);

    //     if (deadline > await ethers.provider.getBlockNumber()) {
    //         await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks
    //     }
        
    //     console.log("===current block number==", await ethers.provider.getBlockNumber());

    //     expect(await govern.state(proposalId)).to.eq(3); //Defeated
    // });
});