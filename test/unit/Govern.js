const { expect } = require("chai");
const { ethers, waffle, network } = require('hardhat');
const { createTokens, createAdam } = require('../utils/createContract');

describe('Testing Govern', function() {
    let adam, dao, governFactory;
    let creator, owner1, owner2, owner3;
    const provider = waffle.provider;
    let tokenA, tokenB;
    const category = {
        name: 'salary',
        duration: 6570, //1 day
        quorum: 1000, //10%
        passThreshold: 1000, //10%
        voteWights: [70, 30],
        voteTokens: [],
    }

    function createDao () {
        return adam.createDao('A Company', 'Description', 10000000, [13, 3000, 5000], [13, 3000, 5000], [13, 3000, 5000]);
      }

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();

        adam = await createAdam();
        await createDao();
        const daoAddr = await adam.daos(0);
        dao = await ethers.getContractAt('Dao', daoAddr);
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
        const res = await createTokens();
        tokenA = res.tokenA;
        tokenB = res.tokenB;
        category.voteTokens = [tokenA.address, tokenB.address];
    });

    describe('GovernFactory', function() {
        it('should create a govern & emit CreateGovern event', async function () {
            await expect(dao.createGovern(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                category.voteWights,
                category.voteTokens,
            )).to.emit(governFactory, 'CreateGovern');

            expect(await governFactory.governMap('salary')).to.be.exist;
        });
    });

    describe('Voting and executing proposals', function() {
        context('For one toke only', function() {
            it('should be able to propose a proposal and vote', async function() {
                await tokenA.mint(creator.address, 1);
                await tokenA.delegate(creator.address);
        
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
        
            it('should be able to propose a proposal, vote and execute', async function() {
                await tokenA.mint(creator.address, 1);
                await tokenA.delegate(creator.address);
        
                await dao.createGovern(
                    category.name,
                    39, //make it end soon
                    category.quorum,
                    category.passThreshold,
                    [1],
                    [tokenA.address],
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
        
                await hre.network.provider.send("hardhat_mine", ["0x1"]);
                expect(await govern.state(proposalId)).to.eq(1); //Active
        
                await govern.castVote(proposalId, 1);
                const hasVoted = await govern.hasVoted(proposalId, creator.address);
                expect(hasVoted).to.eq(true);
                expect(await govern.state(proposalId)).to.eq(1); //Active
                expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);
        
                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks
                expect(await govern.state(proposalId)).to.eq(4); //Success
        
                const descriptionHash = ethers.utils.id("Proposal #1: Transfer token");
        
                await expect(govern.execute(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    descriptionHash
                ));
        
                expect(await govern.state(proposalId)).to.eq(7); //Executed
                expect(await token.balanceOf(owner1.address)).to.eq(1000);
            });
        });

        context('For multiple tokens', function() {
            it('should use two tokens for voting and should success even weight higher vote against due to pass threshold', async function() {
                console.log("===current block number==", await ethers.provider.getBlockNumber());
                await tokenA.mint(creator.address, 1);
                await tokenB.mint(creator.address, 1);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);
        
                await dao.createGovern(
                    category.name,
                    39, //make it end soon
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
        
                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId,,,,,,snapshot,deadline] = event.args;
        
                console.log("===vote deadline=====", deadline);
        
                await govern.connect(owner1).castVote(proposalId, 0);
                await govern.connect(owner2).castVote(proposalId, 1)
                expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
                expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
        
                console.log("=====", await govern.getProposalVote(proposalId, 0));
                console.log("=====", await govern.getProposalVote(proposalId, 1));
        
                if (deadline > await ethers.provider.getBlockNumber()) {
                    await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks
                }
        
                console.log("===getVote====", await tokenA.balanceOf(owner1.address));
                console.log("===getVote====", await govern.getVotes(owner1.address, 19));
                console.log("===getVote====", await govern.getVotes(owner2.address, 19));
                console.log("===current block number==", await ethers.provider.getBlockNumber());
        
                expect(await govern.state(proposalId)).to.eq(4); //Success
            });

            it('should use two tokens for voting and should success if weight higher vote for', async function() {
                console.log("===current block number==", await ethers.provider.getBlockNumber());
                await tokenA.mint(creator.address, 1);
                await tokenB.mint(creator.address, 1);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);
        
                await dao.createGovern(
                    category.name,
                    39, //make it end soon
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
        
                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId,,,,,,snapshot,deadline] = event.args;
        
                console.log("===vote deadline=====", deadline);
        
                await govern.connect(owner1).castVote(proposalId, 1);
                await govern.connect(owner2).castVote(proposalId, 0)
                expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
                expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
        
                console.log("=====", await govern.getProposalVote(proposalId, 0));
                console.log("=====", await govern.getProposalVote(proposalId, 1));
        
                if (deadline > await ethers.provider.getBlockNumber()) {
                    await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks
                }
        
                console.log("===getVote====", await tokenA.balanceOf(owner1.address));
                console.log("===getVote====", await govern.getVotes(owner1.address, 19));
                console.log("===getVote====", await govern.getVotes(owner2.address, 19));
                console.log("===current block number==", await ethers.provider.getBlockNumber());

                expect(await govern.state(proposalId)).to.eq(4); //Success
            });
        });
    
        context('For voting with membership ERC721Vote tokens', function() {
            it('should success due to 10% pass threshold (1 against 1 for)', async function() {
                const membershipAddr = await dao.membership();
                const membership = await ethers.getContractAt('Membership', membershipAddr);

                await dao.createGovern(
                    category.name,
                    300,
                    category.quorum,
                    category.passThreshold,
                    [1],
                    [membershipAddr],
                );

                await dao.connect(owner1).deposit({ value: ethers.utils.parseEther("1") });
                await membership.connect(owner1).delegate(owner1.address);
    
                await dao.connect(owner2).deposit({ value: ethers.utils.parseEther("2") });
                await membership.connect(owner2).delegate(owner2.address);

                expect(await membership.getVotes(owner1.address)).to.eq(1);
                expect(await membership.getVotes(owner2.address)).to.eq(1);

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
        
                await govern.connect(owner1).castVote(proposalId, 0);
                await govern.connect(owner2).castVote(proposalId, 1);
                expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
                expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
                expect(await govern.state(proposalId)).to.eq(1); //Active
    
                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
                expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

                expect(await govern.quorumReached(proposalId)).to.eq(true);
                expect(await govern.voteSucceeded(proposalId)).to.eq(true);
                
                expect(await govern.state(proposalId)).to.eq(4); //Success    
            });

            it('should failed due to 51% pass threshold (1 against 1 for)', async function() {
                const membershipAddr = await dao.membership();
                const membership = await ethers.getContractAt('Membership', membershipAddr);

                await dao.createGovern(
                    category.name,
                    300,
                    category.quorum,
                    5100,
                    [1],
                    [membershipAddr],
                );
                
                await dao.connect(owner1).deposit({ value: ethers.utils.parseEther("1") });
                await membership.connect(owner1).delegate(owner1.address);
    
                await dao.connect(owner2).deposit({ value: ethers.utils.parseEther("2") });
                await membership.connect(owner2).delegate(owner2.address);

                expect(await membership.getVotes(owner1.address)).to.eq(1);
                expect(await membership.getVotes(owner2.address)).to.eq(1);

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
        
                await govern.connect(owner1).castVote(proposalId, 0);
                await govern.connect(owner2).castVote(proposalId, 1);
                expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
                expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
                expect(await govern.state(proposalId)).to.eq(1); //Active
    
                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
                expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

                expect(await govern.quorumReached(proposalId)).to.eq(true);
                expect(await govern.voteSucceeded(proposalId)).to.eq(false);
                
                expect(await govern.state(proposalId)).to.eq(3); //Defeated    
            });
        });
    });

    describe('Add vote token', function() {
        it('should be able to add token', async function() {
            await dao.createGovern(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                [1],
                [tokenA.address],
            );

            const governAddr = await governFactory.governMap(category.name);
            const govern = await ethers.getContractAt('Govern', governAddr);

            await expect(governFactory.addVoteToken(category.name, tokenB.address, 1)).to.emit(govern, 'AddVoteToken');
            expect(await govern.voteTokens(1)).to.eq(tokenB.address);
        });

        it('should not be able to add token', async function() {
            await dao.createGovern(
                category.name,
                category.duration,
                category.quorum,
                category.passThreshold,
                [1, 1],
                [tokenA.address, tokenB.address],
            );

            await expect(governFactory.addVoteToken(category.name, tokenB.address, 1)).to.be.revertedWith('Token already in list');
        });        
    });

    describe('Vote success func', function() {
        context('pass threshold is a factor & weight is not a factor', function() {
            it('should fail', async function() {
                const token = await ethers.getContractAt('TokenA', tokenA.address);
                const transferCalldata = token.interface.encodeFunctionData(
                    'mint', [owner1.address, 1000]
                );

                await dao.createGovern(
                    category.name,
                    200,
                    category.quorum,
                    5000, // 50%
                    [1, 1], // token A & B has same weight
                    category.voteTokens,
                );

                await tokenA.mint(creator.address, 6);
                await tokenB.mint(creator.address, 4);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);

                const governAddr = await governFactory.governMap('salary');
                const govern = await ethers.getContractAt('Govern', governAddr);

                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId] = event.args;

                await govern.connect(owner1).castVote(proposalId, 0); // Owner1 with 6 votes against
                await govern.connect(owner2).castVote(proposalId, 1); // Owner2 with 4 votes for

                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.voteSucceeded(proposalId)).to.eq(false); 
            });

            it('should success', async function() {
                const token = await ethers.getContractAt('TokenA', tokenA.address);
                const transferCalldata = token.interface.encodeFunctionData(
                    'mint', [owner1.address, 1000]
                );

                await dao.createGovern(
                    category.name,
                    200,
                    category.quorum,
                    5000, // 50%
                    [1, 1], // token A & B has same weight
                    category.voteTokens,
                );

                await tokenA.mint(creator.address, 4);
                await tokenB.mint(creator.address, 6);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);

                const governAddr = await governFactory.governMap('salary');
                const govern = await ethers.getContractAt('Govern', governAddr);

                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId] = event.args;

                await govern.connect(owner1).castVote(proposalId, 0); // Owner1 with 6 votes against
                await govern.connect(owner2).castVote(proposalId, 1); // Owner2 with 4 votes for

                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.voteSucceeded(proposalId)).to.eq(true); 
            });
        });
        
        context('weight & pass threshold are factors', function() {
            it('should fail', async function() {
                const token = await ethers.getContractAt('TokenA', tokenA.address);
                const transferCalldata = token.interface.encodeFunctionData(
                    'mint', [owner1.address, 1000]
                );

                await dao.createGovern(
                    category.name,
                    200,
                    category.quorum,
                    9000, // 90%
                    [40, 60], // token A & B has same weight
                    category.voteTokens,
                );

                await tokenA.mint(creator.address, 1);
                await tokenB.mint(creator.address, 1);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);

                const governAddr = await governFactory.governMap('salary');
                const govern = await ethers.getContractAt('Govern', governAddr);

                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId] = event.args;

                await govern.connect(owner1).castVote(proposalId, 0); // 1 vote against with token A = 40
                await govern.connect(owner2).castVote(proposalId, 1); // 1 vote for with token B = 60

                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.voteSucceeded(proposalId)).to.eq(false); // passthreshold is 90%, require for vote to be 90
            });

            it('should success', async function() {
                const token = await ethers.getContractAt('TokenA', tokenA.address);
                const transferCalldata = token.interface.encodeFunctionData(
                    'mint', [owner1.address, 1000]
                );

                await dao.createGovern(
                    category.name,
                    200,
                    category.quorum,
                    9000, // 90%
                    [40, 60], // token A & B has same weight
                    category.voteTokens,
                );

                await tokenA.mint(creator.address, 1);
                await tokenB.mint(creator.address, 1);
                
                await tokenA.delegate(owner1.address);
                await tokenB.delegate(owner2.address);


                const governAddr = await governFactory.governMap('salary');
                const govern = await ethers.getContractAt('Govern', governAddr);

                tx = await govern.propose(
                    [tokenA.address],
                    [0],
                    [transferCalldata],
                    "Proposal #1: Transfer token",
                );
                const rc = await tx.wait();
                const event = rc.events.find(event => event.event === 'ProposalCreated');
                const [proposalId] = event.args;

                // await govern.connect(owner1).castVote(proposalId, 0); // 1 vote against with token A = 40
                await govern.connect(owner2).castVote(proposalId, 1); // 1 vote for with token B = 60

                await hre.network.provider.send("hardhat_mine", ["0x100"]); //mine 256 blocks

                expect(await govern.voteSucceeded(proposalId)).to.eq(true); // passthreshold is 90%, require for vote to be 54 (60*0.9)
            });
        });
    });
});