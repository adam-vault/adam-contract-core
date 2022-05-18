const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');

const { createTokens, createAdam, createFeedRegistry, createBudgetApprovals } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

describe('TransferERC20BudgetApproval.sol - test Chainlink Percentage limit', function () {
  let adam, dao, transferERC20BAImplementation, budgetApproval, lp;
  let executor, approver, receiver;
  let tokenA, feedRegistry, budgetApprovalAddresses;

  beforeEach(async function () {
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
      true, // allow any amount
      0, // allowed total amount
      '50', // allowed amount percentage
      startTime, // startTime
      endTime, // endTime
      false, // allow unlimited usage
      10, // usage count
    ]]);

    const tx = await lp.createBudgetApprovals(
      [transferERC20BAImplementation.address], [initData],
    );
    const receipt1 = await tx.wait();
    const creationEventLog1 = _.find(receipt1.events, { event: 'CreateBudgetApproval' });
    const budgetApprovalAddress = creationEventLog1.args.budgetApproval;

    budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
    await feedRegistry.setPrice(ethers.utils.parseEther('0.5'));
    await tokenA.mint(lp.address, ethers.utils.parseEther('1'));
    await executor.sendTransaction({ to: lp.address, value: ethers.utils.parseEther('1.5') });

    const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
      receiver.address, [], ethers.utils.parseEther('1'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

    const transactionId = creationEventLog.args.id;

    const originalBalance = await receiver.getBalance();
    await budgetApproval.connect(approver).approveTransaction(transactionId);
    await budgetApproval.connect(executor).executeTransaction(transactionId);

    expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('1')));
  });
  it('cannot send 1.1 Eth', async function () {
    await feedRegistry.setPrice(ethers.utils.parseEther('0.5'));
    await tokenA.mint(lp.address, ethers.utils.parseEther('1'));
    await executor.sendTransaction({ to: lp.address, value: ethers.utils.parseEther('1.5') });

    const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
      receiver.address, [], ethers.utils.parseEther('1.1'),
    ]);
    const tx = await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

    const transactionId = creationEventLog.args.id;

    await budgetApproval.connect(approver).approveTransaction(transactionId);

    await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
      .to.be.revertedWith('invalid amount');
  });

  it('can send 10 Token', async function () {
    await feedRegistry.setPrice(ethers.utils.parseEther('0.1'));
    await tokenA.mint(lp.address, ethers.utils.parseEther('10'));
    await executor.sendTransaction({ to: lp.address, value: ethers.utils.parseEther('1') });

    const transferData = tokenA.interface.encodeFunctionData('transfer', [receiver.address, ethers.utils.parseEther('10')]);
    const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
      tokenA.address, transferData, 0,
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

    const transactionId = creationEventLog.args.id;

    await budgetApproval.connect(approver).approveTransaction(transactionId);
    await budgetApproval.connect(executor).executeTransaction(transactionId);

    expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.utils.parseEther('10'));
  });
  it('cannot send 11 Token', async function () {
    await feedRegistry.setPrice(ethers.utils.parseEther('0.1'));
    await tokenA.mint(lp.address, ethers.utils.parseEther('11'));
    await executor.sendTransaction({ to: lp.address, value: ethers.utils.parseEther('0.9') });

    const transferData = tokenA.interface.encodeFunctionData('transfer', [receiver.address, ethers.utils.parseEther('11')]);
    const transactionData = budgetApproval.interface.encodeFunctionData('execute', [
      tokenA.address, transferData, 0,
    ]);
    const tx = await budgetApproval.connect(executor).createTransaction(transactionData, Date.now() + 86400, false);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

    const transactionId = creationEventLog.args.id;

    await budgetApproval.connect(approver).approveTransaction(transactionId);

    await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
      .to.be.revertedWith('invalid amount');
  });
});
