const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const _ = require('lodash');

const { createTokens } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC721BudgetApproval.sol', function () {
  let transferERC721BAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenC721, executee, TransferERC721BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferERC721BudgetApproval = await ethers.getContractFactory('TransferERC721BudgetApproval', { signer: executor });
    transferERC721BAImplementation = await TransferERC721BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
  });

  describe('Create Budget Approval', function () {
    before(async function () {
      ({ tokenC721 } = await createTokens());
    });
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize', [[
        executee.address, // dao addressc
        executor.address, // executor
        [approver.address], // approvers
        1, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token
        false, // allow any amount
        1,
        '10', // allowed amount percentage
        startTime, // startTime
        endTime, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateBudgetApproval' });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC721BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.dao()).to.eq(executee.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.tokens(0)).to.eq(tokenC721.address);
      expect(await budgetApproval.tokensMapping(tokenC721.address)).to.eq(true);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq(1);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize', [[
        executee.address, // dao address
        executor.address, // executor
        [approver.address], // approvers
        2, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token (use when above = false)
        false, // allow any amount
        1,
        100, // allowed amount percentage
        Math.round(Date.now() / 1000) - 86400, // startTime
        Math.round(Date.now() / 1000) + 86400, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      await expect(
        executee.createBudgetApprovals(
          [transferERC721BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('minApproval invalid');
    });
  });

  describe('Execute Transaction (Transfer ERC721)', function () {
    beforeEach(async function () {
      ({ tokenC721 } = await createTokens());

      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize', [[
        executee.address, // dao addressc
        executor.address, // executor
        [approver.address], // approvers
        1, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token
        false, // allow any amount
        2,
        '10', // allowed amount percentage
        startTime, // startTime
        endTime, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateBudgetApproval' });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC721BudgetApproval', budgetApprovalAddress);
    });

    it('should run ERC721 complete flow', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(approver).approveTransaction(transactionId);
      await budgetApproval.connect(executor).executeTransaction(transactionId);

      expect(await tokenC721.ownerOf(37752)).to.eq(receiver.address);
    });

    it('should run multiple outflow', async function () {
      await tokenC721.mint(executee.address, 37752);
      await tokenC721.mint(executee.address, 37753);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const transactionData2 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37753,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData2], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(approver).approveTransaction(transactionId);
      await budgetApproval.connect(executor).executeTransaction(transactionId);

      expect(await tokenC721.ownerOf(37752)).to.eq(receiver.address);
      expect(await tokenC721.ownerOf(37753)).to.eq(receiver.address);
    });

    it('should revert if not executed by executor', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(approver).createTransaction([transactionData], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(approver).approveTransaction(transactionId);

      await expect(budgetApproval.connect(approver).executeTransaction(transactionId))
        .to.be.revertedWith('access denied');
    });

    it('should revert if not approved by approver', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
        .to.be.revertedWith('status invalid');
    });

    it('should revert if revoked by executor', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(executor).revokeTransaction(transactionId);
      await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
        .to.be.revertedWith('status invalid');
    });

    it('should revert if not allowed address', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        executor.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(approver).approveTransaction(transactionId);

      await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
        .to.be.revertedWith('invalid recipient');
    });

    it('should revert if exceed amount', async function () {
      await tokenC721.mint(executee.address, 37752);
      await tokenC721.mint(executee.address, 37753);
      await tokenC721.mint(executee.address, 37754);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const transactionData2 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37753,
      ]);
      const transactionData3 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37754,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData2, transactionData3], Date.now() + 86400, false);
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });
      const transactionId = creationEventLog.args.id;

      await budgetApproval.connect(approver).approveTransaction(transactionId);

      await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
        .to.be.revertedWith('invalid amount');
    });

    it('should revert if execute before startTime', async function () {
      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize', [[
        executee.address, // dao address
        executor.address, // executor
        [], // approvers
        0, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token (use when above = false)
        false, // allow any amount
        1,
        100, // allowed amount percentage
        Math.round(Date.now() / 1000) + 86400, // startTime
        0, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, {
        event: 'CreateBudgetApproval',
      });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      const testBudgetApproval = await ethers.getContractAt(
        'TransferERC721BudgetApproval',
        budgetApprovalAddress,
      );
      await tokenC721.mint(executee.address, 37752);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
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
    it('should revert if execute after endTime', async function () {
      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize', [[
        executee.address, // dao address
        executor.address, // executor
        [], // approvers
        0, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token (use when above = false)
        false, // allow any amount
        1,
        100, // allowed amount percentage
        0, // startTime
        Math.round(Date.now() / 1000) - 86400, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, {
        event: 'CreateBudgetApproval',
      });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      const testBudgetApproval = await ethers.getContractAt(
        'TransferERC721BudgetApproval',
        budgetApprovalAddress,
      );
      await tokenC721.mint(executee.address, 37752);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
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

    it('should revert if not enough usage count', async function () {
      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize', [[
        executee.address, // dao address
        executor.address, // executor
        [], // approvers
        0, // minApproval
        'Transfer ERC721', // text
        'Outflow', // transaction type
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [tokenC721.address], // allowed token (use when above = false)
        false, // allow any amount
        1,
        100, // allowed amount percentage
        0, // startTime
        0, // endTime
        false, // allow unlimited usage
        1, // usage count
      ]]);

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, {
        event: 'CreateBudgetApproval',
      });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      const testBudgetApproval = await ethers.getContractAt(
        'TransferERC721BudgetApproval',
        budgetApprovalAddress,
      );
      await tokenC721.mint(executee.address, 37752);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
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
