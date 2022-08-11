const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { getCreateTransferERC721BAParams } = require('../../utils/paramsStruct');

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC721BudgetApproval.sol', function () {
  let transferERC721BAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenC721, executee, TransferERC721BudgetApproval, team;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferERC721BudgetApproval = await ethers.getContractFactory('TransferERC721BudgetApproval', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });
    transferERC721BAImplementation = await TransferERC721BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    team = await Team.deploy();
  });

  describe('Create Budget Approval', function () {
    before(async function () {
      ({ tokenC721 } = await createTokens());
    });
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 1,
          allowAllAddresses: false,
          toAddresses: [receiver.address],
          allowAllTokens: false,
          tokens: [tokenC721.address],
          allowAnyAmount: false,
          totalAmount: 1,
          startTime,
          endTime,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

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

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(true);
      expect(await budgetApproval.usageCount()).to.eq(0);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 2,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 1,
          team: team.address,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [transferERC721BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('Invalid approver list');
    });
  });

  describe('Execute Transaction (Transfer ERC721)', function () {
    beforeEach(async function () {
      ({ tokenC721 } = await createTokens());

      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 1,
          allowAllAddresses: false,
          toAddresses: [receiver.address],
          allowAllTokens: false,
          tokens: [tokenC721.address],
          allowAnyAmount: false,
          totalAmount: 2,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

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
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.ownerOf(37752)).to.eq(receiver.address);
    });

    it('should run multiple outflow721', async function () {
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
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

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
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);

      await expect(budgetApproval.connect(approver).executeTransaction(id))
        .to.be.revertedWith('Executor not whitelisted in budget');
    });

    it('should revert if not created by executor', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);

      await expect(budgetApproval.connect(approver).createTransaction([transactionData], Date.now() + 86400, false))
        .to.be.revertedWith('Executor not whitelisted in budget');
    });

    it('should revert if not approved by approver', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await expect(budgetApproval.connect(executor).executeTransaction(id))
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
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(executor).revokeTransaction(id);
      await expect(budgetApproval.connect(executor).executeTransaction(id))
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
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);

      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWith('Recipient not whitelisted in budget');
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
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);

      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWith('Exceeded max budget transferable amount');
    });

    it('should revert if execute before startTime', async function () {
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 1,
          startTime: Math.round(Date.now() / 1000) + 86400,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

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
      ).to.be.revertedWith('Budget usage period not started');
    });
    it('should revert if execute after endTime', async function () {
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 1,
          endTime: Math.round(Date.now() / 1000) - 86400,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

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
      ).to.be.revertedWith('Budget usage period has ended');
    });

    it('should revert if not enough usage count', async function () {
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          allowUnlimitedUsageCount: false,
          usageCount: 1,
          totalAmount: 1,
          team: team.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address],
        [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

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
      ).to.be.revertedWith('Exceeded budget usage limit');
    });
  });
});
