const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const { smock } = require('@defi-wonderland/smock');

const findEventArgs = require('../../utils/findEventArgs');
const { getCreateTransferLiquidErc20TokenBAParams } = require('../../utils/paramsStruct');
const { createTokens } = require('../utils/createContract');

const {
  ADDRESS_ETH,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApprovalV2.sol - test Chainlink Percentage limit - test/unit/TransferLiquidERC20BudgetApprovalV2-percentageLimit.js', async function () {
  let transferLiquidERC20BAImplementation, budgetApproval;
  let executor, executee, approver, receiver, team, accountingSystem;
  let tokenA;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());
    const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { sign: executor });

    team = await Team.deploy();
    accountingSystem = await smock.fake('AccountingSystem');
    accountingSystem.isSupportedPair.whenCalledWith(tokenA.address, ADDRESS_ETH).returns(true);
    accountingSystem.isSupportedPair.whenCalledWith(ADDRESS_ETH, ADDRESS_ETH).returns(true);
    accountingSystem.assetPrice.returns(([,, amount]) => {
      return amount;
    });
    transferLiquidERC20BAImplementation = await TransferLiquidERC20BudgetApproval.deploy();
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    await executee.setVariable('_accountingSystem', accountingSystem.address);
    await executee.setVariable('_team', team.address);


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
        totalAmount: 0,
        allowAnyAmount: true,
      }),
    );
    const tx = await executee.createBudgetApprovals(
      [transferLiquidERC20BAImplementation.address], [initData],
    );
    const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');
    budgetApproval = await ethers.getContractAt('TransferLiquidERC20BudgetApproval', budgetApprovalAddress);
  });

  it('can send 1 Eth', async function () {
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