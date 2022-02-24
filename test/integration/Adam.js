const chai = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const { smock } = require('@defi-wonderland/smock');
const { expect } = chai;
const { createAdam } = require('../utils/createContract');
const decodeBase64 = require('../utils/decodeBase64');
const { before } = require('lodash');
chai.use(smock.matchers);

describe('Create AssetManager', function () {
  let creator, owner1, owner2, owner3;
  let adam;

  beforeEach(async function () {
    [creator, owner1, owner2, owner3] = await ethers.getSigners();
    adam = await createAdam();
  });

  it('can create dao', async function () {
    await expect(adam.createDao('A Company', 'ACOM'))
      .to.emit(adam, 'CreateDao');

    const daoAddr = await adam.daos(0);
    const dao = await ethers.getContractAt('Dao', daoAddr);

    expect(await dao.adam()).to.equal(adam.address);
  });

  it('can upgrade dao', async function () {
    await adam.createDao('A Company', 'ACOM');

    const MockDaoV2 = await ethers.getContractFactory('MockDaoV2');
    const mockDaoV2 = await MockDaoV2.deploy();
    await mockDaoV2.deployed();

    const daoAddr = await adam.daos(0);
    const dao = await ethers.getContractAt('Dao', daoAddr);
    await dao.upgradeTo(mockDaoV2.address);

    const daoUpgraded = await ethers.getContractAt('MockDaoV2', daoAddr);

    expect(await daoUpgraded.v2()).to.equal(true);
  });

  describe('Deposit to DAO', function () {
    let dao, membership;
    beforeEach(async function () {
      const tx1 = await adam.createDao('A Company', 'ACOM');
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateDao' });
      const daoAddr = creationEventLog.args.dao;
      dao = await ethers.getContractAt('Dao', daoAddr);
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

      expect(await membership.balanceOf(creator.address)).to.equal(1);
      expect(await ethers.provider.getBalance(dao.address)).to.equal(ethers.utils.parseEther('0.000369'));
    });
  });

  // describe('Interact with WETH', function () {
  //   let strategy, amAddr, assetManager, mockWETH9;
  //   beforeEach(async function () {
  //     const MockWETH9 = await ethers.getContractFactory('MockWETH9', creator);
  //     mockWETH9 = await MockWETH9.deploy();
  //     await mockWETH9.deployed();

  //     const tx1 = await adam.createAssetManager('AM Ltd');
  //     const receipt = await tx1.wait();
  //     const creationEventLog = _.find(receipt.events, { event: 'CreateAssetManager' });
  //     amAddr = creationEventLog.args.assetManager;
  //     assetManager = await ethers.getContractAt('AssetManager', amAddr);
  //     const tx2 = await adam.createStrategy(amAddr, 'AM Ltd', false);
  //     await tx2.wait();
  //     const sAddr = await adam.publicStrategies(0);
  //     strategy = await ethers.getContractAt('Strategy', sAddr);
  //   });

  //   it('swaps ERC1155 token when exchanges', async function () {
  //     const [p1, p2, p3] = await Promise.all([owner1, owner2, owner3].map(async (owner) => {
  //       const tx = await strategy.connect(owner).deposit({ value: ethers.utils.parseEther('0.000123') });
  //       const receipt = await tx.wait();
  //       const creationEventLog = _.find(receipt.events, { event: 'CreatePortfolio' });
  //       return creationEventLog.args.portfolio;
  //     }));

  //     await assetManager.depositAnyContract(ethers.constants.AddressZero, mockWETH9.address,
  //       [p1, p2, p3],
  //       [
  //         ethers.utils.parseEther('0.000123'),
  //         ethers.utils.parseEther('0.0001'),
  //         ethers.utils.parseEther('0.0001'),
  //       ]);
  //     const base64String = (await assetManager.uri(await assetManager.ethId())).split(',')[1];
  //     const uriResponse = Buffer.from(base64String, 'base64');
  //     const jsonResponse = JSON.parse(uriResponse);
  //     expect(jsonResponse.totalSupply).to.equal(46000000000000);

  //     expect(await assetManager.balanceOf(p1, 1)).to.equal(ethers.utils.parseEther('0'));
  //     expect(await assetManager.balanceOf(p1, 2)).to.equal(ethers.utils.parseEther('0.000123'));
  //     expect(await assetManager.balanceOf(p2, 1)).to.equal(ethers.utils.parseEther('0.000023'));
  //     expect(await assetManager.balanceOf(p2, 2)).to.equal(ethers.utils.parseEther('0.000100'));
  //     expect(await assetManager.balanceOf(p3, 1)).to.equal(ethers.utils.parseEther('0.000023'));
  //     expect(await assetManager.balanceOf(p3, 2)).to.equal(ethers.utils.parseEther('0.000100'));

  //     expect(await mockWETH9.balanceOf(assetManager.address)).to.equal(ethers.utils.parseEther('0.000323'));
  //   });
  // });

});
