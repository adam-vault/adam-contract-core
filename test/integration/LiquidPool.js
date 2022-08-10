const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

const { createTokens, createAdam, createBudgetApprovals } = require('../utils/createContract');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('LiquidPool.sol', function () {
  let adam, dao, lp;
  let executor, signer;

  let tokenA, tokenC721, tokenD1155;
  let feedRegistry, budgetApprovalAddresses;

  before(async function () {
    [executor, signer] = await ethers.getSigners();

    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    budgetApprovalAddresses = await createBudgetApprovals(executor);
    adam = await createAdam(feedRegistry, budgetApprovalAddresses);
  });

  describe('No Admission Token Required', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({}),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit success', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });

  describe('Single ERC20 Admission Require', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({
          admissionTokens: [[tokenA.address, 1, 0, false]],
        }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit fail if admission token not enough', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit success if admission token enough', async function () {
      await tokenA.mint(signer.address, 1);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });

  describe('Single ERC721 Admission Require', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({
          admissionTokens: [[tokenC721.address, 1, 0, false]],
        }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit fail if admission token not enough', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit success if admission token enough', async function () {
      await tokenC721.mint(signer.address, 1);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });

  describe('Single ERC1155 Admission Token Require', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({
          admissionTokens: [[tokenD1155.address, 1, 0, false]],
        }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit fail if admission token not enough', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit success if admission token enough', async function () {
      await tokenD1155.mint(signer.address, 0, 1, 0);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });

  describe('Member Token As Single Admission Token Require ', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({
          admissionTokens: [[ethers.constants.AddressZero, 1, 0, true]],
          mintMemberToken: true,
        }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('MockDaoV2', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit fail if admission token not enough', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit success if admission token enough', async function () {
      await dao.exposedMintMemberToken(1);
      await dao.exposedTransferMemberToken(signer.address, 1);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });

  describe('Mutiple ERC20 and 721 Admission Token Require', function () {
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        paramsStruct.getCreateDaoParams({
          admissionTokens: [
            [tokenC721.address, 2, 0, false],
            [tokenA.address, 2, 0, false],
            [tokenD1155.address, 2, 0, false],
          ],
        }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('deposit fail if both admission tokens not enough', async function () {
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit fail if two admission token not enough', async function () {
      await tokenC721.mint(signer.address, 2);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit fail if one admission token not enough', async function () {
      await tokenD1155.mint(signer.address, 0, 1, 0);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.be.revertedWith('Admission token not enough');
    });

    it('deposit success if both admission tokens enough', async function () {
      await tokenA.mint(signer.address, 1);
      await expect(lp.connect(signer).deposit(signer.address, { value: 1 })).to.not.be.reverted;
    });
  });
});
