const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');

describe('Integration - Govern.sol - test/integration/Govern.js', function () {
  let adam, dao, governFactory, lp;
  let creator, owner1, owner2;
  let tokenA, tokenC721, budgetApprovalAddresses;
  const category = {
    name: 'BudgetApproval',
    duration: 6570, // 1 day
    durationInBlock: 5, // appending 5 block on top of 1 day
    quorum: 1000, // 10%
    passThreshold: 1000, // 10%
    voteWights: [70, 30],
    voteTokens: [],
  };

  function createDao () {
    return adam.createDao(...paramsStruct.getCreateDaoParams({ mintMemberToken: true }));
  }

  beforeEach(async function () {
    [creator, owner1, owner2] = await ethers.getSigners();
    budgetApprovalAddresses = await createBudgetApprovals(creator);
    adam = await createAdam(budgetApprovalAddresses);
    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('MockDao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const governFactoryAddr = await dao.governFactory();
    governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
    const res = await createTokens();
    tokenA = res.tokenA;
    tokenC721 = res.tokenC721;
  });

  describe('GovernFactory', function () {
    it('creates a govern & emit CreateGovern event', async function () {
      await expect(dao.createGovern(
        'salary',
        category.duration,
        category.quorum,
        category.passThreshold,
        0, // membership,
        ethers.constants.AddressZero,
        category.durationInBlock,
      )).to.emit(governFactory, 'CreateGovern');

      expect(await governFactory.governMap(dao.address, 'General')).to.be.exist;
    });

    it('creates a govern success if token votable', async function () {
      await expect(governFactory.createGovern(
        'salary',
        category.duration,
        category.quorum,
        category.passThreshold,
        tokenA.address,
        category.durationInBlock,
      )).to.emit(governFactory, 'CreateGovern');

      expect(await governFactory.governMap(dao.address, 'General')).to.be.exist;
    });

    it('creates a govern fail if token not votable', async function () {
      await expect(governFactory.createGovern(
        'salary',
        category.duration,
        category.quorum,
        category.passThreshold,
        tokenC721.address,
        category.durationInBlock,
      )).to.be.revertedWith('Govern Token without voting function');
    });
  });

  describe('Voting and executing proposals', function () {
    context('For one toke only', function () {
      it('proposes a proposal and vote', async function () {
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
        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(0);
        expect(await govern.getProposalVote(proposalId, 2)).to.eq(0);

        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');

        await expect(govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash,
        )).to.be.revertedWith('Governor: proposal not successful');
      });

      it('proposes a proposal, vote and execute', async function () {
        await dao.exposedTransferMemberToken(creator.address, 1);
        const mt = await ethers.getContractAt('MemberToken', await dao.memberToken());
        expect(await mt.balanceOf(creator.address)).to.eq(1);

        const governAddr = await governFactory.governMap(dao.address, 'General');
        const govern = await ethers.getContractAt('Govern', governAddr);
        await ethers.provider.send('hardhat_mine', ['0x2']);
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

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
        expect(await govern.getProposalVote(proposalId, 0)).to.eq(0);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 2)).to.eq(0);

        await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        expect(await govern.state(proposalId)).to.eq(4); // Success

        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');
        await govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash);

        expect(await govern.state(proposalId)).to.eq(7); // Executed
        expect(await token.balanceOf(owner1.address)).to.eq(1000);
      });
    });

    context('For voting with membership ERC721Vote tokens', function () {
      it('success due to 10% pass threshold (1 against 1 for)', async function () {
        const tx1 = await adam.createDao(...paramsStruct.getCreateDaoParams({
          budgetApproval: [300, 1000, 1000, 0], // budgetApproval
          revokeBudgetApproval: [13, 3000, 5000, 0], // revokeBudgetApproval
          general: [13, 3000, 5000, 0], // general,
          daoSettingApproval: [13, 3000, 5000, 1], // daoSetting,
          mintMemberToken: true,
        }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());

        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);
        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await (lp.connect(owner1)).deposit(owner1.address, { value: ethers.utils.parseEther('1') });
        await (lp.connect(owner2)).deposit(owner2.address, { value: ethers.utils.parseEther('2') });
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

        await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

        expect(await govern.quorumReached(proposalId)).to.eq(true);
        expect(await govern.voteSucceeded(proposalId)).to.eq(true);

        expect(await govern.state(proposalId)).to.eq(4); // Success
      });

      it('fails due to 51% pass threshold (1 against 1 for)', async function () {
        const tx1 = await adam.createDao(...paramsStruct.getCreateDaoParams({
          generalGovernSetting: [300, 1000, 5100, 0, ethers.constants.AddressZero, 5],
          mintMemberToken: true,
        }),
        );

        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        const governFactoryAddr = await dao.governFactory();
        governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);

        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await lp.connect(owner1).deposit(owner1.address, { value: ethers.utils.parseEther('1') });

        await lp.connect(owner2).deposit(owner2.address, { value: ethers.utils.parseEther('2') });

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

        await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);

        expect(await govern.quorumReached(proposalId)).to.eq(true);
        expect(await govern.voteSucceeded(proposalId)).to.eq(false);

        expect(await govern.state(proposalId)).to.eq(3); // Defeated
      });
    });
  });

  it('return false in voteSucceeded if no one has voted', async function () {
    const tx1 = await adam.createDao(...paramsStruct.getCreateDaoParams({
      generalGovernSetting: [300, 1000, 5100, 0, ethers.constants.AddressZero, 5],
      mintMemberToken: true,
    }),
    );

    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

    dao = await ethers.getContractAt('MockDao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const governFactoryAddr = await dao.governFactory();
    governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);

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

    await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
    await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

    expect(await govern.voteSucceeded(proposalId)).to.eq(false);
  });

  it('counts quorum correctly', async function () {
    const tx1 = await adam.createDao(...paramsStruct.getCreateDaoParams({
      generalGovernSetting: [300, 1000, 4900, 0, ethers.constants.AddressZero, 5],
      mintMemberToken: true,
    }),
    );

    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

    dao = await ethers.getContractAt('MockDao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const governFactoryAddr = await dao.governFactory();
    governFactory = await ethers.getContractAt('GovernFactory', governFactoryAddr);

    await lp.connect(owner1).deposit(owner1.address, { value: ethers.utils.parseEther('1') });
    await lp.connect(owner2).deposit(owner2.address, { value: ethers.utils.parseEther('2') });

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
    await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
    await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);
    expect(await govern.quorumReached(proposalId)).to.eq(true);
  });
});
