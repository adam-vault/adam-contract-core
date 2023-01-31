const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { smock } = require('@defi-wonderland/smock');
const { getCreateTransferLiquidErc20TokenBAParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApprovalV2.sol - test/unit/TransferLiquidERC20BudgetApprovalV2.js', function () {
  let transferLiquidERC20BAImplementation, budgetApproval, team, accountingSystem;
  let executor, approver, receiver;
  let tokenA, executee, TransferLiquidERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    team = await Team.deploy();
    accountingSystem = await smock.fake('AccountingSystem');
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    await executee.setVariable('_accountingSystem', accountingSystem.address);
    await executee.setVariable('_team', team.address);

    accountingSystem.isSupportedPair.whenCalledWith(tokenA.address, ADDRESS_ETH).returns(true);
    accountingSystem.isSupportedPair.whenCalledWith(ADDRESS_ETH, ADDRESS_ETH).returns(true);
    accountingSystem.assetPrice.returns(([,, amount]) => {
      return amount;
    });
  });

  describe('Create Budget Approval', function () {
    it('creates liquid ERC20 Budget Approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;

      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferLiquidErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          tokens: [ADDRESS_ETH, tokenA.address],
          toAddresses: [receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: team.address,
          totalAmount: parseEther('100'),
          startTime,
          endTime,
        }),
      );

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
      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferLiquidErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          tokens: [ADDRESS_ETH, tokenA.address],
          toAddresses: [receiver.address],
          minApproval: 2,
          usageCount: 10,
          team: team.address,
          totalAmount: ethers.utils.parseEther('1'),
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [transferLiquidERC20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWithCustomError(TransferLiquidERC20BudgetApproval, 'InvalidApproverList');
    });
  });

  describe('Execute Transaction (Transfer ETH)', function () {
    beforeEach(async function () {
      await executor.sendTransaction({ to: executee.address, value: parseEther('200') });

      const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferLiquidErc20TokenBAParams({
          dao: executor.address,
          executor: executor.address,
          approvers: [approver.address],
          tokens: [ADDRESS_ETH, tokenA.address],
          toAddresses: [receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: team.address,
          totalAmount: ethers.utils.parseEther('100'),
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferLiquidERC20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
    });

    context('ETH complete flow', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [ADDRESS_ETH, receiver.address, parseEther('10')],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await receiver.getBalance()).to.eq(
          originalBalance.add(parseEther('10')),
        );
      });
    });

    context('ERC20 complete flow', () => {
      it('executes transfer ERC20', async function () {
        await tokenA.mint(executee.address, parseEther('10'));
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, parseEther('10')],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(executee.address)).to.eq(parseEther('0'));
        expect(await tokenA.balanceOf(receiver.address)).to.eq(
          parseEther('10'),
        );
      });
    });

    context('multiple outflowLiquid', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        const originalBalance = await receiver.getBalance();
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await receiver.getBalance()).to.eq(originalBalance.add(parseEther('20')));
      });
    });

    context('not allowed address', () => {
      it('throws "Recipient not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          executor.address,
          parseEther('10'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(
          budgetApproval.connect(executor).executeTransaction(id),
        ).to.be.revertedWith('Recipient not whitelisted in budget');
      });
    });

    context('exceed amount', () => {
      it('throws "Exceeded max budget transferable amount"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_ETH,
          receiver.address,
          parseEther('101'),
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });
  });
});
