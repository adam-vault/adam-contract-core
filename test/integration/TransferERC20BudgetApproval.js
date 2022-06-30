const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const { getCreateTransferERC20BAParams } = require('../../utils/paramsStruct');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const mockAggrgator = '0x87A84931c876d5380352a32Ff474db13Fc1c11E5';

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC20BudgetApproval.sol', function () {
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
    await feedRegistry.setAggregator(tokenA.address, ETHAddress, mockAggrgator);

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      paramsStruct.getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    const transferERC20BAImplementationAddr = budgetApprovalAddresses[3];
    transferERC20BAImplementation = await ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BAImplementationAddr);
  });

  describe('On Liquid Pool', function () {
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

      const tx = await lp.createBudgetApprovals(
        [transferERC20BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 20 BA should success', async function () {
      expect(await lp.budgetApprovals(budgetApprovalAddress)).to.eq(true);
      expect(await budgetApproval.dao()).to.eq(dao.address);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.mint(lp.address, parseEther('200'));
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10').add(orgReceiverBalance));
    });

    it('transfer multiple ERC20 should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(lp.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('20').add(originalBalance));
    });
  });

  describe('On Treasury', function () {
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
      expect(await budgetApproval.dao()).to.eq(dao.address);
    });

    it('transfer ERC20 Token should success', async function () {
      await tokenA.mint(dao.address, parseEther('200'));
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');
      const orgReceiverBalance = await tokenA.balanceOf(receiver.address);

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('190'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('10').add(orgReceiverBalance));
    });

    it('transfer multiple ERC20 should success', async function () {
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenA.address,
        receiver.address,
        parseEther('10'),
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const originalBalance = await tokenA.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('170'));
      expect(await tokenA.balanceOf(receiver.address)).to.eq(parseEther('20').add(originalBalance));
    });
  });
});
