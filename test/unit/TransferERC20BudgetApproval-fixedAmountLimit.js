const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');

const { createTokens } = require('../utils/createContract');

const ETHAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC20BudgetApproval.sol - test Chainlink Fixed Price limit', function () {
  let transferERC20BAImplementation, budgetApproval;
  let executor, executee, approver, receiver, dao;
  let tokenA, feedRegistry;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    const TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer: executor });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });

    dao = await MockLPDao.deploy();
    transferERC20BAImplementation = await TransferERC20BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF',
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF');
    await feedRegistry.setFeed(tokenA.address, true);
    await feedRegistry.setPrice(parseEther('1'));

    const startTime = Math.round(Date.now() / 1000) - 86400;
    const endTime = Math.round(Date.now() / 1000) + 86400;
    const initData = TransferERC20BudgetApproval.interface.encodeFunctionData('initialize', [
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
      ethers.utils.parseEther('1'), // allowed total amount
      '100', // allowed amount percentage
    ]);

    const tx = await executee.createBudgetApprovals(
      [transferERC20BAImplementation.address], [initData],
    );
    const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

    budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1') });

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
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1.1') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      ETHAddress,
      receiver.address,
      parseEther('1.1'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    await budgetApproval.connect(approver).approveTransaction(id);
    await expect(budgetApproval.connect(executor).executeTransaction(id))
      .to.be.revertedWith('invalid amount');
  });

  it('can send 10 Token', async function () {
    await feedRegistry.setPrice(ethers.utils.parseEther('0.1'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('100'));

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
    await feedRegistry.setPrice(ethers.utils.parseEther('0.1'));
    await tokenA.mint(executee.address, ethers.utils.parseEther('100'));

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      tokenA.address,
      receiver.address,
      parseEther('11'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    await budgetApproval.connect(approver).approveTransaction(id);
    await expect(budgetApproval.connect(executor).executeTransaction(id))
      .to.be.revertedWith('invalid amount');
  });
});
