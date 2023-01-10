const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const {
  ADDRESS_ETH,
} = require('../utils/constants');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('Adam.sol - test/unit/Adam.js', function () {
  let deployer, daoCreator, unknown;
  let dao, membership, liquidPool, memberToken, govern, team;
  let budgetApproval, beacon;
  let Adam, DaoBeacon;
  beforeEach(async function () {
    [deployer, daoCreator, unknown] = await ethers.getSigners();

    dao = await smock.fake('Dao');
    membership = await smock.fake('Membership');
    memberToken = await smock.fake('MemberToken');
    liquidPool = await smock.fake('LiquidPool');
    budgetApproval = await smock.fake('TransferERC20BudgetApproval');
    govern = await smock.fake('Govern');
    team = await smock.fake('Team');
    Adam = await ethers.getContractFactory('Adam', { signer: deployer });
    DaoBeacon = await ethers.getContractFactory('DaoBeacon', { signer: deployer });

    beacon = await DaoBeacon.deploy('', [
      [ethers.utils.id('adam.dao'), dao.address],
      [ethers.utils.id('adam.dao.membership'), membership.address],
      [ethers.utils.id('adam.dao.liquid_pool'), liquidPool.address],
      [ethers.utils.id('adam.dao.member_token'), memberToken.address],
      [ethers.utils.id('adam.dao.govern'), govern.address],
      [ethers.utils.id('adam.dao.team'), team.address],
    ]);
  });

  describe('initialize()', async function () {
    it('init with params successfully', async () => {
      const adam = await upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address],
      ], { kind: 'uups' });
      expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(true);
      expect(await adam.budgetApprovals(ethers.constants.AddressZero)).to.be.eq(false);
    });
    it('throws "budget approval already whitelisted" if budgetApproval duplicated', async () => {
      const tx = upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address, budgetApproval.address],
      ], { kind: 'uups' });
      await expect(tx).to.be.revertedWith('budget approval already whitelisted');
    });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    let adam;
    beforeEach(async function () {
      adam = await upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address],
      ], { kind: 'uups' });

      const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
      mockV2Impl = await MockUpgrade.deploy();
      await mockV2Impl.deployed();
    });
    it('allows owner to upgrade', async function () {
      await adam.upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', adam.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "Ownable: caller is not the owner" error if upgrade by non owner', async function () {
      await expect(adam.connect(unknown).upgradeTo(mockV2Impl.address)).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('whitelistBudgetApprovals()', async function () {
    let adam;
    let newBudgetApproval1, newBudgetApproval2;
    beforeEach(async function () {
      adam = await upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address],
      ], { kind: 'uups' });
      newBudgetApproval1 = await smock.fake('TransferERC20BudgetApproval');
      newBudgetApproval2 = await smock.fake('TransferERC20BudgetApproval');
    });
    it('adds budgetApprovals to whitelist', async () => {
      await adam.whitelistBudgetApprovals([
        newBudgetApproval1.address,
        newBudgetApproval2.address,
      ]);
      expect(await adam.budgetApprovals(newBudgetApproval1.address)).to.be.eq(true);
      expect(await adam.budgetApprovals(newBudgetApproval2.address)).to.be.eq(true);
    });
    it('remains old budgetApprovals in whitelist after new budgetApprovals add to whitelist', async () => {
      await adam.whitelistBudgetApprovals([
        newBudgetApproval1.address,
        newBudgetApproval2.address,
      ]);
      expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(true);
    });
    it('throws "budget approval already whitelisted" if budgetApproval duplicated', async () => {
      const tx = adam.whitelistBudgetApprovals([
        newBudgetApproval1.address,
        newBudgetApproval2.address,
        budgetApproval.address,
      ]);
      await expect(tx).to.be.revertedWith('budget approval already whitelisted');
    });
    it('throws "budget approval is null" if address zero is set', async () => {
      const tx = adam.whitelistBudgetApprovals([ethers.constants.AddressZero]);
      await expect(tx).to.be.revertedWith('budget approval is null');
    });
    it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
      const tx = adam.connect(unknown).whitelistBudgetApprovals([]);
      await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('abandonBudgetApprovals()', async function () {
    let adam;
    let newBudgetApproval1, newBudgetApproval2;
    beforeEach(async function () {
      newBudgetApproval1 = await smock.fake('TransferERC20BudgetApproval');
      newBudgetApproval2 = await smock.fake('TransferERC20BudgetApproval');
      adam = await upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address, newBudgetApproval1.address],
      ], { kind: 'uups' });
    });
    it('removes budgetApprovals from whitelist', async () => {
      await adam.abandonBudgetApprovals([
        budgetApproval.address,
        newBudgetApproval1.address,
      ]);
      expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(false);
      expect(await adam.budgetApprovals(newBudgetApproval1.address)).to.be.eq(false);
    });
    it('remains old budgetApprovals in whitelist after budgetApprovals removes from whitelist', async () => {
      await adam.abandonBudgetApprovals([
        budgetApproval.address,
      ]);
      expect(await adam.budgetApprovals(newBudgetApproval1.address)).to.be.eq(true);
    });
    it('throws "budget approval not exist" if abandon non exist budgetApproval', async () => {
      const tx = adam.abandonBudgetApprovals([
        budgetApproval.address,
        newBudgetApproval2.address,
      ]);
      await expect(tx).to.be.revertedWith('budget approval not exist');
    });
    it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
      const tx = adam.connect(unknown).whitelistBudgetApprovals([]);
      await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('createDao()', async function () {
    let adamForCreatrDao;
    let daoForCreatrDao, membershipForCreatrDao, liquidPoolForCreatrDao;

    beforeEach(async function () {
      daoForCreatrDao = await (await ethers.getContractFactory('Dao')).deploy();
      membershipForCreatrDao = await (await ethers.getContractFactory('Membership')).deploy();
      liquidPoolForCreatrDao = await (await ethers.getContractFactory('LiquidPool')).deploy();

      adamForCreatrDao = await upgrades.deployProxy(Adam, [
        beacon.address,
        [budgetApproval.address],
      ], { signer: daoCreator, kind: 'uups' });
    });
    it('createDao successfully', async () => {
      await expect(adamForCreatrDao.createDao([
        'name',
        'description',
        ADDRESS_ETH,
        2,
        'name',
        'symbol',
        [],
        ethers.constants.AddressZero,
      ], [])).to.not.be.reverted;
    });
    it('emits createDao event', async () => {
      const tx = await adamForCreatrDao.createDao([
        'name',
        'description',
        ADDRESS_ETH,
        2,
        'name',
        'symbol',
        [],
        ethers.constants.AddressZero,
      ], []);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'CreateDao');

      expect(event.args.dao).is.not.empty;
      expect(await adamForCreatrDao.daos(event.args.dao)).to.be.eq(true);
    });
  });

});
