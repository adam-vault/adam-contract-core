const chai = require('chai');
const { ethers, upgrades, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC721BudgetApproval.sol', function () {
  let creator, executor, receiver;
  let mockToken, team, executee;
  let executeeAsSigner, TransferERC721BudgetApproval;

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
    params.tokens || [],
    params.allowAnyAmount !== undefined ? params.allowAnyAmount : true,
    params.totalAmount || 0];
  }

  function encodeTxData (token, receiver, tokenId) {
    return abiCoder.encode(['address token', 'address to', 'uint256 tokenId'], [
      token,
      receiver,
      tokenId,
    ]);
  }

  function encodeTransferData (from, to, tokenId) {
    return mockToken.interface.encodeFunctionData('safeTransferFrom(address,address,uint256)', [
      from,
      to,
      tokenId,
    ]);
  }

  beforeEach(async function () {
    [creator, executor, receiver] = await ethers.getSigners();

    team = await smock.fake('Team');
    executee = await smock.fake('MockBudgetApprovalExecutee');
    mockToken = await smock.fake('ERC721');

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
    TransferERC721BudgetApproval = await ethers.getContractFactory('TransferERC721BudgetApproval', { signer: executeeAsSigner });
  });

  describe('initialize()', async function () {
    it('init with params with the least setting successfully', async () => {
      const transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
        allowAllToAddresses: true,
        toAddresses: [],
        allowAllTokens: true,
        token: ethers.constants.AddressZero,
        allowAnyAmount: true,
        totalAmount: 0,
      }));

      expect(await transferErc721BA.name()).to.be.eq('Transfer ERC721 Budget Approval');
      expect(await transferErc721BA.allowAllAddresses()).to.be.eq(true);
      expect(await transferErc721BA.allowAllTokens()).to.be.eq(true);
      expect(await transferErc721BA.allowAnyAmount()).to.be.eq(true);
      expect(await transferErc721BA.totalAmount()).to.be.eq(ethers.BigNumber.from('0'));
    });

    it('init with params with complex setting successfully', async () => {
      const transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
        allowAllToAddresses: false,
        toAddresses: [],
        allowAllTokens: false,
        token: mockToken.address,
        allowAnyAmount: false,
        totalAmount: ethers.BigNumber.from('1000'),
      }));

      expect(await transferErc721BA.name()).to.be.eq('Transfer ERC721 Budget Approval');
      expect(await transferErc721BA.allowAllAddresses()).to.be.eq(false);
      expect(await transferErc721BA.allowAllTokens()).to.be.eq(false);
      expect(await transferErc721BA.allowAnyAmount()).to.be.eq(false);
      expect(await transferErc721BA.totalAmount()).to.be.eq(ethers.BigNumber.from('1000'));
    });

    it('throws "Duplicated address in target address list" error if toAddresses duplicated', async () => {
      await expect(upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
        toAddresses: [creator.address, creator.address],
      }))).to.be.revertedWith('Duplicated address in target address list');
    });

    it('throws "Duplicated Item in source token list" error if tokens duplicated', async () => {
      await expect(upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
        tokens: [mockToken.address, mockToken.address],
      }))).to.be.revertedWith('Duplicated Item in source token list');
    });
  });

  describe('executeParams()', async function () {
    let transferErc721BA;
    beforeEach(async function () {
      transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser());
    });

    it('describes execute params', async function () {
      expect(await transferErc721BA.executeParams()).to.be.deep.equal(['address token', 'address to', 'uint256 tokenId']);
    });
  });

  describe('execute()', async function () {
    context('allow limited absolute amount', async function () {
      let transferErc721BA;
      beforeEach(async function () {
        transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
          allowAllToAddresses: true,
          toAddresses: [],
          allowAllTokens: true,
          tokens: [],
          allowAnyAmount: false,
          totalAmount: 3,
        }));
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to transfer under allow amount', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;

        executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
          mockToken.address,
          encodeTransferData(executee.address, receiver.address, 1),
          BigNumber.from('0'));
      });

      it('allows user to transfer equal allow amount', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
          encodeTxData(mockToken.address, receiver.address, 2),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;
      });

      it('allows user to transfer amount twice', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
          encodeTxData(mockToken.address, receiver.address, 2),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;

        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 3),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Exceeded max budget transferable amount" error if the 1st time outflow exceeds amount limit', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
          encodeTxData(mockToken.address, receiver.address, 2),
          encodeTxData(mockToken.address, receiver.address, 3),
          encodeTxData(mockToken.address, receiver.address, 4),
        ], Date.now() + 86400, true, '')).to.be.revertedWith('Exceeded max budget transferable amount');
      });

      it('throws "Exceeded max budget transferable amount" error if the 2nd time outflow exceeds amount limit', async function () {
        await transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
          encodeTxData(mockToken.address, receiver.address, 2),
        ], Date.now() + 86400, true, '');

        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 3),
          encodeTxData(mockToken.address, receiver.address, 4),
        ], Date.now() + 86400, true, '')).to.be.revertedWith('Exceeded max budget transferable amount');
      });
    });

    context('allow limited toAddresses', async function () {
      let transferErc721BA;
      beforeEach(async function () {
        transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
          allowAllToAddresses: false,
          toAddresses: [receiver.address],
        }));
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to transfer to whitelisted address', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Recipient not whitelisted in budget" error if send to non-permitted receiver', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, executor.address, 1),
        ], Date.now() + 86400, true, '')).to.be.revertedWith('Recipient not whitelisted in budget');
      });
    });

    context('allow limited tokens contract', async function () {
      let transferErc721BA, unknownToken;

      beforeEach(async function () {
        transferErc721BA = await upgrades.deployProxy(TransferERC721BudgetApproval, initializeParser({
          allowAllTokens: false,
          tokens: [mockToken.address],
        }));
        executee.executeByBudgetApproval.returns('0x');
        unknownToken = await smock.fake('ERC721');
      });

      it('allows user to transfer to whitelisted address', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(mockToken.address, receiver.address, 1),
        ], Date.now() + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Token not whitelisted in budget" error if send to non-permitted receiver', async function () {
        await expect(transferErc721BA.connect(executor).createTransaction([
          encodeTxData(unknownToken.address, receiver.address, 1),
        ], Date.now() + 86400, true, '')).to.be.revertedWith('Token not whitelisted in budget');
      });
    });
  });
});
