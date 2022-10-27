const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const findEventArgs = require('../../../utils/findEventArgs');

const { createTokens } = require('../../utils/createContract');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApprovalV2.sol - test Chainlink Percentage limit - test/unit/TransferLiquidERC20BudgetApprovalV2-percentageLimit.js', function () {
  let transferLiquidERC20BAImplementation, budgetApproval, dao, team;
  let executor, executee, approver, receiver;
  let tokenA, feedRegistry;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApprovalV2', { signer: executor });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });

    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();
    dao = await MockLPDao.deploy();
    team = await Team.deploy();

    const feedRegistryArticfact = require('../../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, parseEther('1'));
    await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);

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
      true, // allow any amount
      0, // allowed total amount
      ADDRESS_ETH, // base currency
      [],
    ]);

    const tx = await executee.createBudgetApprovals(
      [transferLiquidERC20BAImplementation.address], [initData],
    );
    const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

    budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApprovalV2', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
    await feedRegistry.setPrice(
      tokenA.address,
      ADDRESS_ETH,
      ethers.utils.parseEther('0.5'),
    );
    await tokenA.mint(executee.address, ethers.utils.parseEther('1'));
    await executor.sendTransaction({
      to: executee.address,
      value: ethers.utils.parseEther('1.5'),
    });

    const transactionData = abiCoder.encode(
      await budgetApproval.executeParams(),
      [ADDRESS_ETH, receiver.address, parseEther('1')],
    );

    const tx = await budgetApproval
      .connect(executor)
      .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
    const { id } = await findEventArgs(tx, 'CreateTransaction');

    const originalBalance = await receiver.getBalance();
    await budgetApproval.connect(approver).approveTransaction(id, '');
    await budgetApproval.connect(executor).executeTransaction(id);

    expect(await receiver.getBalance()).to.eq(originalBalance.add(ethers.utils.parseEther('1')));
  });

  it('can send 10 Token', async function () {
    await feedRegistry.setPrice(
      tokenA.address,
      ADDRESS_ETH,
      ethers.utils.parseEther('0.1'),
    );
    await tokenA.mint(executee.address, ethers.utils.parseEther('10'));
    await executor.sendTransaction({
      to: executee.address,
      value: ethers.utils.parseEther('1'),
    });

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

    expect(await tokenA.balanceOf(receiver.address)).to.eq(
      ethers.utils.parseEther('10'),
    );
  });
});
