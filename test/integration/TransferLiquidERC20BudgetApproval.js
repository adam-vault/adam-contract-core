const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApproval.sol', function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver;
  let tokenA, feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF',
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF');
    await feedRegistry.setFeed(tokenA.address, true);

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      paramsStruct.getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const transferERC20BAImplementationAddr = budgetApprovalAddresses[0];
    transferERC20BAImplementation = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', transferERC20BAImplementationAddr);
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
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

      const tx = await lp.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);

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
      expect(await budgetApproval.totalAmount()).to.eq(parseEther('100'));
      expect(await budgetApproval.amountPercentage()).to.eq(10);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('should fail if minApproval larger than approvers length', async function () {
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
        [
          dao.address, // dao address
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
        dao.createBudgetApprovals(
          [transferERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('minApproval invalid');
    });
  });

  describe('Create Multiple Excuetee BudgetApprovals On Dao', function () {
    it('should success', async function () {
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
        [
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
          0, // startTime
          0, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        [receiver.address],
        // allowed token
        [ETHAddress, tokenA.address],
        // allow any amount
        false,
        // allowed total amount
        parseEther('100'),
        // allowed amount percentage
        '10',
      ]);

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
      await lp.connect(executor).deposit({ value: parseEther('200') });
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
        await tokenA.mint(lp.address, parseEther('10'));
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          parseEther('10'),
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id);
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('0'));
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
          .to.be.revertedWith('access denied');
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
          .to.be.revertedWith('access denied');
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
          .to.be.revertedWith('invalid recipient');
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
          .to.be.revertedWith('invalid amount');
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
          .to.be.revertedWith('invalid amount');
      });
    });

    context('execute before startTime', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            dao.address, // dao address
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

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
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
        ).to.be.revertedWith('budget approval not yet started');
      });
    });

    context('execute after endTime', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            dao.address, // dao address
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

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
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
        ).to.be.revertedWith('budget approval ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('should revert', async function () {
        const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize', [
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

        const tx = await lp.createBudgetApprovals(
          [transferERC20BAImplementation.address],
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
        ).to.be.revertedWith('usage exceeded');
      });
    });
  });
});
