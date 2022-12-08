const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const { getCreateSelfClaimERC20BAParams } = require('../../utils/paramsStruct');

const abiCoder = ethers.utils.defaultAbiCoder;

describe.only('Integration - SelfClaimERC20BudgetApproval.sol - test/integration/SelfClaimERC20BudgetApproval.js', function () {
  let adam, dao, selfClaimERC20BAImplementation, budgetApproval, lp;
  let creator, receiver;
  let tokenA;
  let budgetApprovalAddresses;

  before(async function () {
    [creator, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    budgetApprovalAddresses = await createBudgetApprovals(creator);
    adam = await createAdam(budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      ...paramsStruct.getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const selfClaimERC20BAImplementationAddress = budgetApprovalAddresses[4];
    selfClaimERC20BAImplementation = await ethers.getContractAt('SelfClaimERC20BudgetApproval', selfClaimERC20BAImplementationAddress);
  });

  describe('On Liquid Pool', function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;

      const initData = selfClaimERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateSelfClaimERC20BAParams({
          executor: ethers.constants.AddressZero,
          executorTeamId: 0,
          approvers: [],
          approverTeamId: 0,
          minApproval: 0,
          text: 'SelfClaim ERC20 Budget Approval',
          transactionType: 'selfClaim',
          startTime,
          endTime,
          allowUnlimitedUsageCount: true,
          usageCount: 100,
          team: await adam.team(),
          toAddresses: [],
          token: tokenA.address,
          allowAllTokens: false,
          totalAmount: 100,
          fixClaimAmount: 1,
          allowAnyAmount: false,
        }),
      );

      const tx = await lp.createBudgetApprovals(
        [selfClaimERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('should able to self claim ERC20 Token', async function () {
      const originalLpBalance = await tokenA.balanceOf(lp.address);
      const originalReceiverBalance = await tokenA.balanceOf(tokenA.address);
      await tokenA.mint(lp.address, '100');
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address],
      );

      const deadline = Math.round(Date.now() / 1000) + 86400;
      const tx = await budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      expect((await budgetApproval.transactions(id)).status).to.eq(2);
      expect((await budgetApproval.transactions(id)).deadline).to.eq(deadline);
      expect(await tokenA.balanceOf(lp.address)).to.eq(ethers.BigNumber.from(originalLpBalance).add(99));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.BigNumber.from(originalReceiverBalance).add(1));
    });

    it('should not be able to self claim ERC20 Token twice', async function () {
      await tokenA.mint(lp.address, '100');
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address],
      );

      const deadline = Math.round(Date.now() / 1000) + 86400;
      await budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '');
      await expect(budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '')).to.be.revertedWith('Address already claimed');
    });
  });

  describe('On Treasury', function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = selfClaimERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateSelfClaimERC20BAParams({
          executor: ethers.constants.AddressZero,
          executorTeamId: 0,
          approvers: [],
          approverTeamId: 0,
          minApproval: 0,
          text: 'SelfClaim ERC20 Budget Approval',
          transactionType: 'selfClaim',
          startTime,
          endTime,
          allowUnlimitedUsageCount: true,
          usageCount: 100,
          team: await adam.team(),
          toAddresses: [],
          token: tokenA.address,
          allowAllTokens: false,
          totalAmount: 100,
          fixClaimAmount: 1,
          allowAnyAmount: false,
        }),
      );

      const tx = await dao.createBudgetApprovals(
        [selfClaimERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;

      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create self claim ERC 20 BA should success', async function () {
      expect(await dao.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('shoule be able to self claim ERC20 Token', async function () {
      const originalDaoBalance = await tokenA.balanceOf(dao.address);
      const originalReceiverBalance = await tokenA.balanceOf(receiver.address);
      await tokenA.mint(dao.address, '100');
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address],
      );

      const deadline = Math.round(Date.now() / 1000) + 86400;
      const tx = await budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      expect((await budgetApproval.transactions(id)).status).to.eq(2);
      expect((await budgetApproval.transactions(id)).deadline).to.eq(deadline);
      expect(await tokenA.balanceOf(dao.address)).to.eq(ethers.BigNumber.from(originalDaoBalance).add(99));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.BigNumber.from(originalReceiverBalance).add(1));
    });

    it('should not be able to self claim ERC20 Token twice', async function () {
      await tokenA.mint(dao.address, '100');
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address],
      );

      const deadline = Math.round(Date.now() / 1000) + 86400;
      await budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '');
      await expect(budgetApproval
        .connect(receiver)
        .createTransaction([transactionData], deadline, true, '')).to.be.revertedWith('Address already claimed');
    });
  });
});

describe('Integration - Create selfClaimERC20BudgetApproval - test/integration/SelfClaimERC20BudgetApproval.js', function () {
  let selfClaimERC20BAImplementation, budgetApproval, team;
  let executor;
  let tokenA, executee, SelfClaimERC20BudgetApproval;

  beforeEach(async function () {
    [executor] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    SelfClaimERC20BudgetApproval = await ethers.getContractFactory('SelfClaimERC20BudgetApproval', { signer: executor });
    selfClaimERC20BAImplementation = await SelfClaimERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    team = await Team.deploy();
    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
  });

  describe('Create Budget Approval', function () {
    it('creates budget approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = selfClaimERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateSelfClaimERC20BAParams({
          executor: ethers.constants.AddressZero,
          executorTeamId: 0,
          approvers: [],
          approverTeamId: 0,
          minApproval: 0,
          text: 'SelfClaim ERC20 Budget Approval',
          transactionType: 'selfClaim',
          startTime,
          endTime,
          allowUnlimitedUsageCount: true,
          usageCount: 100,
          team: team.address,
          toAddresses: [],
          token: tokenA.address,
          allowAllTokens: false,
          totalAmount: 100,
          fixClaimAmount: 1,
          allowAnyAmount: false,
        }),
      );

      const tx = await executee.createBudgetApprovals([selfClaimERC20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.executor()).to.eq(ethers.constants.AddressZero);
      expect(await budgetApproval.executeParams()).to.deep.eq(['address token', 'address to']);
      expect(await budgetApproval.executorTeamId()).to.eq(0);
      expect(await budgetApproval.executee()).to.eq(executee.address);
      expect(await budgetApproval.approverTeamId()).to.eq(0);

      expect(await budgetApproval.minApproval()).to.eq(0);

      expect(await budgetApproval.transactionType()).to.eq('selfClaim');
      expect(await budgetApproval.totalAmount()).to.eq('100');

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(true);
      expect(await budgetApproval.usageCount()).to.eq(100);
    });
  });
});
