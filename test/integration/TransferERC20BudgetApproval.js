const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const { getCreateTransferERC20BAParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC20BudgetApproval.sol', function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver;
  let tokenA, feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      paramsStruct.getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const transferERC20BAImplementationAddr = budgetApprovalAddresses[3];
    transferERC20BAImplementation = await ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BAImplementationAddr);
  });

  describe('On Liquid Pool', function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          totalAmount: parseEther('100'),
          team: await adam.team(),
        }),
      );

      const tx = await lp.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);
      expect(await budgetApproval.dao()).to.eq(dao.address);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.mint(lp.address, parseEther('200'));
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10').add(orgReceiverBalance));
    });

    it('transfer multiple ERC20 should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('20').add(originalBalance));
    });
  });

  describe('On Treasury', function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          totalAmount: parseEther('100'),
          team: await adam.team(),
        }),
      );

      const tx = await dao.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await dao.budgetApprovals(budgetApprovalAddress)).to.eq(true);
      expect(await budgetApproval.dao()).to.eq(dao.address);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.mint(dao.address, parseEther('200'));
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10').add(orgReceiverBalance));
    });

    it('transfer multiple ERC20 should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('20').add(originalBalance));
    });
  });
});

describe('TransferERC20BudgetApproval.sol', function () {
  let transferErc20BAImplementation, budgetApproval, dao, team;
  let executor, approver, receiver;
  let tokenA, tokenB, executee, TransferERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA, tokenB } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer: executor });
    transferErc20BAImplementation = await TransferERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    team = await Team.deploy();
    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals([transferErc20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.dao()).to.eq(executee.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.token()).to.eq(tokenA.address);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq('100');
      expect(await budgetApproval.amountPercentage()).to.eq(10);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 2,
          toAddresses: [receiver.address],
          token: tokenA.address,
          team: team.address,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('Invalid approver list');
    });
  });

  describe('Execute Transaction (Transfer illiquid token)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          minApproval: 1,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    context('ERC20 complete flow', () => {
      it('should success', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        const originalBalance = await tokenA.balanceOf(receiver.address);
        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(originalBalance.add('10'));
      });
    });

    context('not executed by executor', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id);
        await expect(budgetApproval.connect(approver).executeTransaction(id))
          .to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not created by executor', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        await expect(budgetApproval.connect(approver).createTransaction([transactionData], Date.now() + 86400, false))
          .to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not approved by approver', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('status invalid');
      });
    });

    context('revoked by executor', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(executor).revokeTransaction(id);
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('status invalid');
      });
    });

    context('not allowed address', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          executor.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id);
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('Recipient not whitelisted in budget');
      });
    });

    context('exceed amount', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '101',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await budgetApproval.connect(approver).approveTransaction(id);
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });

    context('exceed amount percentage', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '21',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id);
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('Exceeded max budget transferable percentage');
      });
    });

    context('execute before startTime', () => {
      it('should revert', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            endTime: 0,
            amountPercentage: 100,
            startTime: Math.round(Date.now() / 1000) + 86400,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '101',
        ]);
        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              [transactionData],
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('Budget usage period not started');
      });
    });

    context('execute after endTime', () => {
      it('should revert', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            startTime: 0,
            amountPercentage: 100,
            endTime: Math.round(Date.now() / 1000) - 86400,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '101',
        ]);
        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              [transactionData],
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('Budget usage period has ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('should revert', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: dao.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            startTime: 0,
            endTime: 0,
            amountPercentage: 100,
            usageCount: 1,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '1',
        ]);
        await testBudgetApproval.connect(executor).createTransaction(
          [transactionData],
          Math.round(Date.now() / 1000) + 86400,
          true,
        );

        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              [transactionData],
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('Exceeded budget usage limit');
      });
    });
  });

  describe('Execute Transaction with team (Transfer illiquid token)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      await team.addTeam('Testing1', executor.address, [executor.address], 'Test');
      await team.addTeam('Testing2', executor.address, [approver.address], 'Test');

      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executorTeamId: 1,
          approverTeamId: 2,
          toAddresses: [receiver.address],
          token: tokenA.address,
          minApproval: 0,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    context('ERC20 complete flow', () => {
      it('should success', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        const originalBalance = await tokenA.balanceOf(receiver.address);
        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(originalBalance.add('10'));
      });

      it('should revert with approver not in list', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await expect(budgetApproval.connect(executor).approveTransaction(id)).to.be.revertedWith('Approver not whitelisted in budget');
      });

      it('should revert with executor not in list', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await budgetApproval.connect(approver).approveTransaction(id);
        await expect(budgetApproval.connect(approver).executeTransaction(id)).to.be.revertedWith('Executor not whitelisted in budget');
      });
    });
  });

  describe('Execute Transaction (allowAllTokens = true)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      await tokenB.mint(executee.address, '200');
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          allowAllTokens: true,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    context('complete flow with 2 tokens', () => {
      it('should success', async function () {
        const transactionData1 = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const transactionData2 = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenB.address,
          receiver.address,
          '10',
        ]);

        const originalBalanceA = await tokenA.balanceOf(receiver.address);
        const originalBalanceB = await tokenB.balanceOf(receiver.address);

        await budgetApproval.connect(executor).createTransaction([transactionData1, transactionData2], Date.now() + 86400, true);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(originalBalanceA.add('10'));
        expect(await tokenB.balanceOf(receiver.address)).to.eq(originalBalanceB.add('10'));
      });
    });
  });
});
