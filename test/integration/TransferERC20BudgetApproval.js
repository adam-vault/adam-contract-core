const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals, createPriceGateways } = require('../utils/createContract');
const { getCreateTransferERC20BAParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');
const { smock } = require('@defi-wonderland/smock');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - TransferERC20BudgetApproval.sol - test/integration/TransferERC20BudgetApproval.js', async function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver, daoSigner;
  let tokenA, feedRegistry, ethereumChainlinkPriceGateway;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    tokenA = await (await smock.mock('ERC20')).deploy('', '');

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    const result = await createAdam();
    adam = result.adam;
    ethereumChainlinkPriceGateway = result.ethPriceGateway.address;

    const tx1 = await adam.createDao(
      ...paramsStruct.getCreateDaoParams({
        priceGateways: [ethereumChainlinkPriceGateway],
        creator: executor.address,
      }),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());

    daoSigner = await testUtils.address.impersonate(daoAddr);
    await testUtils.address.setBalance(daoAddr, ethers.utils.parseEther('1'));

    transferERC20BAImplementation = result.transferERC20BudgetApproval;
  });

  describe('On Liquid Pool', async function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          totalAmount: parseEther('100'),
        }),
      );

      const tx = await lp.connect(daoSigner).createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.setVariable('_balances', { [lp.address]: parseEther('200') });
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );

      const deadline = Math.round(Date.now() / 1000) + 86400;
      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], deadline, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);
      expect((await budgetApproval.transactions(id)).status).to.eq(0);
      expect((await budgetApproval.transactions(id)).deadline).to.eq(deadline);
      expect((await budgetApproval.transactions(id)).approvedCount).to.eq(ethers.BigNumber.from('0'));

      await budgetApproval.connect(approver).approveTransaction(id, '');
      expect((await budgetApproval.transactions(id)).status).to.eq(1);
      expect((await budgetApproval.transactions(id)).approvedCount).to.eq(ethers.BigNumber.from('1'));

      await budgetApproval.connect(executor).executeTransaction(id);
      expect((await budgetApproval.transactions(id)).status).to.eq(2);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(
        parseEther('10').add(orgReceiverBalance),
      );
    });

    it('transfer multiple ERC20 should success', async function () {
      await tokenA.setVariable('_balances', { [lp.address]: parseEther('190') });

      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );
      const tx = await budgetApproval
        .connect(executor)
        .createTransaction(
          [transactionData, transactionData],
          Math.round(Date.now() / 1000) + 86400,
          false,
          '',
        );
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(
        parseEther('20').add(originalBalance),
      );
    });
  });

  describe('On Treasury', async function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = transferERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          totalAmount: parseEther('100'),
        }),
      );

      const tx = await dao.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await dao.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.setVariable('_balances', { [dao.address]: parseEther('200') });
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(
        parseEther('10').add(orgReceiverBalance),
      );
    });

    it('transfer multiple ERC20 should success', async function () {
      await tokenA.setVariable('_balances', { [dao.address]: parseEther('190') });

      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );
      const tx = await budgetApproval
        .connect(executor)
        .createTransaction(
          [transactionData, transactionData],
          Math.round(Date.now() / 1000) + 86400,
          false,
          '',
        );
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(
        parseEther('20').add(originalBalance),
      );
    });
  });
});

