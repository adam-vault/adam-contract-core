const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');

const { createTokens, createAdam, createFeedRegistry, createBudgetApprovals } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

describe('TransferERC20BudgetApproval.sol', function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver;
  let tokenA, feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    feedRegistry = await createFeedRegistry(tokenA, executor);
    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);
    const tx1 = await adam.createDao(
      [
        'A Company', // _name
        'Description', // _description
        10000000, // _locktime
        0, // MemberTokenType
        '0x0000000000000000000000000000000000000000', // memberToken
        [13, 3000, 5000, 0], // budgetApproval
        [13, 3000, 5000, 0], // revokeBudgetApproval
        [13, 3000, 5000, 0], // general,
        [13, 3000, 5000, 0], // daoSetting
        [], // tokenInfo
        0,
        0, // minDepositAmount
        0, // minMemberTokenToJoin
        [],
      ],
    );
    const receipt = await tx1.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
    const daoAddr = creationEventLog.args.dao;
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const transferERC20BAImplementationAddr = budgetApprovalAddresses[0];
    transferERC20BAImplementation = await ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BAImplementationAddr);
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
        dao.address, // dao address
        executor.address, // executor
        [approver.address], // approvers
        1, // minApproval
        'Transfer ERC20', // text
        'Outflow', // transaction type
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [ETHAddress, tokenA.address], // allowed token
        false, // allow any amount
        ethers.utils.parseEther('100'), // allowed total amount
        '10', // allowed amount percentage
        startTime, // startTime
        endTime, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await lp.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateBudgetApproval' });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);

      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);

      expect(await budgetApproval.dao()).to.eq(dao.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.tokens(0)).to.eq(ETHAddress);
      expect(await budgetApproval.tokens(1)).to.eq(tokenA.address);
      expect(await budgetApproval.tokensMapping(ETHAddress)).to.eq(true);
      expect(await budgetApproval.tokensMapping(tokenA.address)).to.eq(true);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq(ethers.utils.parseEther('100'));
      expect(await budgetApproval.amountPercentage()).to.eq(10);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
        dao.address, // dao address
        executor.address, // executor
        [approver.address], // approvers
        2, // minApproval
        'Transfer ERC20', // text
        'Outflow', // transaction type
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [ETHAddress, tokenA.address], // allowed token (use when above = false)
        false, // allow any amount
        ethers.utils.parseEther('100'), // allowed total amount
        100, // allowed amount percentage
        Math.round(Date.now() / 1000) - 86400, // startTime
        Math.round(Date.now() / 1000) + 86400, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      await expect(
        dao.createBudgetApprovals(
          [transferERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('minApproval invalid');
    });
  });

  describe('Create Multiple Excuetee BudgetApprovals On Dao', function () {
    it('should success', async function () {
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
        // dao address
        dao.address,
        // executor
        executor.address,
        // approvers
        [approver.address],
        // minApproval
        1,
        // text
        'Transfer ERC20',
        // transaction type
        'Outflow',
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        [receiver.address],
        // allowed token
        [ETHAddress, tokenA.address],
        // allow any amount
        false,
        // allowed total amount
        ethers.utils.parseEther('100'),
        // allowed amount percentage
        '10',
        0, // startTime
        0, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]]);

      const tx = await dao.createMultiExecuteeBudgetApprovals(
        [dao.address, lp.address], [transferERC20BAImplementation.address, transferERC20BAImplementation.address], [initData, initData],
      );

      const receipt = await tx.wait();
      const creationEventLog = _.filter(receipt.events, { event: 'CreateBudgetApproval' });

      expect(await dao.budgetApprovals(creationEventLog[0].args.budgetApproval)).to.eq(true);
      expect(await lp.budgetApprovals(creationEventLog[1].args.budgetApproval)).to.eq(true);
    });
  });

  describe('Execute Transaction (Transfer ETH)', function () {
    before(async function () {
      await lp.connect(executor).deposit({ value: ethers.utils.parseEther('200') });
    });

    context('complete flow', () => {
      it('should success', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address, [], ethers.utils.parseEther('10'),
        ]);

        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(transactionId);
        await budgetApproval.connect(executor).executeTransaction(transactionId);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('10')));
      });
    });

    context('multiple outflow', () => {
      it('should success', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('executeMultiple', [
          [receiver.address, receiver.address],
          [[], []],
          [ethers.utils.parseEther('10'), ethers.utils.parseEther('10')],
        ]);

        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(transactionId);
        await budgetApproval.connect(executor).executeTransaction(transactionId);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('20')));
      });
    });

    context('not executed by executor', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('10'),
        ]);
        await budgetApproval.connect(approver).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(approver).executeTransaction(transactionId))
          .to.be.revertedWith('access denied');
      });
    });

    context('not approved by approver', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('10'),
        ]);
        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('status invalid');
      });
    });

    context('revoked by executor', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('10'),
        ]);
        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();

        await budgetApproval.connect(executor).revokeTransaction(transactionId);
        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('status invalid');
      });
    });

    context('not allowed address', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          executor.address,
          [],
          ethers.utils.parseEther('10'),
        ]);
        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('invalid recipient');
      });
    });

    context('exceed amount', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('101'),
        ]);
        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();
        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('invalid amount');
      });
    });

    context('exceed amount percentage', () => {
      it('should revert', async function () {
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('21'),
        ]);
        await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
        const transactionId = await budgetApproval.lastTransactionId();

        await budgetApproval.connect(approver).approveTransaction(transactionId);

        await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
          .to.be.revertedWith('invalid amount');
      });
    });

    context('execute before startTime', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
          dao.address, // dao address
          executor.address, // executor
          [], // approvers
          0, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          ethers.utils.parseEther('100'), // allowed total amount
          100, // allowed amount percentage
          Math.round(Date.now() / 1000) + 86400, // startTime
          0, // endTime
          false, // allow unlimited usage
          10, // usage count
        ]]);

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
          [initData],
        );
        const receipt = await tx.wait();
        const creationEventLog = _.find(receipt.events, {
          event: 'CreateBudgetApproval',
        });
        const budgetApprovalAddress = creationEventLog.args.budgetApproval;

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('101'),
        ]);
        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              transactionData,
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('budget approval not yet started');
      });
    });

    context('execute after endTime', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
          dao.address, // dao address
          executor.address, // executor
          [], // approvers
          0, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          ethers.utils.parseEther('100'), // allowed total amount
          100, // allowed amount percentage
          0, // startTime
          Math.round(Date.now() / 1000) - 86400, // endTime
          false, // allow unlimited usage
          10, // usage count
        ]]);

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
          [initData],
        );
        const receipt = await tx.wait();
        const creationEventLog = _.find(receipt.events, {
          event: 'CreateBudgetApproval',
        });
        const budgetApprovalAddress = creationEventLog.args.budgetApproval;

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );

        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('101'),
        ]);

        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              transactionData,
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('budget approval ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [[
          dao.address, // dao address
          executor.address, // executor
          [], // approvers
          0, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          ethers.utils.parseEther('100'), // allowed total amount
          100, // allowed amount percentage
          0, // startTime
          0, // endTime
          false, // allow unlimited usage
          1, // usage count
        ]]);

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
          [initData],
        );
        const receipt = await tx.wait();
        const creationEventLog = _.find(receipt.events, {
          event: 'CreateBudgetApproval',
        });
        const budgetApprovalAddress = creationEventLog.args.budgetApproval;

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
          receiver.address,
          [],
          ethers.utils.parseEther('1'),
        ]);

        await testBudgetApproval.connect(executor).createTransaction(
          transactionData,
          Math.round(Date.now() / 1000) + 86400,
          true,
        );

        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              transactionData,
              Math.round(Date.now() / 1000) + 86400,
              true,
            ),
        ).to.be.revertedWith('usage exceeded');
      });
    });
  });

  // describe('Execute Transaction (Transfer ERC20)', function () {
  //   beforeEach(async function () {
  //     await tokenA.mint(executor.address, ethers.utils.parseEther('100'));
  //     await tokenA.connect(executor).approve(dao.address, ethers.utils.parseEther('100'));
  //     await lp.connect(executor).depositToken(tokenA.address, ethers.utils.parseEther('100'));
  //   });

  //   it('should success', async function () {
  //     const transferData = tokenA.interface.encodeFunctionData('transfer', [receiver.address, ethers.utils.parseEther('10')]);
  //     const transactionData = budgetApproval.callStatic.encodeTransactionData(tokenA.address, transferData, 0);

  //     await dao.connect(executor).createBudgetApprovalTransaction(budgetApproval.address, transactionData, Date.now() + 86400, false);
  //     const transactionId = await budgetApproval.callStatic.lastTransactionId();

  //     await budgetApproval.connect(approver).approveTransaction(transactionId);
  //     await budgetApproval.connect(executor).executeTransaction(transactionId);

  //     expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.utils.parseEther('10'));
  //   });
  // });
});
