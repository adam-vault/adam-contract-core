const { expect } = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const findEventArgs = require('../../utils/findEventArgs');
const decodeBase64 = require('../utils/decodeBase64');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens, createPriceGateways } = require('../utils/createContract.js');
const paramsStruct = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
} = require('../utils/constants');

describe('Integration - LiquidPool.sol - test/integration/LiquidPool.js', async function () {
  let adam, tokenC721, tokenA, tokenD1155;
  let creator, member, anyone, feedRegistry, ethereumChainlinkPriceGateway, membership;

  function createDao () {
    return adam.createDao(...paramsStruct.getCreateDaoParams({
      name: 'A Company',
      priceGateways: [ethereumChainlinkPriceGateway],
    }));
  };

  beforeEach(async function () {
    [creator, member, anyone] = await ethers.getSigners();
    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    const result = await createAdam();
    adam = result.adam;
    membership = result.membership;
    ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
  });

  context('when deposit() called', async function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
    });

    it('creates Membership', async function () {
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('resolves token uri with member address', async function () {
      const tx = await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await tx.wait();

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
    });

    it('should not recreate Member when deposit() again', async function () {
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('0.000123') });

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(lp.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });

    context('when has no member token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            mintMemberToken: false,
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows owner to call deposit()', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.deposit(creator.address, { value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });

      it('allows anyone to call deposit()', async function () {
        const balance = await ethers.provider.getBalance(lp.address);
        await lp.connect(anyone).deposit(anyone.address, { value: 1 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(balance.add(1));
      });
    });

    context('when using ERC721 Admission token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenC721.address, 1, 0, false]],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with enough ERC721 Admission Token', async function () {
        await tokenC721.mint(member.getAddress(), 1);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('throws "InsufficientAdmissionToken" error with not enough ERC721 Admission Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    context('when using ERC20 Admission token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenA.address, 1, 0, false]],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      // TODO: Move to unit test
      // it('should be able to create member token', async function () {
      //   await expect(dao.exposedCreateMemberToken(memberTokenImpl, ['name1', 'symbol1'], 100));
      //   const memberTokenAddr = await dao.memberToken();
      //   const memberToken = await ethers.getContractAt('MemberToken', memberTokenAddr);

      //   await expect(await memberToken.balanceOf(dao.address)).to.eq(100);
      // });

      it('allows EOA to deposit successfully with enough ERC20 Admission Token', async function () {
        await tokenA.mint(member.getAddress(), 1);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
        expect(await ethers.provider.getBalance(lp.address)).to.equal(1);
      });

      it('throws "InsufficientAdmissionToken" error with not enough ERC20 Admission Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    context('when using ERC1155 Admission token', async function () {
      beforeEach(async function () {
        ({ tokenD1155 } = await createTokens());
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [[tokenD1155.address, 1, 0, false]],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with enough ERC1155 Member Token', async function () {
        await tokenD1155.mint(member.address, 0, 1, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
      });

      it('throws "InsufficientAdmissionToken" error with not enough ERC1155 Member Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    describe('when using ERC20 member token as Admission token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );

        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('throws "InsufficientAdmissionToken" error with not enough ERC20 Member Token', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    context('when using mutiple ERC20 and 721 Admission Token', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [tokenC721.address, 1, 0, false],
              [tokenA.address, 2, 0, false],
              [tokenD1155.address, 2, 111, false],
            ],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with both admission tokens enough', async function () {
        await tokenA.mint(member.address, 2);
        await tokenC721.mint(member.address, 222);
        await tokenD1155.mint(member.address, 111, 2, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.not.be.reverted;
      });

      it('throws "InsufficientAdmissionToken" error with both admission tokens not enough', async function () {
        await tokenA.mint(member.address, 1);
        await tokenD1155.mint(member.address, 111, 1, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });

      it('throws "InsufficientAdmissionToken" error with two InsufficientAdmissionToken', async function () {
        await tokenC721.mint(member.address, 222);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });

      it('throws "InsufficientAdmissionToken" error with one InsufficientAdmissionToken', async function () {
        await tokenC721.mint(member.address, 222);
        await tokenD1155.mint(member.address, 111, 2, 0);
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    context('when using non valid Admission Token', async function () {
      beforeEach(async function () {
        const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
        const nonERC20Contract = await MockUpgrade.deploy();

        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [nonERC20Contract.address, 1, 0, false],
            ],
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('throws "InsufficientAdmissionToken" error when deposit', async function () {
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.be.revertedWithCustomError(membership, 'InsufficientAdmissionToken');
      });
    });

    context('when using non contract Admission Token', async function () {
      it('throws ContractCallFail', async function () {
        await expect(adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            admissionTokens: [
              [ethers.constants.AddressZero, 1, 0, false],
            ],
          }),
        )).to.be.revertedWithCustomError(dao, 'ContractCallFail');
      });
    });

    context('when minDepositAmount is set', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            minDepositAmount: 50,
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      });

      it('allows EOA to deposit successfully with amount > minDepositAmount', async function () {
        await lp.deposit(creator.address, { value: 100 });
        expect(await ethers.provider.getBalance(lp.address)).to.equal(100);
      });

      it('throws "InsufficientDeposit" error with amount < minDepositAmount', async function () { // todo: need to create another test case for non DAO creator
        await expect(lp.deposit(creator.address, { value: 1 })).to.revertedWithCustomError(dao, 'InsufficientDeposit');
      });
    });

    context('when maxMemberLimit is set', async function () {
      beforeEach(async function () {
        const tx1 = await adam.createDao(
          ...paramsStruct.getCreateDaoParams({
            maxMemberLimit: 1,
            priceGateways: [ethereumChainlinkPriceGateway],
          }),
        );
        const receipt = await tx1.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
        const daoAddr = creationEventLog.args.dao;
        dao = await ethers.getContractAt('MockDao', daoAddr);
        lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
        membership = await ethers.getContractAt('Membership', await dao.membership());
      });

      it('allows EOA to deposit successfully when member limit not exceed', async function () { // todo: need to create another test case for non DAO creator
        await lp.deposit(creator.address, { value: 100 });
        expect(await membership.totalSupply()).to.equal(1);
      });

      it('throws "MemberLimitExceeds" error when member limit exceed', async function () {
        await lp.deposit(creator.address, { value: 100 });
        await expect(lp.connect(member).deposit(member.address, { value: 1 })).to.revertedWithCustomError(membership, 'MemberLimitExceeds');
      });
    });
  });

  context('when redeem() called', async function () {
    let dao, lp, membership;
    beforeEach(async function () {
      const tx1 = await adam.createDao(...paramsStruct.getCreateDaoParams({
        lockTime: 1000,
        depositTokens: [ADDRESS_ETH, tokenA.address], // depositTokens
        priceGateways: [ethereumChainlinkPriceGateway],
      }),
      );
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
      dao = await ethers.getContractAt('Dao', daoAddr);

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      lp = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      await lp.deposit(creator.address, { value: ethers.utils.parseEther('123') });
    });

    it('redeems and burns exact amount of eth', async function () {
      await ethers.provider.send('evm_increaseTime', [1000]);
      await lp.redeem(ethers.utils.parseEther('3'));

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await lp.balanceOf(creator.address)).to.equal(ethers.utils.parseEther('120'));
    });
    it('cannot redeem and burn exact amount of eth inside lockup period', async function () {
      await expect(lp.redeem(ethers.utils.parseEther('3'))).to.be.revertedWithCustomError(lp, 'BlockedByLocktime');
    });
  });
});
