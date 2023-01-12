const chai = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createAdam, createBudgetApprovals } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);


describe('Integration - Govern.sol - test/integration/Govern.js', function () {
  let adam, dao, lp;
  let creator, owner1, owner2;
  let tokenA, budgetApprovalAddresses;
  let memberToken;
  let ERC1967Proxy, impl, LiquidPool, MemberToken, govern;
  function createDao () {
    return adam.createDao(...paramsStruct.getCreateDaoParams({ mintMemberToken: true }));
  }

  before(async function() {
    ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');
    MemberToken = await ethers.getContractFactory('MemberToken');
    LiquidPool = await ethers.getContractFactory('LiquidPool');
  });
  beforeEach(async function () {
    [creator, owner1, owner2] = await ethers.getSigners();
    budgetApprovalAddresses = await createBudgetApprovals(creator);
    adam = await createAdam(budgetApprovalAddresses);
    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    // dao = await ethers.getContractAt('MockDao', daoAddr);
    // lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());

    dao = await (await smock.mock('Dao')).deploy();
    memberToken = await (await smock.mock('MemberToken')).deploy();
    lp = await (await smock.mock('LiquidPool')).deploy();
    govern = await (await smock.mock('Govern')).deploy();
    await govern.setVariable('voteToken', memberToken.address);
    await govern.setVariable('durationInBlock', 5);

    await dao.setVariable({
      plugins: {
        [ethers.utils.id('adam.dao.member_token')]: memberToken.address,
        [ethers.utils.id('adam.dao.liquidPool')]: lp.address,
      },
      isPlugins: {
        [memberToken.address]: true,
        [lp.address]: true,
      },
      govern: {
        General: govern.address,
      },
    });

    tokenA = await (await smock.mock('ERC20')).deploy('Name', 'Symbol');
  });

  describe('Voting and executing proposals', async function () {
    context('For one toke only', async function () {
      it('proposes a proposal and vote', async function () {
        memberToken.getPastVotes.returns(1);

        const transferCalldata = tokenA.interface.encodeFunctionData(
          'transfer', [owner1.address, 1000],
        );

        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');
        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');

        await ethers.provider.send('hardhat_mine', ['0x1']);
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        await govern.castVote(proposalId, 0);
        await ethers.provider.send('hardhat_mine', ['0x1']);

        expect(await govern.hasVoted(proposalId, creator.address)).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active
        expect(await govern.getProposalVote(proposalId, 0)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(0);
        expect(await govern.getProposalVote(proposalId, 2)).to.eq(0);
        await expect(govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash,
        )).to.be.revertedWith('Governor: proposal not successful');
      });

      it('proposes a proposal, vote and execute', async function () {
        memberToken.getPastVotes.returns(1);

        await tokenA.setVariable('_balances', {
          [govern.address]: 2000,
        });

        const transferCalldata = tokenA.interface.encodeFunctionData(
          'transfer', [owner1.address, 1000],
        );
        const tx = await govern.propose(
          [tokenA.address],
          [0],
          [transferCalldata],
          'Proposal #1: Transfer token',
        );
        const { proposalId } = await findEventArgs(tx, 'ProposalCreated');
        const descriptionHash = ethers.utils.id('Proposal #1: Transfer token');

        await govern.castVote(proposalId, 1);
        expect(await govern.hasVoted(proposalId, creator.address)).to.eq(true);
        expect(await govern.state(proposalId)).to.eq(1); // Active
        expect(await govern.getProposalVote(proposalId, 0)).to.eq(0);
        expect(await govern.getProposalVote(proposalId, 1)).to.eq(1);
        expect(await govern.getProposalVote(proposalId, 2)).to.eq(0);

        await ethers.provider.send('hardhat_mine', ['0x100']); // mine 256 blocks
        await ethers.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        expect(await govern.state(proposalId)).to.eq(4); // Success

        await govern.execute(
          [tokenA.address],
          [0],
          [transferCalldata],
          descriptionHash);

        expect(await govern.state(proposalId)).to.eq(7); // Executed
        expect(await tokenA.balanceOf(owner1.address)).to.eq(1000);
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

        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await (lp.connect(owner1)).deposit(owner1.address, { value: ethers.utils.parseEther('1') });
        await (lp.connect(owner2)).deposit(owner2.address, { value: ethers.utils.parseEther('2') });
        expect(await membership.balanceOf(owner1.address)).to.eq(1);

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await dao.govern('General');
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

        const membershipAddr = await dao.membership();
        const membership = await ethers.getContractAt('Membership', membershipAddr);

        await lp.connect(owner1).deposit(owner1.address, { value: ethers.utils.parseEther('1') });

        await lp.connect(owner2).deposit(owner2.address, { value: ethers.utils.parseEther('2') });

        expect(await membership.getVotes(owner1.address)).to.eq(1);
        expect(await membership.getVotes(owner2.address)).to.eq(1);

        const governAddr = await dao.govern('General');
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

    const governAddr = await dao.govern('General');
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

    await lp.connect(owner1).deposit(owner1.address, { value: ethers.utils.parseEther('1') });
    await lp.connect(owner2).deposit(owner2.address, { value: ethers.utils.parseEther('2') });

    const governAddr = await dao.govern('General');
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
