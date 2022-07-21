const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');
const { getCreateTransferERC721BAParams } = require('../../utils/paramsStruct');

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC721BudgetApproval.sol', function () {
  let adam, dao, transferERC721BAImplementation, budgetApproval;
  let executor, approver, receiver;
  let tokenC721, feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenC721 } = await createTokens());

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);

    const tx1 = await adam.createDao(
      paramsStruct.getCreateDaoParams({}),
    );
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
    const transferERC721BAImplementationAddr = budgetApprovalAddresses[2];
    transferERC721BAImplementation = await ethers.getContractAt('TransferERC721BudgetApproval', transferERC721BAImplementationAddr);
  });

  describe('On Treasury', function () {
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
      expect(await budgetApproval.dao()).to.eq(dao.address);
    });

    it('transfer ERC 721 Token should success', async function () {
      await tokenC721.mint(dao.address, 1);
      const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        1,
      ]);

      const tx = await budgetApproval.connect(executor).createTransaction([transactionData], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.balanceOf(dao.address)).to.eq(0);
      expect(await tokenC721.balanceOf(receiver.address)).to.eq(1);
    });

    it('transfer multiple ERC721 should success', async function () {
      await tokenC721.mint(dao.address, 2);
      await tokenC721.mint(dao.address, 3);
      const transactionDataId1 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        2,
      ]);
      const transactionDataId2 = abiCoder.encode(await budgetApproval.executeParams(), [
        tokenC721.address,
        receiver.address,
        3,
      ]);
      const tx = await budgetApproval.connect(executor).createTransaction([transactionDataId1, transactionDataId2], Date.now() + 86400, false);
      const { id } = await findEventArgs(tx, 'CreateTransaction');

      const orgReceiverBalance = await tokenC721.balanceOf(receiver.address);
      await budgetApproval.connect(approver).approveTransaction(id);
      await budgetApproval.connect(executor).executeTransaction(id);

      expect(await tokenC721.balanceOf(dao.address)).to.eq(0);
      expect(await tokenC721.balanceOf(receiver.address)).to.eq(Number(orgReceiverBalance) + 2);
    });
  });
});
