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

describe('TransferLiquidERC20BudgetApproval.sol - test Chainlink Fixed Price limit', function () {
  let transferLiquidERC20BAImplementation, budgetApproval;
  let executor, executee, approver, receiver, dao, team;
  let tokenA, feedRegistry;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { sign: executor });

    team = await Team.deploy();
    dao = await MockLPDao.deploy();
    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, parseEther('1'));

    const startTime = Math.round(Date.now() / 1000) - 86400;
    const endTime = Math.round(Date.now() / 1000) + 86400;
    const initData = TransferLiquidERC20BudgetApproval.interface.encodeFunctionData('initialize', [
      [
        dao.address, // dao addressc
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
      ethers.utils.parseEther('1'), // allowed total amount
      '100', // allowed amount percentage
      ADDRESS_ETH, // base currency
    ]);

    const tx = await executee.createBudgetApprovals(
      [transferLiquidERC20BAImplementation.address], [initData],
    );
    const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

    budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
    await executor.sendTransaction({ to: executee.address, value: ethers.utils.parseEther('1') });

    const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
      ADDRESS_ETH,
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
      ADDRESS_ETH,
      receiver.address,
      parseEther('1.1'),
    ]);

    const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    await budgetApproval.connect(approver).approveTransaction(id);
    await expect(budgetApproval.connect(executor).executeTransaction(id))
      .to.be.revertedWith('Exceeded max budget transferable amount');
  });

  it('can send 10 Token', async function () {
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, ethers.utils.parseEther('0.1'));
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
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, ethers.utils.parseEther('0.1'));
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
      .to.be.revertedWith('Exceeded max budget transferable amount');
  });
});
