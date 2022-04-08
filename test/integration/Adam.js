const chai = require('chai');
const hre = require('hardhat');
const _ = require('lodash');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam } = require('../utils/createContract');
const decodeBase64 = require('../utils/decodeBase64');
chai.use(smock.matchers);

describe('Create DAO', function () {
  let creator, owner1, owner2, owner3;
  let adam;

  beforeEach(async function () {
    [creator, owner1, owner2, owner3] = await ethers.getSigners();
    adam = await createAdam();
  });

  function createDao () {
    return adam.createDao(
        [
            'A Company',  //_name
            'Description', //_description
            10000000, //_locktime
            false, //isCreateToken
            [13, 3000, 5000], //budgetApproval
            [13, 3000, 5000], //revokeBudgetApproval
            [13, 3000, 5000], //general
            [], //tokenInfo
            0,
        ]
    );
  }

  it('can create dao', async function () {
    await expect(createDao())
      .to.emit(adam, 'CreateDao');

    const daoAddr = await adam.daos(0);
    const dao = await ethers.getContractAt('Dao', daoAddr);

    expect(await dao.adam()).to.equal(adam.address);
  });

  it('can upgrade dao', async function () {
    await createDao();

    const MockDaoV2 = await ethers.getContractFactory('MockDaoV2');
    const mockDaoV2 = await MockDaoV2.deploy();
    await mockDaoV2.deployed();

    const daoAddr = await adam.daos(0);
    const dao = await ethers.getContractAt('Dao', daoAddr);
    await dao.upgradeTo(mockDaoV2.address);

    const daoUpgraded = await ethers.getContractAt('MockDaoV2', daoAddr);

    expect(await daoUpgraded.v2()).to.equal(true);
  });

  describe('Deposit ETH to DAO', function () {
    let dao, membership, multiToken;
    beforeEach(async function () {
      const tx1 = await createDao();
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      const daoAddr = creationEventLog.args.dao;
      dao = await ethers.getContractAt('Dao', daoAddr);
      multiToken = await ethers.getContractAt('MultiToken', await dao.multiToken());

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
    });

    it('create Membership when deposit()', async function () {
      await dao.deposit({ value: ethers.utils.parseEther('0.000123') });
      expect(await membership.balanceOf(creator.address)).to.equal(1);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(jsonResponse.attributes[0].value).to.not.be.empty;
      expect(await ethers.provider.getBalance(dao.address)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('gives token uri with member address', async function () {
      const tx = await dao.deposit({ value: ethers.utils.parseEther('0.000123') });
      await tx.wait();
      const memberAddr = await membership.members(0);

      const jsonResponse = decodeBase64(await membership.tokenURI(1));
      expect(jsonResponse.name).to.equal('A Company Membership #1');
      expect(jsonResponse.attributes[0].value.toLowerCase()).to.equal(memberAddr.toLowerCase());
    });

    it('should not recreate Member when deposit() again by same EOA', async function () {
      await dao.deposit({ value: ethers.utils.parseEther('0.000123') });
      await dao.deposit({ value: ethers.utils.parseEther('0.000123') });
      await dao.deposit({ value: ethers.utils.parseEther('0.000123') });

      const memberAddr = await membership.members(0);

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await multiToken.balanceOf(memberAddr, multiToken.ethId())).to.equal(ethers.utils.parseEther('0.000369'));
      expect(await ethers.provider.getBalance(dao.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });
  });

  // describe('Deposit ERC20 to DAO', function () {
  //   let dao, membership, erc20;
  //   beforeEach(async function () {
  //     const A = await ethers.getContractFactory('TokenA');
  //     erc20 = await A.deploy();
  //     await erc20.deployed();
  //     await erc20.mint(creator.address, ethers.utils.parseEther('100'));

  //     const tx1 = await adam.createDao('A Company', 'ACOM', 'Description', 10000000, [ethers.constants.AddressZero, erc20.address]);
  //     const receipt = await tx1.wait();
  //     const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
  //     const daoAddr = creationEventLog.args.dao;
  //     dao = await ethers.getContractAt('Dao', daoAddr);
  //     const membershipAddr = await dao.membership();
  //     membership = await ethers.getContractAt('Membership', membershipAddr);
  //   });

  //   it('create Membership when depositToken()', async function () {
  //     await erc20.approve(dao.address, ethers.utils.parseEther('1'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('1'));
  //     expect(await membership.balanceOf(creator.address)).to.equal(1);

  //     const jsonResponse = decodeBase64(await membership.tokenURI(1));
  //     expect(jsonResponse.name).to.equal('A Company Membership #1');
  //     expect(jsonResponse.attributes[0].value).to.not.be.empty;
  //     expect(await erc20.balanceOf(dao.address)).to.equal(ethers.utils.parseEther('1'));

  //     const jsonResponse2 = decodeBase64(await dao.uri(2));
  //     expect(jsonResponse2.name).to.equal('TokenA (A Company)');
  //     expect(jsonResponse2.decimals).to.equal(18);
  //   });

  //   it('gives token uri with member address', async function () {
  //     await erc20.approve(dao.address, ethers.utils.parseEther('1.2'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('1.2'));
  //     const memberAddr = await membership.members(0);

  //     const jsonResponse = decodeBase64(await membership.tokenURI(1));
  //     expect(jsonResponse.name).to.equal('A Company Membership #1');
  //     expect(jsonResponse.attributes[0].value.toLowerCase()).to.equal(memberAddr.toLowerCase());
  //   });

  //   it('should not recreate Member when deposit() again by same EOA', async function () {
  //     await erc20.approve(dao.address, ethers.utils.parseEther('3'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('1.1'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('1.2'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('0.3'));

  //     const memberAddr = await membership.members(0);

  //     expect(await membership.balanceOf(creator.address)).to.equal(1);
  //     expect(await dao.balanceOf(memberAddr, 2)).to.equal(ethers.utils.parseEther('2.6'));
  //     expect(await erc20.balanceOf(dao.address)).to.equal(ethers.utils.parseEther('2.6'));
  //   });
  // });

  describe('Redeem ETH from DAO', function () {
    let dao, membership, multiToken;
    beforeEach(async function () {
      const tx1 = await adam.createDao(
        [
            'A Company',  //_name
            'Description', //_description
            1000, //_locktime
            false, //isCreateToken
            [13, 3000, 5000], //budgetApproval
            [13, 3000, 5000], //revokeBudgetApproval
            [13, 3000, 5000], //general
            [], //tokenInfo
            0,
        ]
      );
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      const daoAddr = creationEventLog.args.dao;
      dao = await ethers.getContractAt('Dao', daoAddr);
      multiToken = await ethers.getContractAt('MultiToken', await dao.multiToken());

      const membershipAddr = await dao.membership();
      membership = await ethers.getContractAt('Membership', membershipAddr);
      await dao.deposit({ value: ethers.utils.parseEther('123') });
    });

    it('redeem and burn exact amount of eth', async function () {
      await hre.ethers.provider.send('evm_increaseTime', [1000]);
      await dao.redeem(ethers.utils.parseEther('3'));

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      const memberAddr = await membership.members(0);
      expect(await multiToken.balanceOf(memberAddr, multiToken.ethId())).to.equal(ethers.utils.parseEther('120'));
    });
    it('cannot redeem and burn exact amount of eth inside lockup period', async function () {
      await expect(dao.redeem(ethers.utils.parseEther('3'))).to.be.revertedWith('lockup time');
    });
  });

  // describe('Redeem Token from DAO', function () {
  //   let dao, membership, erc20;
  //   beforeEach(async function () {
  //     const A = await ethers.getContractFactory('TokenA');
  //     erc20 = await A.deploy();
  //     await erc20.deployed();
  //     await erc20.mint(creator.address, ethers.utils.parseEther('123'));

  //     const tx1 = await adam.createDao('A Company', 'ACOM', 'Description', 1000, [erc20.address]);
  //     const receipt = await tx1.wait();
  //     const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
  //     const daoAddr = creationEventLog.args.dao;
  //     dao = await ethers.getContractAt('Dao', daoAddr);
  //     const membershipAddr = await dao.membership();
  //     membership = await ethers.getContractAt('Membership', membershipAddr);
  //     await erc20.approve(dao.address, ethers.utils.parseEther('123'));
  //     await dao.depositToken(erc20.address, ethers.utils.parseEther('123'));
  //   });

  //   it('redeem and burn exact amount of token', async function () {
  //     await hre.ethers.provider.send('evm_increaseTime', [1000]);
  //     await dao.redeemToken(erc20.address, ethers.utils.parseEther('3'));

  //     expect(await membership.balanceOf(creator.address)).to.equal(1);
  //     const memberAddr = await membership.members(0);

  //     expect(await dao.balanceOf(memberAddr, 2)).to.equal(ethers.utils.parseEther('120'));
  //     expect(await erc20.balanceOf(creator.address)).to.equal(ethers.utils.parseEther('3'));
  //   });
  //   it('cannot redeem and burn exact amount of token inside lockup period', async function () {
  //     await expect(dao.redeemToken(erc20.address, ethers.utils.parseEther('3'))).to.be.revertedWith('lockup time');
  //   });
  // });
});
