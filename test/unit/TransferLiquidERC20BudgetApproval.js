const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApproval.sol', function () {
  let transferLiquidERC20BAImplementation, budgetApproval, dao, team;
  let executor, approver, receiver;
  let tokenA, executee, TransferLiquidERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    team = await Team.deploy();
    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, parseEther('1'));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
  });

  describe('Create Budget Approval', function () {
    it('creates liquid ERC20 Budget Approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize', [
        [
          executor.address, // executor
          0, // executorTeam
          [approver.address], // approvers
          0, // approverTeam
          1, // minApproval
          'Transfer Liquid ERC20', // text
          'outflowLiquid', // transaction type
          startTime, // startTime
          endTime, // endTime
          false, // allow unlimited usage
          10, // usage count
          team.address, // team
        ],
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [ADDRESS_ETH, tokenA.address], // allowed token
        false, // allow any amount
        parseEther('100'), // allowed total amount
        ADDRESS_ETH, // base currency
      ]);

      const tx = await executee.createBudgetApprovals([transferLiquidERC20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.tokens(0)).to.eq(ADDRESS_ETH);
      expect(await budgetApproval.tokens(1)).to.eq(tokenA.address);
      expect(await budgetApproval.tokensMapping(ADDRESS_ETH)).to.eq(true);
      expect(await budgetApproval.tokensMapping(tokenA.address)).to.eq(true);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq(parseEther('100'));

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('throws "Invalid approver list"', async function () {
      const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
        [
          executor.address, // executor
          0, // executorTeam
          [approver.address], // approvers
          0, // approverTeam
          2, // minApproval
          'Transfer Liquid ERC20', // text
          'outflowLiquid', // transaction type
          Math.round(Date.now() / 1000) - 86400, // startTime
          Math.round(Date.now() / 1000) + 86400, // endTime
          false, // allow unlimited usage
          10, // usage count
          team.address, // team
        ],
        false, // allow all addresses,
        [receiver.address], // allowed addresses (use when above = false)
        [ADDRESS_ETH, tokenA.address], // allowed token (use when above = false)
        false, // allow any amount
        parseEther('100'), // allowed total amount
        ADDRESS_ETH, // base currency
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
          executor.address, // executor
          0, // executorTeam
          [approver.address], // approvers
          0, // approverTeam
          1, // minApproval
          'Transfer Liquid ERC20', // text
          'outflowLiquid', // transaction type
          startTime, // startTime
          endTime, // endTime
          false, // allow unlimited usage
          10, // usage count
          team.address, // team
        ],
        false, // allow all addresses
        [receiver.address], // allowed addresses (use when above = false)
        [ADDRESS_ETH, tokenA.address], // allowed token
        false, // allow any amount
        parseEther('100'), // allowed total amount
        ADDRESS_ETH, // base currency
      ]);

      const tx = await executee.createBudgetApprovals(
        [transferLiquidERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
    });

    context('ETH complete flow', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id, '');

        expect(await receiver.getBalance()).to.eq(originalBalance.add(parseEther('10')));
      });
    });

    context('ERC20 complete flow', () => {
      it('executes transfer ERC20', async function () {
        await tokenA.mint(executee.address, parseEther('10'));
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          parseEther('10'),
        ]);

        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id, '');

        expect(await tokenA.balanceOf(executee.address)).to.eq(parseEther('0'));
        expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10'));
      });
    });

    context('multiple outflowLiquid', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id, '');

        expect(await receiver.getBalance()).to.eq(originalBalance.add(parseEther('20')));
      });
    });

    context('not executed by executor', () => {
      it('throws "Executor not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(budgetApproval.connect(approver).executeTransaction(id, ''))
          .to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not created by executor', () => {
      it('throws "Executor not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        await expect(budgetApproval.connect(approver).createTransaction([transactionData], Date.now() + 86400, false, ''))
          .to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not approved by approver', () => {
      it('throws "status invalid"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await expect(budgetApproval.connect(executor).executeTransaction(id, ''))
          .to.be.revertedWith('status invalid');
      });
    });

    context('revoked by executor', () => {
      it('throws "status invalid"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(executor).revokeTransaction(id);
        await expect(budgetApproval.connect(executor).executeTransaction(id, ''))
          .to.be.revertedWith('status invalid');
      });
    });

    context('not allowed address', () => {
      it('throws "Recipient not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          executor.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(budgetApproval.connect(executor).executeTransaction(id, ''))
          .to.be.revertedWith('Recipient not whitelisted in budget');
      });
    });

    context('exceed amount', () => {
      it('throws "Exceeded max budget transferable amount"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('101'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(budgetApproval.connect(executor).executeTransaction(id, ''))
          .to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });

    context('execute before startTime', () => {
      it('throws "Budget usage period not started"', async function () {
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            executor.address, // executor
            0, // executorTeam
            [], // approvers
            0, // approverTeam
            0, // minApproval
            'Transfer Liquid ERC20', // text
            'outflowLiquid', // transaction type
            Math.round(Date.now() / 1000) + 86400, // startTime
            0, // endTime
            false, // allow unlimited usage
            10, // usage count
            team.address, // team
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ADDRESS_ETH, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          ADDRESS_ETH, // base currency
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
          ADDRESS_ETH,
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
              '',
            ),
        ).to.be.revertedWith('Budget usage period not started');
      });
    });

    context('execute after endTime', () => {
      it('throws "Budget usage period has ended"', async function () {
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            executor.address, // executor
            0, // executorTeam
            [], // approvers
            0, // approverTeam
            0, // minApproval
            'Transfer Liquid ERC20', // text
            'outflowLiquid', // transaction type
            0, // startTime
            Math.round(Date.now() / 1000) - 86400, // endTime
            false, // allow unlimited usage
            10, // usage count
            team.address, // team
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ADDRESS_ETH, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          ADDRESS_ETH, // base currency
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
          ADDRESS_ETH,
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
              '',
            ),
        ).to.be.revertedWith('Budget usage period has ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('throws "Exceeded budget usage limit"', async function () {
        const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize', [
          [
            executor.address, // executor
            0, // executorTeam
            [], // approvers
            0, // approverTeam
            0, // minApproval
            'Transfer Liquid ERC20', // text
            'outflowLiquid', // transaction type
            0, // startTime
            0, // endTime
            false, // allow unlimited usage
            1, // usage count
            team.address, // team
          ],
          false, // allow all addresses,
          [receiver.address], // allowed addresses (use when above = false)
          [ADDRESS_ETH, tokenA.address], // allowed token (use when above = false)
          false, // allow any amount
          parseEther('100'), // allowed total amount
          ADDRESS_ETH, // base currency
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
          ADDRESS_ETH,
          receiver.address,
          parseEther('1'),
        ]);
        await testBudgetApproval.connect(executor).createTransaction(
          [transactionData],
          Math.round(Date.now() / 1000) + 86400,
          true,
          '',
        );

        await expect(
          testBudgetApproval
            .connect(executor)
            .createTransaction(
              [transactionData],
              Math.round(Date.now() / 1000) + 86400,
              true,
              '',
            ),
        ).to.be.revertedWith('Exceeded budget usage limit');
      });
    });
  });
});
