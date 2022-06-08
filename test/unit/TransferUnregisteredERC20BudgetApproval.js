const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { getCreateTransferUnregisteredERC20BAParams } = require('../../utils/paramsStruct');

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferUnregisteredERC20BudgetApproval.sol', function () {
  let transferIlliquidBAImplementation, budgetApproval, dao;
  let executor, approver, receiver;
  let tokenA, executee, TransferUnregisteredERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferUnregisteredERC20BudgetApproval = await ethers.getContractFactory('TransferUnregisteredERC20BudgetApproval', { signer: executor });
    transferIlliquidBAImplementation = await TransferUnregisteredERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });

    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferUnregisteredERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferUnregisteredERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
        }),
      );

      const tx = await executee.createBudgetApprovals([transferIlliquidBAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferUnregisteredERC20BudgetApproval', budgetApprovalAddress);

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
      const initData = transferIlliquidBAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferUnregisteredERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 2,
          toAddresses: [receiver.address],
          token: tokenA.address,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [transferIlliquidBAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('minApproval invalid');
    });
  });

  describe('Execute Transaction (Transfer illiquid token)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      const initData = transferIlliquidBAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferUnregisteredERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          minApproval: 1,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferIlliquidBAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferUnregisteredERC20BudgetApproval', budgetApprovalAddress);
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
          .to.be.revertedWith('access denied');
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
          .to.be.revertedWith('access denied');
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
          .to.be.revertedWith('invalid recipient');
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
          .to.be.revertedWith('invalid amount');
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
          .to.be.revertedWith('invalid amount');
      });
    });

    context('execute before startTime', () => {
      it('should revert', async function () {
        const initData = transferIlliquidBAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferUnregisteredERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            endTime: 0,
            amountPercentage: 100,
            startTime: Math.round(Date.now() / 1000) + 86400,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferIlliquidBAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferUnregisteredERC20BudgetApproval',
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
        ).to.be.revertedWith('budget approval not yet started');
      });
    });

    context('execute after endTime', () => {
      it('should revert', async function () {
        const initData = transferIlliquidBAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferUnregisteredERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            startTime: 0,
            amountPercentage: 100,
            endTime: Math.round(Date.now() / 1000) - 86400,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferIlliquidBAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferUnregisteredERC20BudgetApproval',
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
        ).to.be.revertedWith('budget approval ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('should revert', async function () {
        const initData = transferIlliquidBAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferUnregisteredERC20BAParams({
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
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferIlliquidBAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferUnregisteredERC20BudgetApproval',
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
        ).to.be.revertedWith('usage exceeded');
      });
    });
  });
});
