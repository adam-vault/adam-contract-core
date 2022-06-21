const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const findEventArgs = require('../../utils/findEventArgs');

const { createTokens } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const mockAggrgator = '0x87A84931c876d5380352a32Ff474db13Fc1c11E5';

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApproval.sol - test Chainlink Percentage limit', function () {
  let transferLiquidERC20BAImplementation, budgetApproval, dao;
  let executor, executee, approver, receiver;
  let tokenA, feedRegistry;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });

    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    dao = await MockLPDao.deploy();

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF',
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF');
    await feedRegistry.setAggregator(tokenA.address, ETHAddress, mockAggrgator);
    await feedRegistry.setPrice(tokenA.address, ETHAddress, parseEther('1'));

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
      true, // allow any amount
      0, // allowed total amount
      '50', // allowed amount percentage
    ]);

    const tx = await executee.createBudgetApprovals(
      [transferLiquidERC20BAImplementation.address], [initData],
    );
    const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

    budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
    await feedRegistry.setPrice(tokenA.address, ETHAddress, ethers.utils.parseEther('0.5'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('1'));
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1.5') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      ETHAddress,
      receiver.address,
      parseEther('1'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    const originalBalance = await receiver.getBalance();
    await budgetApproval.connect(approver).approveTransaction(id);
    await budgetApproval.connect(executor).executeTransaction(id);

    expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('1')));
  });
  it('cannot send 1.1 Eth', async function () {
    await feedRegistry.setPrice(tokenA.address, ETHAddress, ethers.utils.parseEther('0.5'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('1'));
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1.5') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      ETHAddress,
      receiver.address,
      parseEther('1.1'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateTransaction' });

    const transactionId = creationEventLog.args.id;

    await budgetApproval.connect(approver).approveTransaction(transactionId);

    await expect(budgetApproval.connect(executor).executeTransaction(transactionId))
      .to.be.revertedWith('Exceeded max budget transferable percentage');
  });

  it('can send 10 Token', async function () {
    await feedRegistry.setPrice(tokenA.address, ETHAddress, ethers.utils.parseEther('0.1'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('10'));
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      tokenA.address,
      receiver.address,
      parseEther('10'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    await budgetApproval.connect(approver).approveTransaction(id);
    await budgetApproval.connect(executor).executeTransaction(id);

    expect(await tokenA.balanceOf(receiver.address)).to.eq(ethers.utils.parseEther('10'));
  });
  it('cannot send 11 Token', async function () {
    await feedRegistry.setPrice(tokenA.address, ETHAddress, ethers.utils.parseEther('0.1'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('11'));
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('0.9') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      tokenA.address,
      receiver.address,
      parseEther('11'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    await budgetApproval.connect(approver).approveTransaction(id);
    await expect(budgetApproval.connect(executor).executeTransaction(id))
      .to.be.revertedWith('Exceeded max budget transferable percentage');
  });
});
