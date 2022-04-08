const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');

const { createTokens, createAdam } = require('../utils/createContract');

describe('Testing TransferERC20BudgetApproval', function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenA;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    adam = await createAdam();
    await adam.createDao(
      [
        'A Company', // _name
        'Description', // _description
        10000000, // _locktime
        false, // isCreateToken
        [13, 3000, 5000], // budgetApproval
        [13, 3000, 5000], // revokeBudgetApproval
        [13, 3000, 5000], // general
        [], // tokenInfo
        0,
        0, // minDepositAmount
        0, // minMemberTokenToJoin
      ],
    );
    const daoAddr = await adam.daos(0);
    dao = await ethers.getContractAt('Dao', daoAddr);
    const transferERC20BAImplementationAddr = await adam.budgetApprovals(0);
    transferERC20BAImplementation = await ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BAImplementationAddr);
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const initData = await transferERC20BAImplementation.callStatic.encodeInitializeData(
        [
          // dao address
          dao.address,
          // executor
          executor.address,
          // approvers
          [approver.address],
          // text
          'Transfer ERC20',
          // transaction type
          'Outflow',
          // allow all addresses,
          false,
          // allowed addresses (use when above = false)
          [receiver.address],
          // alow all tokens,
          false,
          // allowed token (use when above = false)
          [ethers.constants.AddressZero, tokenA.address],
          // allow any amount
          false,
          // allowed total amount
          ethers.utils.parseEther('100'),
          // allowed amount percentage
          '10',
        ],
      );

      const tx = await dao.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateBudgetApproval' });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);

      expect(await dao.callStatic.budgetApprovals(budgetApprovalAddress)).to.eq(true);

      expect(await budgetApproval.callStatic.dao()).to.eq(dao.address);
      expect(await budgetApproval.callStatic.executor()).to.eq(executor.address);
      expect(await budgetApproval.callStatic.approvers(0)).to.eq(approver.address);
      expect(await budgetApproval.callStatic.approversMapping(approver.address)).to.eq(true);

      expect(await budgetApproval.callStatic.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.callStatic.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.callStatic.allowAllTokens()).to.eq(false);
      expect(await budgetApproval.callStatic.tokens(0)).to.eq(ethers.constants.AddressZero);
      expect(await budgetApproval.callStatic.tokens(1)).to.eq(tokenA.address);
      expect(await budgetApproval.callStatic.tokensMapping(ethers.constants.AddressZero)).to.eq(true);
      expect(await budgetApproval.callStatic.tokensMapping(tokenA.address)).to.eq(true);

      expect(await budgetApproval.callStatic.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.callStatic.totalAmount()).to.eq(ethers.utils.parseEther('100'));
      expect(await budgetApproval.callStatic.amountPercentage()).to.eq(10);
    });
  });

  describe('Execute Transaction (Transfer ETH)', function () {
    beforeEach(async function () {
      await dao.connect(executor).deposit({ value: ethers.utils.parseEther('1000') });
    });

    context('complete flow', () => {
      it('should success', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](receiver.address, [], ethers.utils.parseEther('10'));

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(transactionId);
        await budgetApproval.connect(executor).executeTransaction(transactionId);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('10')));
      });
    });

    context('multiple outflow', () => {
      it('should success', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address[],bytes[],uint256[])']([receiver.address, receiver.address], [[], []], [ethers.utils.parseEther('10'), ethers.utils.parseEther('10')]);

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(transactionId);
        await budgetApproval.connect(executor).executeTransaction(transactionId);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('20')));
      });
    });

    context('not executed by executor', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](executor.address, [], ethers.utils.parseEther('10'));

        await dao.connect(approver).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(approver).executeTransaction(transactionId))
          .to.be.revertedWith('access denied');
      });
    });

    context('not approved by approver', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](executor.address, [], ethers.utils.parseEther('10'));

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('status invalid');
      });
    });

    context('not allowed address', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](executor.address, [], ethers.utils.parseEther('10'));

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('transaction not allowed');
      });
    });

    context('exceed amount', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](receiver.address, [], ethers.utils.parseEther('51'));

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);
        await budgetApproval.connect(executor).executeTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('transaction not allowed');
      });
    });

    context('exceed amount percentage', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.callStatic['encodeTransactionData(address,bytes,uint256)'](receiver.address, [], ethers.utils.parseEther('101'));

        await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.callStatic.lastTransactionId();

        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('transaction not allowed');
      });
    });
  });

  //   describe('Execute Transaction (Transfer ERC20)', function () {
  //     beforeEach(async function () {
  //       await tokenA.mint(executor.address, ethers.utils.parseEther('100'));
  //       await tokenA.connect(executor).approve(dao.address, ethers.utils.parseEther('100'));
  //       await dao.connect(executor).depositToken(tokenA.address, ethers.utils.parseEther('100'));
  //     });

  //     it('should success', async function () {
  //       const transferData = tokenA.interface.encodeFunctionData('transfer', [receiver.address, ethers.utils.parseEther('10')]);
  //       const transactionData = budgetApproval.callStatic.encodeTransactionData(tokenA.address, transferData, 0);

  //       await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
  //       const transactionId = await budgetApproval.callStatic.lastTransactionId();

  //       await budgetApproval.connect(approver).approveTransaction(transactionId);
  //       await budgetApproval.connect(executor).executeTransaction(transactionId);

//       expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.utils.parseEther('10'));
//     });
//   });
});
