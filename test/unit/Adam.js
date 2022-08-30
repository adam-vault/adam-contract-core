const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('Adam.sol', function () {
  let deployer, daoCreator, unknown;

  let dao, membership, liquidPool, memberToken, govern, governFactory, team;
  let budgetApproval;
  let newDao, newMembership, newLiquidPool, newGovern, newMemberToken;
  let Adam;
  beforeEach(async function () {
    [deployer, daoCreator, unknown] = await ethers.getSigners();

    dao = await smock.fake('Dao');
    membership = await smock.fake('Membership');
    memberToken = await smock.fake('MemberToken');
    liquidPool = await smock.fake('LiquidPool');
    budgetApproval = await smock.fake('CommonBudgetApproval');
    governFactory = await smock.fake('GovernFactory');
    govern = await smock.fake('Govern');
    team = await smock.fake('Team');
    Adam = await ethers.getContractFactory('Adam', { signer: deployer });

    governFactory.governImplementation.returns(govern.address);

    newDao = await smock.fake('Dao');
    newMembership = await smock.fake('Membership');
    newMemberToken = await smock.fake('MemberToken');
    newLiquidPool = await smock.fake('LiquidPool');
    newGovern = await smock.fake('Govern');
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
      ]);
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
      ]);
      await expect(tx).to.be.revertedWith('budget approval already whitelisted');
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
      ]);

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
      ]);
      newBudgetApproval1 = await smock.fake('CommonBudgetApproval');
      newBudgetApproval2 = await smock.fake('CommonBudgetApproval');
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
      ], { signer: daoCreator });
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
      ]);
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
  describe('versionUpgrade()', async function () {
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
      ]);
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
  });
});
