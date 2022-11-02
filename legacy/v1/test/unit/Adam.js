const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('Adam.sol - test/unit/Adam.js', function () {
  let deployer, daoCreator, unknown;
  let dao, membership, liquidPool, memberToken, govern, governFactory, team;
  let budgetApproval;
  let Adam;
  beforeEach(async function () {
    [deployer, daoCreator, unknown] = await ethers.getSigners();

    dao = await smock.fake('Dao');
    membership = await smock.fake('Membership');
    memberToken = await smock.fake('MemberToken');
    liquidPool = await smock.fake('LiquidPool');
    budgetApproval = await smock.fake('TransferERC20BudgetApproval');
    governFactory = await smock.fake('GovernFactory');
    govern = await smock.fake('Govern');
    team = await smock.fake('Team');
    Adam = await ethers.getContractFactory('Adam', { signer: deployer });

    governFactory.governImplementation.returns(govern.address);
  });

  describe('initialize()', async function () {
    it('init with params successfully', async () => {
      const adam = await upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
      ], { kind: 'uups' });
      expect(await adam.daoImplementation()).to.be.eq(dao.address);
      expect(await adam.membershipImplementation()).to.be.eq(membership.address);
      expect(await adam.liquidPoolImplementation()).to.be.eq(liquidPool.address);
      expect(await adam.memberTokenImplementation()).to.be.eq(memberToken.address);
      expect(await adam.governFactory()).to.be.eq(governFactory.address);
      expect(await adam.team()).to.be.eq(team.address);
      expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(true);
      expect(await adam.budgetApprovals(ethers.constants.AddressZero)).to.be.eq(false);
    });
    it('throws "budget approval already whitelisted" if budgetApproval duplicated', async () => {
      const tx = upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address, budgetApproval.address],
        governFactory.address,
        team.address,
      ], { kind: 'uups' });
      await expect(tx).to.be.revertedWith('budget approval already whitelisted');
    });
    it('throws "governFactory is null" if address zero is set as governFactory', async () => {
      const tx = upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [],
        ethers.constants.AddressZero,
        team.address,
      ], { kind: 'uups' });
      await expect(tx).to.be.revertedWith('governFactory is null');
    });
    it('throws "team is null" if address zero is set as team', async () => {
      const tx = upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [],
        governFactory.address,
        ethers.constants.AddressZero,
      ], { kind: 'uups' });
      await expect(tx).to.be.revertedWith('team is null');
    });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    let adam;
    beforeEach(async function () {
      adam = await upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
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
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
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
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address, newBudgetApproval1.address],
        governFactory.address,
        team.address,
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
      daoForCreatrDao = await (await ethers.getContractFactory('MockLPDao')).deploy();
      membershipForCreatrDao = await (await ethers.getContractFactory('MockMembership')).deploy();
      liquidPoolForCreatrDao = await (await ethers.getContractFactory('MockLiquidPool')).deploy();

      adamForCreatrDao = await upgrades.deployProxy(Adam, [
        daoForCreatrDao.address,
        membershipForCreatrDao.address,
        liquidPoolForCreatrDao.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
      ], { signer: daoCreator, kind: 'uups' });
    });
    it('createDao successfully', async () => {
      await expect(adamForCreatrDao.createDao([
        'name',
        'description',
        0,
        [0, 0, 0, 0],
        ['name', 'symbol'],
        0,
        0,
        [],
        0,
        [],
        ethers.constants.AddressZero,
        '',
        2,
      ])).to.not.be.reverted;
    });
    it('emits createDao event', async () => {
      const tx = await adamForCreatrDao.createDao([
        'name',
        'description',
        0,
        [0, 0, 0, 0],
        ['name', 'symbol'],
        0,
        0,
        [],
        0,
        [],
        ethers.constants.AddressZero,
        '',
        2,
      ]);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'CreateDao');

      expect(event.args.dao).is.not.empty;
      expect(await adamForCreatrDao.daos(event.args.dao)).to.be.eq(true);
    });
  });

  describe('hashVersion()', async function () {
    let adam, newDao;

    beforeEach(async function () {
      newDao = await smock.fake('Dao');
      adam = await upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
      ], { kind: 'uups' });
    });
    it('generates hash', async () => {
      expect(await adam.hashVersion(
        '0x27C8F912A49A9C049D6C9f054c935ba2afd7a685',
        '0x569c8A65E18461A7a1E3799c5B1A83d84123BE47',
        '0xb82b10f47575851E3a912948bDf6c3655b1CFC4f',
        '0x1d4869f51a31267A9d5559fD912363be4D0ce31e',
        '0x5058FeB1C38b22A65D7EdEc4a9ceB82fbE4f83cA',
      )).to.be.eq('32919423783003673811383815689130257884015569893028878289448265004450515186029');
    });
    it('generates same hash if implementation addresses are same', async () => {
      const result1 = await adam.hashVersion(
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        govern.address,
      );
      const result2 = await adam.hashVersion(
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        govern.address,
      );
      expect(result1).to.be.eq(result2);
    });
    it('generates different hash if implementation addresses are not same', async () => {
      const result1 = await adam.hashVersion(
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        govern.address,
      );
      const result2 = await adam.hashVersion(
        newDao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        govern.address,
      );
      expect(result1).to.be.not.eq(result2);
    });
  });
  describe('upgradeImplementations()', async function () {
    let adam;
    let newDao, newMembership, newLiquidPool, newGovern, newMemberToken;
    beforeEach(async function () {
      newDao = await smock.fake('Dao');
      newMembership = await smock.fake('Membership');
      newMemberToken = await smock.fake('MemberToken');
      newLiquidPool = await smock.fake('LiquidPool');
      newGovern = await smock.fake('Govern');

      adam = await upgrades.deployProxy(Adam, [
        dao.address,
        membership.address,
        liquidPool.address,
        memberToken.address,
        [budgetApproval.address],
        governFactory.address,
        team.address,
      ], { kind: 'uups' });
    });
    it('set implementations to new addresses by deployer', async () => {
      await adam.connect(deployer).upgradeImplementations(
        newDao.address,
        newMembership.address,
        newLiquidPool.address,
        newMemberToken.address,
        govern.address,
        'v2',
      );
      expect(await adam.daoImplementation()).to.be.eq(newDao.address);
      expect(await adam.membershipImplementation()).to.be.eq(newMembership.address);
      expect(await adam.liquidPoolImplementation()).to.be.eq(newLiquidPool.address);
      expect(await adam.memberTokenImplementation()).to.be.eq(newMemberToken.address);
    });

    it('emits ImplementationUpgrade event', async () => {
      governFactory.governImplementation.returns('0x5058FeB1C38b22A65D7EdEc4a9ceB82fbE4f83cA');
      const tx = await adam.upgradeImplementations(
        '0x27C8F912A49A9C049D6C9f054c935ba2afd7a685',
        '0x569c8A65E18461A7a1E3799c5B1A83d84123BE47',
        '0xb82b10f47575851E3a912948bDf6c3655b1CFC4f',
        '0x1d4869f51a31267A9d5559fD912363be4D0ce31e',
        '0x5058FeB1C38b22A65D7EdEc4a9ceB82fbE4f83cA',
        'v2',
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ImplementationUpgrade');
      expect(event.args.versionId).to.be.equal('32919423783003673811383815689130257884015569893028878289448265004450515186029');
      expect(await adam.daoImplementation()).to.be.equal('0x27C8F912A49A9C049D6C9f054c935ba2afd7a685');
      expect(await adam.membershipImplementation()).to.be.equal('0x569c8A65E18461A7a1E3799c5B1A83d84123BE47');
      expect(await adam.liquidPoolImplementation()).to.be.equal('0xb82b10f47575851E3a912948bDf6c3655b1CFC4f');
      expect(await adam.memberTokenImplementation()).to.be.equal('0x1d4869f51a31267A9d5559fD912363be4D0ce31e');
    });
    it('throws "governImpl not match" if governImplementation not match current governFactory.governImplementation()', async () => {
      const tx = adam.upgradeImplementations(
        newDao.address,
        newMembership.address,
        newLiquidPool.address,
        newMemberToken.address,
        newGovern.address,
        'v2',
      );
      await expect(tx).to.be.revertedWith('governImpl not match');
    });
    it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
      const tx = adam.connect(unknown).upgradeImplementations(
        newDao.address,
        newMembership.address,
        newLiquidPool.address,
        newMemberToken.address,
        govern.address,
        'v2',
      );
      await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('throws "Impl is null" if impl address zero is set', async () => {
      await expect(adam.upgradeImplementations(
        ethers.constants.AddressZero,
        newMembership.address,
        newLiquidPool.address,
        newMemberToken.address,
        newGovern.address,
        'v2',
      )).to.be.revertedWith('daoImpl is null');
      await expect(adam.upgradeImplementations(
        newDao.address,
        ethers.constants.AddressZero,
        newLiquidPool.address,
        newMemberToken.address,
        newGovern.address,
        'v2',
      )).to.be.revertedWith('membershipImpl is null');
      await expect(adam.upgradeImplementations(
        newDao.address,
        newMembership.address,
        ethers.constants.AddressZero,
        newMemberToken.address,
        newGovern.address,
        'v2',
      )).to.be.revertedWith('liquidPoolImpl is null');
      await expect(adam.upgradeImplementations(
        newDao.address,
        newMembership.address,
        newLiquidPool.address,
        ethers.constants.AddressZero,
        newGovern.address,
        'v2',
      )).to.be.revertedWith('memberTokenImpl is null');
    });
  });
});
