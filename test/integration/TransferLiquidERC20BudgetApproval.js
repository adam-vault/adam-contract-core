const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { getCreateTransferLiquidErc20TokenBAParams, getCreateDaoParams } = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - TransferLiquidERC20BudgetApproval.sol', function () {
  let adam, dao, transferLiquidERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver;
  let tokenA, feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const transferLiquidERC20BAImplementationAddr = budgetApprovalAddresses[0];
    transferLiquidERC20BAImplementation = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', transferLiquidERC20BAImplementationAddr);
  });

  describe('On Liquid Pool', function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const initData = transferLiquidERC20BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferLiquidErc20TokenBAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          tokens: [ADDRESS_ETH, tokenA.address],
          toAddresses: [receiver.address],
          minApproval: 1,
          usageCount: 10,
          team: await adam.team(),
        }),
      );

      const tx = await lp.createBudgetApprovals(
        [transferLiquidERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
      await lp.connect(executor).deposit(executor.address, { value: parseEther('200') });
    });

    it('creates Liquid ERC 20 BA', async function () {
      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('transfer ETH should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        ADDRESS_ETH,
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

    it('transfer ERC 20 should success', async function () {
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

    it('transfer multiple ETH should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        ADDRESS_ETH,
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
});
