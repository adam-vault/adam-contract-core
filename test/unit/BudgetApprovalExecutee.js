const chai = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { parseEther } = ethers.utils;
chai.should();
chai.use(smock.matchers);

describe('BudgetApprovalExecuteeV2.sol - test/unit/BudgetApprovalExecutee.js', async function () {
  let deployer, team, budgetApproval, unknown;
  let executee, weth;
  beforeEach(async function () {
    [deployer, team, budgetApproval, unknown] = await ethers.getSigners();
    executee = await (await smock.mock('MockBudgetApprovalExecutee', deployer)).deploy();
    weth = await smock.fake('MockWETH9');

    await executee.setVariables({
      _team: team.address,
      _budgetApprovals: {
        [budgetApproval.address]: true,
      },
    });

    await ethers.provider.send('hardhat_setBalance', [
      executee.address,
      parseEther('1000').toHexString(),
    ]);
  });

  describe('team()', async function () {
    it('returns team address', async () => {
      expect(await executee.team()).to.eq(team.address);
    });
  });
  describe('budgetApprovals()', async function () {
    it('returns if address in budgetApproval mapping', async () => {
      expect(await executee.budgetApprovals(budgetApproval.address)).to.eq(true);
      expect(await executee.budgetApprovals(unknown.address)).to.eq(false);
    });
  });
  describe('executeByBudgetApproval()', async function () {
    it('executes call and values to target contract', async () => {
      await executee.connect(budgetApproval).executeByBudgetApproval(
        weth.address,
        weth.interface.encodeFunctionData('deposit'),
        parseEther('1'),
      );
      expect(weth.deposit).to.have.been.calledWithValue(parseEther('1'));
    });
    it('throws error if target contract call fails', async () => {
      weth.deposit.reverts('Something went wrong');
      await expect(executee.connect(budgetApproval).executeByBudgetApproval(
        weth.address,
        weth.interface.encodeFunctionData('deposit'),
        parseEther('1'),
      )).to.be.revertedWith('Reverted by external contract - ');
    });
    it('throws "OnlyBudgetApproval" error if not call be budget approval', async () => {
      await expect(executee.connect(unknown).executeByBudgetApproval(
        weth.address,
        weth.interface.encodeFunctionData('deposit'),
        parseEther('1'),
      )).to.be.revertedWithCustomError(executee, 'OnlyBudgetApproval');
    });
  });
  describe('createBudgetApprovals()', async function () {
    let mockBudgetApproval, params;
    beforeEach(async function () {
      mockBudgetApproval = await (await smock.mock('MockBudgetApproval', deployer)).deploy();
      params = [[
        deployer.address, // executor
        0, // executorTeam
        [], // approvers
        0, // approverTeam
        0, // minApproval
        'Transfer Liquid ERC20', // text
        'outflowLiquid', // transaction type
        0, // startTime
        0, // endTime
        false, // allow unlimited usage
        10, // usage count
      ]];
    });
    it('executes call and values to target contract', async () => {
      const tx = await executee.createBudgetApprovals(
        [mockBudgetApproval.address],
        [mockBudgetApproval.interface.encodeFunctionData('initialize', params)]);
      await expect(tx).to.emit(executee, 'CreateBudgetApproval');
    });
    it('throws "InputLengthNotMatch" if params length not match', async () => {
      await expect(executee.createBudgetApprovals(
        [mockBudgetApproval.address, mockBudgetApproval.address],
        [mockBudgetApproval.interface.encodeFunctionData('initialize', params)]),
      ).to.be.revertedWithCustomError(executee, 'InputLengthNotMatch');
    });
  });

  describe('revokeBudgetApprovals()', async () => {
    it('revokes target budget approvals', async () => {
      const tx = await executee.revokeBudgetApprovals([budgetApproval.address]);
      await expect(tx).to.emit(executee, 'RevokeBudgetApproval');
    });

    it('throws "BudgetApprovalNotExists"', async () => {
      await expect(executee.revokeBudgetApprovals([unknown.address])).to.be.revertedWithCustomError(executee, 'BudgetApprovalNotExists');
    });
  });
});
