const { expect } = require('chai');
const { ethers, waffle, network } = require('hardhat');
const { createTokens, createAdam } = require('../utils/createContract');

describe('Testing Govern', function () {
  let adam, dao, governFactory;
  let creator, owner1, owner2, owner3;
  const provider = waffle.provider;
  let tokenA, tokenB;
  const category = {
    name: 'salary',
    duration: 6570, // 1 day
    quorum: 1000, // 10%
    passThreshold: 1000, // 10%
    voteWights: [70, 30],
    voteTokens: [],
  };

  function createDao () {
    return adam.createDao(
      [
        'A Company', // _name
        'Description', // _description
        10000000, // _locktime
        true, // isCreateToken
        [13, 3000, 5000, 0], // budgetApproval
        [13, 3000, 5000, 0], // revokeBudgetApproval
        [13, 3000, 5000, 0], // general,
        [13, 3000, 5000, 1], // daoSetting
        ['name', 'symbol'], // tokenInfo
        1,
      ],
    );
  }

  beforeEach(async function () {
    [creator, owner1, owner2, owner3] = await ethers.getSigners();
    adam = await createAdam();
    await createDao();
    const daoAddr = await adam.daos(0);
    dao = await ethers.getContractAt('MockDaoV2', daoAddr);
    const governFactoryAddr = await dao.governFactory();
    governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
    const res = await createTokens();
    tokenA = res.tokenA;
    tokenB = res.tokenB;
  });

  describe('GovernFactory', function () {
    it('should create a govern & emit CreateGovern event', async function () {
      await expect(dao.createGovern(
        category.name,
        category.duration,
        category.quorum,
        category.passThreshold,
        [1],
        0, // membership,
      )).to.emit(governFactory, 'CreateGovern');

      expect(await governFactory.governMap(dao.address, 'salary')).to.be.exist;
    });
  });

  describe('Voting and executing proposals', function () {
    context('For one toke only', function () {
      it('should be able to propose a proposal and vote', async function () {
        await dao.exposedTransferMemberToken(creator.address, 1);

        const governAddr = await governFactory.governMap(dao.address, 'BudgetApproval');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('ERC20', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
          'transfer', [owner1.address, 1000],
        );

        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        await govern.castVote(proposalId, 0);
        const hasVoted = await govern.hasVoted(proposalId, creator.address);
        expect(hasVoted).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active

        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');

        await expect(govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash,
        )).to.be.revertedWith('Governor: proposal not successful');
      });

      it('should be able to propose a proposal, vote and execute', async function () {
        await dao.exposedTransferMemberToken(creator.address, 1);
        const MT = await dao.memberToken();
        const mt = await ethers.getContractAt('MemberToken', MT);
        expect(await mt.balanceOf(creator.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'BudgetApproval');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('TokenA', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
          'mint', [owner1.address, 1000],
        );

        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );

        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        // await hre.network.provider.send("hardhat_mine", ["0x2"]);
        // expect(await govern.state(proposalId)).to.eq(1); //Active

        await govern.castVote(proposalId, 1);
        const hasVoted = await govern.hasVoted(proposalId, creator.address);
        expect(hasVoted).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

        await hre.network.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
        expect(await govern.state(proposalId)).to.eq(4); // Success

        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');

        await expect(govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash,
        ));

        expect(await govern.state(proposalId)).to.eq(7); // Executed
        expect(await token.balanceOf(owner1.address)).to.eq(1000);
      });
    });

    context('For voting with membership ERC721Vote tokens', function () {
      it('should success due to 10% pass threshold (1 against 1 for)', async function () {
        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await dao.createGovern(
          category.name,
          300,
          category.quorum,
          category.passThreshold,
          [1],
          0,
        );

        await dao.connect(owner1).deposit({ value: ethers.utils.parseEther('1') });
        await dao.connect(owner2).deposit({ value: ethers.utils.parseEther('2') });

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'salary');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('ERC20', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
          'transfer', [owner1.address, 1000],
        );

        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        await govern.connect(owner1).castVote(proposalId, 0);
        await govern.connect(owner2).castVote(proposalId, 1);
        expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
        expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active

        await hre.network.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks

        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

        expect(await govern.quorumReached(proposalId)).to.eq(true);
        expect(await govern.voteSucceeded(proposalId)).to.eq(true);

        expect(await govern.state(proposalId)).to.eq(4); // Success
      });

      it('should failed due to 51% pass threshold (1 against 1 for)', async function () {
        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await dao.createGovern(
          category.name,
          300,
          category.quorum,
          5100,
          [1],
          0,
        );

        await dao.connect(owner1).deposit({ value: ethers.utils.parseEther('1') });

        await dao.connect(owner2).deposit({ value: ethers.utils.parseEther('2') });

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'salary');
        const govern = await ethers.getContractAt('Govern', governAddr);

        const token = await ethers.getContractAt('ERC20', tokenA.address);
        const transferCalldata = token.interface.encodeFunctionData(
          'transfer', [owner1.address, 1000],
        );

        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'ProposalCreated');
        const [proposalId] = event.args;

        await govern.connect(owner1).castVote(proposalId, 0);
        await govern.connect(owner2).castVote(proposalId, 1);
        expect(await govern.hasVoted(proposalId, owner1.address)).to.eq(true);
        expect(await govern.hasVoted(proposalId, owner2.address)).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active

        await hre.network.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks

        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

        expect(await govern.quorumReached(proposalId)).to.eq(true);
        expect(await govern.voteSucceeded(proposalId)).to.eq(false);

        expect(await govern.state(proposalId)).to.eq(3); // Defeated
      });
    });
  });
});
