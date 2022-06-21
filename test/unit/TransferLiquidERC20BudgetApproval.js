const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const mockAggrgator = '0x87A84931c876d5380352a32Ff474db13Fc1c11E5';

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApproval.sol', function () {
  let transferLiquidERC20BAImplementation, budgetApproval, dao;
  let executor, approver, receiver;
  let tokenA, executee, TransferLiquidERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });

    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF',
      feedRegistryArticfact.deployedBytecode,
    ]);
    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF');
    await feedRegistry.setAggregator(tokenA.address, ETHAddress, mockAggrgator);
    await feedRegistry.setPrice(tokenA.address, ETHAddress, parseEther('1'));
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize', [
        [
          executee.address, // dao addressc
          executor.address, // executor
          [approver.address], // approvers
          1, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          startTime, // startTime
          endTime, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [ETHAddress, tokenA.address], // allowed token
        false, // allow any amount
        parseEther('100'), // allowed total amount
        '10', // allowed amount percentage
      ]);

      const tx = await executee.createBudgetApprovals([transferLiquidERC20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.dao()).to.eq(executee.address);
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
      expect(await budgetApproval.totalAmount()).to.eq(parseEther('100'));
      expect(await budgetApproval.amountPercentage()).to.eq(10);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
        [
          executee.address, // dao address
          executor.address, // executor
          [approver.address], // approvers
          2, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          Math.round(Date.now() / 1000) - 86400, // startTime
          Math.round(Date.now() / 1000) + 86400, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [ETHAddress, tokenA.address], // allowed token (use when above = false)
        false, // allow any amount
        parseEther('100'), // allowed total amount
        100, // allowed amount percentage
      ]);

      await expect(
        executee.createBudgetApprovals(
          [transferLiquidERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('Invalid approver list');
    });
  });

  describe('Execute Transaction (Transfer ETH)', function () {
    beforeEach(async function () {
      await executor.sendTransaction({ to: executee.address, value: parseEther('200') });

      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize', [
        [
          dao.address, // dao addressc
          executor.address, // executor
          [approver.address], // approvers
          1, // minApproval
          'Transfer ERC20', // text
          'Outflow', // transaction type
          startTime, // startTime
          endTime, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [ETHAddress, tokenA.address], // allowed token
        false, // allow any amount
        parseEther('100'), // allowed total amount
        '10', // allowed amount percentage
      ]);

      const tx = await executee.createBudgetApprovals(
        [transferLiquidERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
    });

    context('ETH complete flow', () => {
      it('should success', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('10'),
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(parseEther('10')));
      });
    });

    context('ERC20 complete flow', () => {
      it('should success', async function () {
        await tokenA.mint(executee.address, parseEther('10'));
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          parseEther('10'),
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(executee.address)).to.eq(parseEther('0'));
        expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10'));
      });
    });

    context('multiple outflow', () => {
      it('should success', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(parseEther('20')));
      });
    });

    context('not executed by executor', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('10'),
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
          ETHAddress,
          receiver.address,
          parseEther('10'),
        ]);
        await expect(budgetApproval.connect(approver).createTransaction([transactionData], Date.now() + 86400, false))
          .to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not approved by approver', () => {
      it('should revert', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('10'),
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
          ETHAddress,
          receiver.address,
          parseEther('10'),
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
          ETHAddress,
          executor.address,
          parseEther('10'),
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
          ETHAddress,
          receiver.address,
          parseEther('101'),
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
          ETHAddress,
          receiver.address,
          parseEther('21'),
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
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            executee.address, // dao address
            executor.address, // executor
            [], // approvers
            0, // minApproval
            'Transfer ERC20', // text
            'Outflow', // transaction type
            Math.round(Date.now() / 1000) + 86400, // startTime
            0, // endTime
            false, // allow unlimited usage
            10, // usage count
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          100, // allowed amount percentage
        ]);

        const tx = await executee.createBudgetApprovals(
          [transferLiquidERC20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferLiquidERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('101'),
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
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            executee.address, // dao address
            executor.address, // executor
            [], // approvers
            0, // minApproval
            'Transfer ERC20', // text
            'Outflow', // transaction type
            0, // startTime
            Math.round(Date.now() / 1000) - 86400, // endTime
            false, // allow unlimited usage
            10, // usage count
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          100, // allowed amount percentage
        ]);

        const tx = await executee.createBudgetApprovals(
          [transferLiquidERC20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferLiquidERC20BudgetApproval',
          budgetApprovalAddress,
        );

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('101'),
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
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            dao.address, // dao address
            executor.address, // executor
            [], // approvers
            0, // minApproval
            'Transfer ERC20', // text
            'Outflow', // transaction type
            0, // startTime
            0, // endTime
            false, // allow unlimited usage
            1, // usage count
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ETHAddress, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          100, // allowed amount percentage
        ]);

        const tx = await executee.createBudgetApprovals(
          [transferLiquidERC20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

        const testBudgetApproval = await ethers.getContractAt(
          'TransferLiquidERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ETHAddress,
          receiver.address,
          parseEther('1'),
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
});
