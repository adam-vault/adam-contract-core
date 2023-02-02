const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { getCreateTransferLiquidErc20TokenBAParams } = require('../../utils/paramsStruct');

const { createTokens, createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - TransferLiquidERC20BudgetApproval.sol - test/integration/TransferLiquidERC20BudgetApproval.js', async function () {
  let adam, dao, transferLiquidERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver, daoSigner;
  let tokenA, feedRegistry, budgetApprovalAddresses, priceGatewayAddresses, ethereumChainlinkPriceGateway;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    const result = await createAdam({ budgetApprovalAddresses, priceGatewayAddresses });
    adam = result.adam;
    ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
    transferLiquidERC20BAImplementation = result.transferLiquidERC20BudgetApproval;

    const tx1 = await adam.createDao(
      ...paramsStruct.getCreateDaoParams({
        depositTokens: [ADDRESS_ETH, tokenA.address],
        priceGateways: [ethereumChainlinkPriceGateway],
      }),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());

    daoSigner = await testUtils.address.impersonate(dao.address);
    await testUtils.address.setBalance(dao.address, parseEther('1'));
  });

  describe('On Liquid Pool', async function () {
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
        }),
      );

      const tx = await lp.connect(daoSigner).createBudgetApprovals(
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

    it('transfer ERC 20 should success', async function () {
      await tokenA.mint(lp.address, parseEther('10'));
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );

      await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, 1);

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('0'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10'));
    });

    it('transfer 0 amount should not success', async function () {
      await tokenA.mint(lp.address, parseEther('10'));
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenA.address, receiver.address, parseEther('10')],
      );

      await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, 0);

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await expect(budgetApproval.connect(executor).executeTransaction(id)).to.be.revertedWith('Transfer amount should not be zero');
    });

    it('transfer multiple ETH should success', async function () {
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
});
