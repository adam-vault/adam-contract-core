const chai = require('chai');
const { ethers, upgrades, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC20BudgetApproval.sol', function () {
  let creator, executor, receiver;
  let mockToken, team, executee, unknownToken;
  let executeeAsSigner, TransferERC20BudgetApproval;

  function initializeParser (params = {}) {
    return [[
      params.executee || executee.address,
      params.executor || executor.address,
      params.executorTeamId || 0,
      params.approvers || [],
      params.approverTeamId || 0,
      params.minApproval || 0,
      params.text || 'text',
      params.transactionType || 'transactionType',
      params.startTime || Math.round(Date.now() / 1000) - 86400,
      params.endTime || Math.round(Date.now() / 1000) + 86400,
      params.allowUnlimitedUsageCount || true,
      params.usageCount || 0,
      params.team || team.address,
    ],
    params.allowAllToAddresses !== undefined ? params.allowAllToAddresses : true,
    params.toAddresses || [],
    params.allowAllTokens !== undefined ? params.allowAllTokens : true,
    params.token || ethers.constants.AddressZero,
    params.allowAnyAmount !== undefined ? params.allowAnyAmount : true,
    params.totalAmount || 0,
    params.amountPercentage || '100'];
  }

  function encodeTxData (token, receiver, amount) {
    return abiCoder.encode(['address token', 'address to', 'uint256 amount'], [
      token,
      receiver,
      amount,
    ]);
  }

  function encodeTransferData (to, amount) {
    return mockToken.interface.encodeFunctionData('transfer', [
      to,
      amount,
    ]);
  }

  beforeEach(async function () {
    [creator, executor, receiver] = await ethers.getSigners();

    team = await smock.fake('Team');
    executee = await smock.fake('MockBudgetApprovalExecutee');
    mockToken = await smock.fake('ERC20');
    unknownToken = await smock.fake('ERC20');

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [executee.address],
    });
    await network.provider.send(
      'hardhat_setBalance', [
        executee.address,
        '0x10000000000000000000000000000',
      ]);

    executeeAsSigner = await ethers.getSigner(executee.address);
    TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer: executeeAsSigner });
  });

  describe('initialize()', async function () {
    it('init with params with the least setting successfully', async () => {
      const transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser());
      expect(await transferErc20BA.name()).to.be.eq('Transfer ERC20 Budget Approval');
      expect(await transferErc20BA.allowAllAddresses()).to.be.eq(true);
      expect(await transferErc20BA.allowAllTokens()).to.be.eq(true);
      expect(await transferErc20BA.token()).to.be.eq(ethers.constants.AddressZero);
      expect(await transferErc20BA.allowAnyAmount()).to.be.eq(true);
      expect(await transferErc20BA.totalAmount()).to.be.eq(ethers.BigNumber.from('0'));
      expect(await transferErc20BA.amountPercentage()).to.be.eq(ethers.BigNumber.from('100'));
    });
    it('init with params with complex setting successfully', async () => {
      const transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
        allowAllToAddresses: false,
        toAddresses: [],
        allowAllTokens: false,
        token: mockToken.address,
        allowAnyAmount: false,
        totalAmount: ethers.BigNumber.from('1000'),
        amountPercentage: '90',
      }));
      expect(await transferErc20BA.name()).to.be.eq('Transfer ERC20 Budget Approval');
      expect(await transferErc20BA.allowAllAddresses()).to.be.eq(false);
      expect(await transferErc20BA.allowAllTokens()).to.be.eq(false);
      expect(await transferErc20BA.token()).to.be.eq(mockToken.address);
      expect(await transferErc20BA.allowAnyAmount()).to.be.eq(false);
      expect(await transferErc20BA.totalAmount()).to.be.eq(ethers.BigNumber.from('1000'));
      expect(await transferErc20BA.amountPercentage()).to.be.eq(ethers.BigNumber.from('90'));
    });
    it('throws "Duplicated address in target address list" error if toAddresses duplicated', async () => {
      await expect(upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
        allowAllToAddresses: false,
        toAddresses: [creator.address, creator.address],
        allowAllTokens: true,
        token: ethers.constants.AddressZero,
        allowAnyAmount: true,
        totalAmount: 0,
        amountPercentage: '100',
      }))).to.be.revertedWith('Duplicated address in target address list');
    });
  });

  describe('executeParams()', async function () {
    let transferErc20BA;
    beforeEach(async function () {
      transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser());
    });
    it('describes execute params', async function () {
      expect(await transferErc20BA.executeParams()).to.be.deep.equal(['address token', 'address to', 'uint256 value']);
    });
  });

  describe('execute()', async function () {
    context('allow limited absolute amount', async function () {
      let transferErc20BA;
      beforeEach(async function () {
        transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
          allowAllToAddresses: true,
          toAddresses: [],
          allowAllTokens: true,
          token: ethers.constants.AddressZero,
          allowAnyAmount: false,
          totalAmount: 100,
          amountPercentage: '100',
        }));
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to transfer under allow amount', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;

        executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
          mockToken.address,
          encodeTransferData(receiver.address, 50),
          BigNumber.from('0'));
      });

      it('allows user to transfer equal allow amount', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 100),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('allows user to transfer amount twice', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;

        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('throws "Exceeded max budget transferable amount" error if the 1st time outflow exceeds amount limit', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 101),
        ], Date.now() + 86400, true)).to.be.revertedWith('Exceeded max budget transferable amount');
      });

      it('throws "Exceeded max budget transferable amount" error if the 2nd time outflow exceeds amount limit', async function () {
        await transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true);

        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 51),
        ], Date.now() + 86400, true)).to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });

    context('allow limited percentage of token', async function () {
      let transferErc20BA;
      beforeEach(async function () {
        transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
          allowAllToAddresses: true,
          toAddresses: [],
          allowAllTokens: true,
          token: ethers.constants.AddressZero,
          allowAnyAmount: true,
          totalAmount: 0,
          amountPercentage: '50',
        }));
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to transfer under allow percentage amount', async function () {
        mockToken.balanceOf.returns(200);
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('allows user to transfer equal allow percentage amount', async function () {
        mockToken.balanceOf.returns(50);
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 25),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });
      it('allows user to transfer percentage amount twice', async function () {
        mockToken.balanceOf.returns(50);
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
        ], Date.now() + 86400, true)).to.not.be.reverted;

        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('throws "Exceeded max budget transferable percentage" error if outflow with 0 and have no balance', async function () {
        mockToken.balanceOf.returns(0);
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 0),
        ], Date.now() + 86400, true)).to.be.revertedWith('Exceeded max budget transferable percentage');
      });

      it('throws "Exceeded max budget transferable percentage" error if the 1st time outflow exceeds percentage limit', async function () {
        mockToken.balanceOf.returns(50);
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 51),
        ], Date.now() + 86400, true)).to.be.revertedWith('Exceeded max budget transferable percentage');
      });

      it('throws "Exceeded max budget transferable percentage" error if the 2nd time outflow exceeds percentage limit', async function () {
        mockToken.balanceOf.returns(50);
        await transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 25),
        ], Date.now() + 86400, true);

        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 51),
        ], Date.now() + 86400, true)).to.be.revertedWith('Exceeded max budget transferable percentage');
      });
    });

    context('allow limited toAddresses', async function () {
      let transferErc20BA;
      beforeEach(async function () {
        transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
          allowAllToAddresses: false,
          toAddresses: [receiver.address],
        }));
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to transfer to whitelisted address', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('throws "Recipient not whitelisted in budget" error if send to non-permitted receiver', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, executor.address, 25),
        ], Date.now() + 86400, true)).to.be.revertedWith('Recipient not whitelisted in budget');
      });
    });

    context('allow limited token contract', async function () {
      let transferErc20BA;
      beforeEach(async function () {
        executee.executeByBudgetApproval.returns('0x');
        transferErc20BA = await upgrades.deployProxy(TransferERC20BudgetApproval, initializeParser({
          allowAllTokens: false,
          token: mockToken.address,
        }));
      });

      it('allows user to transfer to whitelisted address', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 50),
        ], Date.now() + 86400, true)).to.not.be.reverted;
      });

      it('throws "Token not whitelisted in budget" error if send to non-permitted receiver', async function () {
        await expect(transferErc20BA.connect(executor).createTransaction([
          encodeTxData(unknownToken.address, receiver.address, 25),
        ], Date.now() + 86400, true)).to.be.revertedWith('Token not whitelisted in budget');
      });
    });
  });
});
