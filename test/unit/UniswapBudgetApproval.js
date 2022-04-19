const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');

const { createTokens, createAdam } = require('../utils/createContract');

describe('Testing UniswapBudgetApproval', function () {
  let adam, dao, uniswapBAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenA, mockWETH9;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA, mockWETH9 } = await createTokens());

    adam = await createAdam({ network: 'test' });
    const testConstantState = await ethers.getContractAt(
      'MockConstant',
      await adam.constantState(),
    );
    await testConstantState.setConstant(
      ethers.constants.AddressZero,
      mockWETH9.address,
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    );
    await adam.createDao([
      'A Company', // _name
      'Description', // _description
      10000000, // _locktime
      1, // MemberTokenType
      '0x0000000000000000000000000000000000000000', // memberToken
      [13, 3000, 5000, 0], // budgetApproval
      [13, 3000, 5000, 0], // revokeBudgetApproval
      [13, 3000, 5000, 0], // general,
      [13, 3000, 5000, 1], // daoSetting
      ['name', 'symbol'], // tokenInfo
      1,
      0, // minDepositAmount
      0, // minMemberTokenToJoin
    ]);
    const daoAddr = await adam.daos(0);
    dao = await ethers.getContractAt('Dao', daoAddr);
    const uniswapBAImplementationAddr = await adam.budgetApprovals(1);
    uniswapBAImplementation = await ethers.getContractAt(
      'UniswapBudgetApproval',
      uniswapBAImplementationAddr,
    );
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const initData =
        await uniswapBAImplementation.callStatic.encodeUniswapInitializeData(
          [
            dao.address, // dao address
            executor.address, // executor
            [], // approvers
            0, // minApproval
            'Uniswap', // text
            'Swap', // transaction type
            false, // allow all addresses,
            [receiver.address], // allowed addresses (use when above = false)
            [ethers.constants.AddressZero, tokenA.address, mockWETH9.address], // allowed token (use when above = false)
            false, // allow any amount
            ethers.utils.parseEther('100'), // allowed total amount
            1000, // allowed amount percentage
            Math.round(Date.now() / 1000) - 86400, // startTime
            Math.round(Date.now() / 1000) + 86400, // endTime
          ],
          false,
          [ethers.constants.AddressZero, tokenA.address, mockWETH9.address],
        );

      const tx = await dao.createBudgetApprovals(
        [uniswapBAImplementation.address],
        [initData],
      );
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, {
        event: 'CreateBudgetApproval',
      });
      const budgetApprovalAddress = creationEventLog.args.budgetApproval;

      budgetApproval = await ethers.getContractAt(
        'UniswapBudgetApproval',
        budgetApprovalAddress,
      );

      expect(await dao.callStatic.budgetApprovals(budgetApprovalAddress)).to.eq(
        true,
      );

      expect(await budgetApproval.callStatic.dao()).to.eq(dao.address);
      expect(await budgetApproval.callStatic.executor()).to.eq(
        executor.address,
      );

      expect(await budgetApproval.callStatic.allowAllAddresses()).to.eq(false);
      expect(
        await budgetApproval.callStatic.addressesMapping(receiver.address),
      ).to.eq(true);

      expect(await budgetApproval.callStatic.tokens(0)).to.eq(
        ethers.constants.AddressZero,
      );
      expect(await budgetApproval.callStatic.tokens(1)).to.eq(tokenA.address);
      expect(
        await budgetApproval.callStatic.tokensMapping(
          ethers.constants.AddressZero,
        ),
      ).to.eq(true);
      expect(
        await budgetApproval.callStatic.tokensMapping(tokenA.address),
      ).to.eq(true);

      expect(await budgetApproval.callStatic.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.callStatic.totalAmount()).to.eq(
        ethers.utils.parseEther('100'),
      );
      expect(await budgetApproval.callStatic.amountPercentage()).to.eq(1000);

      expect(await budgetApproval.callStatic.allowAllToTokens()).to.eq(false);
      expect(
        await budgetApproval.callStatic.toTokensMapping(tokenA.address),
      ).to.eq(true);
      expect(
        await budgetApproval.callStatic.toTokensMapping(mockWETH9.address),
      ).to.eq(true);
    });
  });

  describe('Execute Transaction', function () {
    beforeEach(async function () {
      await dao
        .connect(executor)
        .deposit({ value: 10000 });
    });
    context('ETH => WETH', () => {
      it('should success', async function () {
        const transferData = mockWETH9.interface.encodeFunctionData('deposit');
        const transactionData = budgetApproval.callStatic.encodeTransactionData(
          mockWETH9.address,
          transferData,
          100,
        );

        await dao
          .connect(executor)
          .createBudgetApprovalTransaction(
            budgetApproval.address,
            transactionData,
            Math.round(Date.now() / 1000) + 86400,
            true,
          );

        expect(await mockWETH9.balanceOf(dao.address)).to.eq(100);
      });
    });

    context('WETH => ETH', () => {
      it('should success', async function () {
        const transferData = mockWETH9.interface.encodeFunctionData(
          'withdraw',
          [100],
        );
        const transactionData = budgetApproval.callStatic.encodeTransactionData(
          mockWETH9.address,
          transferData,
          0,
        );

        await dao
          .connect(executor)
          .createBudgetApprovalTransaction(
            budgetApproval.address,
            transactionData,
            Math.round(Date.now() / 1000) + 86400,
            true,
          );

        expect(await mockWETH9.balanceOf(dao.address)).to.eq(0);
      });
    });
  });
});
