const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens, createAdam, createBudgetApprovals, createFeedRegistry } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');

const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

describe('Govern.sol', function () {
  let adam, dao, governFactory, lp;
  let creator, owner1, owner2;
  let tokenA, feedRegistry, budgetApprovalAddresses;
  const category = {
    name: 'BudgetApproval',
    duration: 6570, // 1 day
    quorum: 1000, // 10%
    passThreshold: 1000, // 10%
    voteWights: [70, 30],
    voteTokens: [],
  };

  function createDao () {
    return adam.createDao(paramsStruct.getCreateDaoParams({ mintMemberToken: true }));
  }

  beforeEach(async function () {
    [creator, owner1, owner2] = await ethers.getSigners();
    const tokens = await createTokens();
    feedRegistry = await createFeedRegistry(tokens.tokenA, creator);
    budgetApprovalAddresses = await createBudgetApprovals(creator);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);
    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('MockDaoV2', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const governFactoryAddr = await dao.governFactory();
    governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
    const res = await createTokens();
    tokenA = res.tokenA;
  });

  describe('GovernFactory', function () {
    it('should create a govern & emit CreateGovern event', async function () {
      await expect(dao.createGovern(
        'salary',
        category.duration,
        category.quorum,
        category.passThreshold,
        [1],
        0, // membership,
      )).to.emit(governFactory, 'CreateGovern');

      expect(await governFactory.governMap(dao.address, 'General')).to.be.exist;
    });
  });

  describe('Voting and executing proposals', function () {
    context('For one toke only', function () {
      it('should be able to propose a proposal and vote', async function () {
        await dao.exposedTransferMemberToken(creator.address, 1);

        const governAddr = await governFactory.governMap(dao.address, 'General');
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
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');

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

        const governAddr = await governFactory.governMap(dao.address, 'General');
        const govern = await ethers.getContractAt('Govern', governAddr);
        await hre.network.provider.send('hardhat_mine', ['0x2']);
        expect(await mt.getPastVotes(creator.address, await ethers.provider.getBlockNumber() - 1)).to.eq(1);

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
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');

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
        const tx1 = await adam.createDao(paramsStruct.getCreateDaoParams({
          budgetApproval: [300, 1000, 1000, 0], // budgetApproval
          revokeBudgetApproval: [13, 3000, 5000, 0], // revokeBudgetApproval
          general: [13, 3000, 5000, 0], // general,
          daoSettingApproval: [13, 3000, 5000, 1], // daoSetting,
          mintMemberToken: true,
        }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());

        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await (lp.connect(owner1)).deposit({ value: ethers.utils.parseEther('1') });
        await (lp.connect(owner2)).deposit({ value: ethers.utils.parseEther('2') });
        expect(await membership.balanceOf(owner1.address)).to.eq(1);

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'General');
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
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');

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
        const tx1 = await adam.createDao(paramsStruct.getCreateDaoParams({
          generalGovernSetting: [300, 1000, 5100, 0],
          mintMemberToken: true,
        }),
        );

        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

        dao = await ethers.getContractAt('MockDaoV2', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);

        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await lp.connect(owner1).deposit({ value: ethers.utils.parseEther('1') });

        await lp.connect(owner2).deposit({ value: ethers.utils.parseEther('2') });

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'General');
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
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');

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
