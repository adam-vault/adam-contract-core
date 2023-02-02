const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const { getCreateTransferERC721BAParams } = require('../../utils/paramsStruct');
const { smock } = require('@defi-wonderland/smock');

const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - TransferERC721BudgetApproval.sol - test/integration/TransferERC721BudgetApproval.js', async function () {
  let adam, dao, transferERC721BAImplementation, budgetApproval, team;
  let executor, approver, receiver;
  let tokenC721, budgetApprovalAddresses;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenC721 } = await createTokens());

    dao = await (await smock.mock('Dao')).deploy();
    adam = await (await smock.mock('Adam')).deploy();
    team = await (await smock.mock('Team')).deploy();

    adam.budgetApprovals.returns(true);
    transferERC721BAImplementation = await (await smock.mock('TransferERC721BudgetApproval')).deploy();

    await dao.setVariables({
      govern: {
        [ethers.utils.id('General')]: executor.address,
      },
      adam: adam.address,
    });
    dao.team.returns(team.address);
  });

  describe('On Treasury', async function () {
    let budgetApprovalAddress;
    beforeEach(async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;

      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: dao.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 1,
          startTime,
          endTime,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
        }),
      );

      const tx = await dao.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      budgetApprovalAddress = (await findEventArgs(tx, 'CreateBudgetApproval')).budgetApproval;
      budgetApproval = await ethers.getContractAt('TransferERC721BudgetApproval', budgetApprovalAddress);
    });

    it('create ERC 721 BA should success', async function () {
      expect(await dao.budgetApprovals(budgetApprovalAddress)).to.eq(true);
    });

    it('transfer ERC 721 Token should success', async function () {
      await tokenC721.mint(dao.address, 1);
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 1],
      );

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.balanceOf(dao.address)).to.eq(0);
      expect(await tokenC721.balanceOf(receiver.address)).to.eq(1);
    });

    it('transfer multiple ERC721 should success', async function () {
      await tokenC721.mint(dao.address, 2);
      await tokenC721.mint(dao.address, 3);
      const transactionDataId1 = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 2],
      );
      const transactionDataId2 = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 3],
      );
      const tx = await budgetApproval
        .connect(executor)
        .createTransaction(
          [transactionDataId1, transactionDataId2],
          Math.round(Date.now() / 1000) + 86400,
          false,
          '',
        );
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const orgReceiverBalance = await tokenC721.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.balanceOf(dao.address)).to.eq(0);
      expect(await tokenC721.balanceOf(receiver.address)).to.eq(
        Number(orgReceiverBalance) + 2,
      );
    });
  });
});

describe('Integration - TransferERC721BudgetApproval.sol 2 - test/integration/TransferERC721BudgetApproval.js', async function () {
  let transferERC721BAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenC721, executee, TransferERC721BudgetApproval, team;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();
    ({ tokenC721 } = await createTokens());

    TransferERC721BudgetApproval = await ethers.getContractFactory('TransferERC721BudgetApproval', { signer: executor });
    const Team = await ethers.getContractFactory('Team', { signer: executor });
    transferERC721BAImplementation = await TransferERC721BudgetApproval.deploy();
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    team = await Team.deploy();

    executee.team.returns(team.address);
  });

  describe('Create Budget Approval', async function () {
    it('creates budget approval', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 1,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 1,
          startTime,
          endTime,
          usageCount: 10,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC721BudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.executee()).to.eq(executee.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);
      expect(await budgetApproval.addressesMapping(receiver.address)).to.eq(true);

      expect(await budgetApproval.tokens(0)).to.eq(tokenC721.address);
      expect(await budgetApproval.tokensMapping(tokenC721.address)).to.eq(true);

      expect(await budgetApproval.allowAnyAmount()).to.eq(false);
      expect(await budgetApproval.totalAmount()).to.eq(1);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(false);
      expect(await budgetApproval.usageCount()).to.eq(10);
    });

    it('throws "InvalidApproverList"', async function () {
      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 2,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 1,
        }),
      );

      await expect(
        executee.createBudgetApprovals(
          [transferERC721BAImplementation.address],
          [initData],
        ),
      ).to.be.revertedWithCustomError(TransferERC721BudgetApproval, 'InvalidApproverList');
    });
  });

  describe('Execute Transaction (Transfer ERC721)', async function () {
    beforeEach(async function () {
      ({ tokenC721 } = await createTokens());

      const initData = TransferERC721BudgetApproval.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          approvers: [approver.address],
          minApproval: 1,
          toAddresses: [receiver.address],
          tokens: [tokenC721.address],
          totalAmount: 2,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC721BudgetApproval', budgetApprovalAddress);
    });

    it('executes transfer ERC721', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 37752],
      );

      const tx = await budgetApproval
        .connect(executor)
        .createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.ownerOf(37752)).to.eq(receiver.address);
    });

    it('executes transfer 2 ERC721s', async function () {
      await tokenC721.mint(executee.address, 37752);
      await tokenC721.mint(executee.address, 37753);

      const transactionData = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 37752],
      );
      const transactionData2 = abiCoder.encode(
        await budgetApproval.executeParams(),
        [tokenC721.address, receiver.address, 37753],
      );
      const tx = await budgetApproval
        .connect(executor)
        .createTransaction(
          [transactionData, transactionData2],
          Math.round(Date.now() / 1000) + 86400,
          false,
          '',
        );
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.ownerOf(37752)).to.eq(receiver.address);
      expect(await tokenC721.ownerOf(37753)).to.eq(receiver.address);
    });

    it('throws "Recipient not whitelisted in budget"', async function () {
      await tokenC721.mint(executee.address, 37752);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        executor.address,
        37752,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');

      await expect(
        budgetApproval.connect(executor).executeTransaction(id),
      ).to.be.revertedWith('Recipient not whitelisted in budget');
    });

    it('throws "Exceeded max budget transferable amount"', async function () {
      await tokenC721.mint(executee.address, 37752);
      await tokenC721.mint(executee.address, 37753);
      await tokenC721.mint(executee.address, 37754);

      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37752,
      ]);
      const transactionData2 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37753,
      ]);
      const transactionData3 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        37754,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionData, transactionData2, transactionData3], Math.round(Date.now() / 1000) + 86400, false, '');
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id, '');

      await expect(
        budgetApproval.connect(executor).executeTransaction(id),
      ).to.be.revertedWith('Exceeded max budget transferable amount');
    });
  });

  describe('Execute Transaction (allowAllTokens = true)', async function () {
    beforeEach(async function () {
      await tokenC721.mint(executee.address, 37754);

      const initData = transferERC721BAImplementation.interface.encodeFunctionData('initialize',
        getCreateTransferERC721BAParams({
          dao: executee.address,
          executor: executor.address,
          allowAllTokens: true,
        }),
      );

      const tx = await executee.createBudgetApprovals(
        [transferERC721BAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('TransferERC20BudgetApproval', budgetApprovalAddress);
    });

    context('complete flow', async () => {
      it('execute transfer ERC721', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          tokenC721.address,
          receiver.address,
          37754,
        ]);

        await budgetApproval.createTransaction([transactionData], Math.round(Date.now() / 1000) + 86400, true, '');

        expect(await tokenC721.ownerOf(37754)).to.eq(receiver.address);
      });
    });
  });
});
