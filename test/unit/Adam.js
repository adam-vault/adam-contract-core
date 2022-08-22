const chai = require('chai');
const { ethers, upgrades, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe.only('Adam.sol', function () {
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