describe('Integration - TransferERC20BudgetApproval.sol 2 - test/integration/TransferERC20BudgetApproval.js', function () {
  let transferErc20BAImplementation, budgetApproval, dao, team;
  let executor, approver, receiver;
  let tokenA, tokenB, executee, TransferERC20BudgetApproval;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA, tokenB } = await createTokens());
    TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer: executor });
    transferErc20BAImplementation = await TransferERC20BudgetApproval.deploy();
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });

    team = await (await smock.mock('Team')).deploy();
    dao = await MockLPDao.deploy();
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    executee.setVariable('_team', team.address);
  });

  describe('Create Budget Approval', function () {
    it('creates budget approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC20BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          totalAmount: 100,
          token: tokenA.address,
          startTime,
          endTime,
          minApproval: 1,
          usageCount: 10,
        }),
      );

      const tx = await executee.createBudgetApprovals([transferErc20BAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.executee()).to.eq(executee.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.token()).to.eq(tokenA.address);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq('100');

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('throws "Invalid approver list"', async function () {
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
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
          [transferErc20BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWith('Invalid approver list');
    });
  });

  describe('Execute Transaction (Transfer illiquid token)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          toAddresses: [receiver.address],
          totalAmount: 100,
          token: tokenA.address,
          minApproval: 1,
          usageCount: 1,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address],
        [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
        tx,
        'CreateBudgetApproval',
      );

      budgetApproval = await ethers.getContractAt(
        'TransferERC20BudgetApproval',
        budgetApprovalAddress,
      );
    });

    context('ERC20 complete flow', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        const originalBalance = await tokenA.balanceOf(receiver.address);
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(
          originalBalance.add('10'),
        );
      });
    });

    context('not executed by executor', () => {
      it('throws "Executor not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );
        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(
          budgetApproval.connect(approver).executeTransaction(id),
        ).to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('Approve Incorrect Transaction Id ', () => {
      it('throws "Invaild TransactionId"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await expect(budgetApproval.connect(approver).approveTransaction(id + 1, ''))
          .to.be.revertedWith('Invaild TransactionId');
      });
    });

    context('not created by executor', () => {
      it('throws "Executor not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );
        await expect(
          budgetApproval
            .connect(approver)
            .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, ''),
        ).to.be.revertedWith('Executor not whitelisted in budget');
      });
    });

    context('not approved by approver', () => {
      it('throws "Transaction status invalid"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );
        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await expect(
          budgetApproval.connect(executor).executeTransaction(id),
        ).to.be.revertedWith('Transaction status invalid');
      });
    });

    context('revoked by executor', () => {
      it('throws "Transaction status invalid"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );
        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');

        await budgetApproval.connect(executor).revokeTransaction(id);
        await expect(
          budgetApproval.connect(executor).executeTransaction(id),
        ).to.be.revertedWith('Transaction status invalid');
      });
    });

    context('revoked incorrect transaction id', () => {
      it('throws "Invaild TransactionId"', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        ;
        await expect(budgetApproval.connect(executor).revokeTransaction(id + 1))
          .to.be.revertedWith('Invaild TransactionId');
      });
    });

    context('not allowed address', () => {
      it('throws "Recipient not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, executor.address, '10'],
        );
        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
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
          tokenA.address,
          receiver.address,
          '101',
        ]);
        const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(budgetApproval.connect(executor).executeTransaction(id))
          .to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });

    context('execute before startTime', () => {
      it('throws "Budget usage period not started"', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            endTime: 0,
            startTime: Math.round(Date.now() / 1000) + 86400,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
          tx,
          'CreateBudgetApproval',
        );

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '101'],
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
        ).to.be.revertedWith('Budget usage period not started');
      });
    });

    context('execute after endTime', () => {
      it('throws "Budget usage period has ended"', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: executee.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            startTime: 0,
            endTime: Math.round(Date.now() / 1000) - 86400,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
          tx,
          'CreateBudgetApproval',
        );

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );

        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '101'],
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
        ).to.be.revertedWith('Budget usage period has ended');
      });
    });

    context('execute if not enough usage count', () => {
      it('throws "Exceeded budget usage limit"', async function () {
        const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
          getCreateTransferERC20BAParams({
            dao: dao.address,
            executor: executor.address,
            approvers: [],
            minApproval: 0,
            toAddresses: [receiver.address],
            token: tokenA.address,
            startTime: 0,
            endTime: 0,
            usageCount: 1,
            team: team.address,
          }),
        );

        const tx = await executee.createBudgetApprovals(
          [transferErc20BAImplementation.address],
          [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
          tx,
          'CreateBudgetApproval',
        );

        const testBudgetApproval = await ethers.getContractAt(
          'TransferERC20BudgetApproval',
          budgetApprovalAddress,
        );
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '1'],
        );
        await testBudgetApproval
          .connect(executor)
          .createTransaction(
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

  describe('Execute Transaction with team (Transfer illiquid token)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      await team.setVariables({
        _balances: {
          1: {
            [executor.address]: 1,
          },
          2: {
            [approver.address]: 2,
          },
        },
      });

      const initData =
        transferErc20BAImplementation.interface.encodeFunctionData(
          'initialize',
          getCreateTransferERC20BAParams({
            dao: executee.address,
            executorTeamId: 1,
            approverTeamId: 2,
            toAddresses: [receiver.address],
            token: tokenA.address,
            minApproval: 0,
            team: team.address,
          }),
        );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address],
        [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
        tx,
        'CreateBudgetApproval',
      );

      budgetApproval = await ethers.getContractAt(
        'TransferERC20BudgetApproval',
        budgetApprovalAddress,
      );
    });

    context('ERC20 complete flow', () => {
      it('executes transfer ERC20', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        const originalBalance = await tokenA.balanceOf(receiver.address);
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(
          originalBalance.add('10'),
        );
      });

      it('throws "Approver not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await expect(
          budgetApproval.connect(executor).approveTransaction(id, ''),
        ).to.be.revertedWith('Approver not whitelisted in budget');
      });

      it('throws "Executor not whitelisted in budget"', async function () {
        const transactionData = abiCoder.encode(
          await budgetApproval.executeParams(),
          [tokenA.address, receiver.address, '10'],
        );

        const tx = await budgetApproval
          .connect(executor)
          .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
        const { id } = await findEventArgs(tx, 'CreateTransaction');
        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(
          budgetApproval.connect(approver).executeTransaction(id),
        ).to.be.revertedWith('Executor not whitelisted in budget');
      });
    });
  });

  describe('Execute Transaction (allowAllTokens = true)', function () {
    beforeEach(async function () {
      await tokenA.mint(executee.address, '200');
      await tokenB.mint(executee.address, '200');
      const initData = transferErc20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC20BAParams({
          dao: executee.address,
          executor: executor.address,
          allowAllTokens: true,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferErc20BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    context('complete flow with 2 tokens', () => {
      it('executes transfer 2 ERC20s', async function () {
        const transactionData1 = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenA.address,
          receiver.address,
          '10',
        ]);

        const transactionData2 = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenB.address,
          receiver.address,
          '10',
        ]);

        const originalBalanceA = await tokenA.balanceOf(receiver.address);
        const originalBalanceB = await tokenB.balanceOf(receiver.address);

        await budgetApproval.connect(executor).createTransaction([transactionData1, transactionData2], Math.round(Date.now() / 1000) + 86400, true, '');

        expect(await tokenA.balanceOf(receiver.address)).to.eq(originalBalanceA.add('10'));
        expect(await tokenB.balanceOf(receiver.address)).to.eq(originalBalanceB.add('10'));
      });
    });
  });
});