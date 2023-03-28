const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { smock } = require('@defi-wonderland/smock');
const { getCreateSelfClaimErc20TokenBAParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('SelfClaimERC20BudgetApproval.sol - test/unit/SelfClaimERC20BudgetApproval.js', async function () {
  let selfERC20BAImplementation, budgetApproval, team;
  let executor, approver, receiver, validator;
  let tokenA, executee, SelfClaimERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver, validator] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    SelfClaimERC20BudgetApproval = await ethers.getContractFactory('SelfClaimERC20BudgetApproval', { signer: executor });
    selfERC20BAImplementation = await SelfClaimERC20BudgetApproval.deploy();
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    team = await Team.deploy();
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    await executee.setVariable('_team', team.address);
  });

  describe('Create Budget Approval', async function () {
    it('creates liquid ERC20 Budget Approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;

      const initData = SelfClaimERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateSelfClaimErc20TokenBAParams({
          dao: executor.address,
          approvers: [approver.address],
          token: ADDRESS_ETH,
          toAddresses: [receiver.address],
          minApproval: 0,
          fixAmount: parseEther('5'),
          allowUnlimitedUsageCount: false,
          usageCount: 5,
          startTime,
          endTime,
          validator: '0x2d61d2ea8c296305c4af461f12a172cf1d0af599',
        }),
      );

      const tx = await executee.createBudgetApprovals([selfERC20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(0);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.token()).to.eq(ADDRESS_ETH);
      expect(await budgetApproval.fixAmount()).to.eq(parseEther('5'));

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(5);
      expect(await budgetApproval.validator()).to.eq(validator.address);
    });

    it('throws "Invalid approver list"', async function () {
      const initData = SelfClaimERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateSelfClaimErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          token: ADDRESS_ETH,
          toAddresses: [receiver.address],
          minApproval: 2,
          usageCount: 10,
          team: team.address,
          fixAmount: ethers.utils.parseEther('1'),
          validator: validator.address,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [selfERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'InvalidApproverList');
    });

    it('throws "DuplicatedToAddress"', async function () {
      const initData = SelfClaimERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateSelfClaimErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          token: ADDRESS_ETH,
          toAddresses: [receiver.address, receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: team.address,
          fixAmount: ethers.utils.parseEther('1'),
          validator: validator.address,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [selfERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'DuplicatedToAddress');
    });
  });

  describe('Execute Transaction (Transfer ETH)', async function () {
    const fixAmount = ethers.utils.parseEther('10');
    beforeEach(async function () {
      await executor.sendTransaction({ to: executee.address, value: parseEther('200') });
      const initData = SelfClaimERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateSelfClaimErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          token: ADDRESS_ETH,
          toAddresses: [receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: team.address,
          fixAmount,
          validator: validator.address,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [selfERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);
    });

    it('executes transfer ETH', async function () {
      const entity = receiver.address;
      const nonce = 1;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [receiver.address, nonce, signature],
      );

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await receiver.getBalance();
      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await receiver.getBalance()).to.eq(
        originalBalance.add(fixAmount),
      );
    });

    it('throws RecipientNotWhitelisted if Receiver not whitelisted', async function () {
      const entity = executor.address;
      const nonce = 2;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        executor.address,
        nonce,
        signature,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(
        budgetApproval.connect(executor).executeTransaction(id),
      ).to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'RecipientNotWhitelisted');
    });

    it('throws "AddressClaimed" if the accumulated amount > fix amount', async function () {
      const entity = receiver.address;
      const nonce = 3;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        receiver.address,
        nonce,
        signature,
      ]);

      const firstTx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id: firstTxId } = await findEventArgs(firstTx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(firstTxId, '');
      await expect(budgetApproval.connect(executor).executeTransaction(firstTxId))
        .to.not.be.reverted;

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'AddressClaimed');
    });

    it('throws "SignatureNotCorrrect" if the entity not match', async function () {
      const entity = executor.address;
      const nonce = 4;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        receiver.address,
        nonce,
        signature,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'SignatureNotCorrrect');
    });

    it('throws "SignatureNotCorrrect" if the nonce not match', async function () {
      const entity = executor.address;
      const nonce = 5;
      const wrongNonce = 77;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        receiver.address,
        wrongNonce,
        signature,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'SignatureNotCorrrect');
    });

    it('throws "SignatureNotCorrrect" if the signature not signed correctly', async function () {
      const entity = executor.address;
      const nonce = 5;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        receiver.address,
        nonce,
        messageHash,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'SignatureNotCorrrect');
    });
  });

  describe('Execute Transaction (Transfer ERC20)', async function () {
    const fixAmount = ethers.utils.parseEther('10');
    beforeEach(async function () {
      await executor.sendTransaction({ to: executee.address, value: parseEther('200') });
      const initData = SelfClaimERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateSelfClaimErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          token: tokenA.address,
          toAddresses: [receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: team.address,
          fixAmount,
          validator: validator.address,
        }),
      );

      await tokenA.mint(executee.address, ethers.utils.parseEther('100'));
      const tx = await executee.createBudgetApprovals(
        [selfERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('SelfClaimERC20BudgetApproval', budgetApprovalAddress);
    });

    it('executes transfer ETH', async function () {
      const entity = receiver.address;
      const nonce = 8;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [receiver.address, nonce, signature],
      );

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(receiver.address)).to.eq(
        originalBalance.add(fixAmount),
      );
    });

    it('throws RecipientNotWhitelisted if Receiver not whitelisted', async function () {
      const entity = executor.address;
      const nonce = 9;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        executor.address,
        nonce,
        signature,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(
        budgetApproval.connect(executor).executeTransaction(id),
      ).to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'RecipientNotWhitelisted');
    });

    it('throws "AddressClaimed" if the accumulated amount > fix amount', async function () {
      const entity = receiver.address;
      const nonce = 10;
      const messageHash = await budgetApproval.getMessageHash(entity, nonce);
      const signature = await validator.signMessage(ethers.utils.arrayify(messageHash));

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        receiver.address,
        nonce,
        signature,
      ]);
      const firstTx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id: firstTxId } = await findEventArgs(firstTx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(firstTxId, '');
      await expect(budgetApproval.connect(executor).executeTransaction(firstTxId))
        .to.not.be.reverted;

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id))
        .to.be.revertedWithCustomError(SelfClaimERC20BudgetApproval, 'AddressClaimed');
    });
    it('Check signature', async function () {
      const accounts = await ethers.getSigners(2);
      const signer = accounts[0];
      const to = accounts[1].address;
      const nonce = 123;

      const hash = await budgetApproval.getMessageHash(to, nonce);
      const sig = await signer.signMessage(ethers.utils.arrayify(hash));

      // Correct signature and message returns true
      expect(
        await budgetApproval.verify(signer.address, to, nonce, sig),
      ).to.equal(true);

      // Incorrect message returns false
      expect(
        await budgetApproval.verify(signer.address, to, nonce + 1, sig),
      ).to.equal(false);
    });
  });
});
