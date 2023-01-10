const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const { createTokens } = require('../utils/createContract');
const findEventArgs = require('../../utils/findEventArgs');

chai.should();
chai.use(smock.matchers);

describe('Dao.sol - test/unit/Dao.js', function () {
  let creator, member, mockGovern;
  let dao, mockAdam, mockMembership, lpAsSigner, mockMemberToken, mockTeam;
  let tokenA, tokenC721, tokenD1155;
  let mockGovernImp;

  beforeEach(async function () {
    [creator, member, mockGovern] = await ethers.getSigners();

    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    mockAdam = await smock.fake('Adam');
    mockMembership = await (await smock.mock('Membership')).deploy();
    mockGovernImp = await (await smock.mock('Govern')).deploy();
    const mockLiquidPool = await smock.fake('LiquidPool');
    mockTeam = await smock.fake('Team');
    mockMemberToken = await (await smock.mock('MemberToken')).deploy();

    const adamAsSigner = await testUtils.address.impersonate(mockAdam.address);
    await testUtils.address.setBalance(mockAdam.address, ethers.utils.parseEther('1'));
    lpAsSigner = await testUtils.address.impersonate(mockLiquidPool.address);

    mockMembership.totalSupply.returns(1);
    mockMembership.isMember.returns(true);
    mockMemberToken.mint.returns();
    mockMemberToken.initialize.returns();

    const DaoBeaconProxy = await ethers.getContractFactory('DaoBeaconProxy', { signer: adamAsSigner });
    const Dao = await ethers.getContractFactory('Dao', { signer: adamAsSigner });
    const implDao = await Dao.deploy();

    const DaoBeacon = await ethers.getContractFactory('DaoBeacon', { signer: adamAsSigner });
    const beacon = await DaoBeacon.deploy('v1', [
      [ethers.utils.id('adam.dao'), implDao.address],
      [ethers.utils.id('adam.dao.membership'), mockMembership.address],
      [ethers.utils.id('adam.dao.member_token'), mockMemberToken.address],
      [ethers.utils.id('adam.dao.liquid_pool'), mockLiquidPool.address],
      [ethers.utils.id('adam.dao.govern'), mockGovernImp.address],
      [ethers.utils.id('adam.dao.team'), mockTeam.address],
    ]);
    const proxyDao = await DaoBeaconProxy.deploy(beacon.address, '0x');

    dao = await ethers.getContractAt('Dao', proxyDao.address, adamAsSigner);
    await mockMembership.setVariable('dao', proxyDao.address);
    await mockMembership.setVariable('maxMemberLimit', 1);

    await dao.initialize([
      creator.address,
      mockMembership.address,
      mockLiquidPool.address,
      mockTeam.address,
      'Name',
      'Description',
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      'tokenName', 'T1',
      ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'],
    ], [
      Dao.interface.encodeFunctionData('createGovern', ['General', 0, 0, 0, 0, ethers.constants.AddressZero, 0]),
      Dao.interface.encodeFunctionData('addAdmissionToken', [tokenA.address, 10, 0]),
      Dao.interface.encodeFunctionData('addAdmissionToken', [tokenC721.address, 1, 1]),
      Dao.interface.encodeFunctionData('addAdmissionToken', [tokenD1155.address, 1, 1]),
    ]);
  });

  describe('setFirstDepositTime()', function () {
    it('sets first deposit time when msg.sender is liquid pool', async function () {
      await testUtils.address.setBalance(lpAsSigner.address, ethers.utils.parseEther('1'));
      await dao.connect(lpAsSigner).setFirstDepositTime(creator.address, 10);
      expect(await dao.firstDepositTime(creator.address)).to.equal(10);
    });
    it('throws "only LP"', async function () {
      await expect(dao.setFirstDepositTime(creator.address, 0)).to.be.revertedWith('only LP');
    });
  });

  describe('canCreateBudgetApproval()', function () {
    it('returns value of adam.budgetApprovals()', async function () {
      await mockAdam.budgetApprovals.returns(true);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(true);

      await mockAdam.budgetApprovals.returns(false);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(false);
    });
  });

  describe('govern()', function () {
    it('returns address from dao.govern()', async function () {
      expect(await dao.govern('General')).to.be.not.equal(ethers.constants.AddressZero);
    });
  });

  describe('byPassGovern()', function () {
    it('return true when it is the only member', async function () {
      mockMembership.totalSupply.returns(1);
      mockMembership.isMember.returns(true);
      expect(await dao.byPassGovern(creator.address)).to.equal(true);
    });

    it('return false when it is more than one member', async function () {
      mockMembership.totalSupply.returns(2);
      mockMembership.isMember.returns(true);
      expect(await dao.byPassGovern(creator.address)).to.equal(false);
    });

    it('return false when it is not member', async function () {
      mockMembership.totalSupply.returns(1);
      mockMembership.isMember.returns(false);
      expect(await dao.byPassGovern(creator.address)).to.equal(false);
    });
  });

  describe('setMinDepositAmount()', function () {
    it('updates minDepositAmount', async function () {
      await dao.connect(mockGovern).setMinDepositAmount(10);
      expect(await dao.minDepositAmount()).to.equal(10);
    });
  });

  describe('setLocktime()', function () {
    it('updates locktime', async function () {
      await dao.connect(mockGovern).setLocktime(123);
      expect(await dao.locktime()).to.equal(123);
    });
  });

  describe('setLogoCID()', function () {
    it('updates Logo CID', async function () {
      await dao.connect(mockGovern).setLogoCID('cid');
      expect(await dao.logoCID()).to.equal('cid');
    });
  });

  describe('createGovern()', function () {
    it('calls dao and create govern', async function () {
      const tx = await dao.connect(mockGovern).createGovern('governA', 1, 2, 3, 0, ethers.constants.AddressZero, 0);
      const tx2 = await dao.connect(mockGovern).createGovern('governB', 4, 5, 6, 1, ethers.constants.AddressZero, 5);
      const tx3 = await dao.connect(mockGovern).createGovern('governC', 7, 8, 9, 2, tokenA.address, 6);
      expect(await dao.govern('governA')).to.equal(await findEventArgs(tx, 'CreateGovern', 'govern'));
      expect(await dao.govern('governB')).to.equal(await findEventArgs(tx2, 'CreateGovern', 'govern'));
      expect(await dao.govern('governC')).to.equal(await findEventArgs(tx3, 'CreateGovern', 'govern'));
    });
  });

  describe('addAssets()', function () {
    it('adds supported asset', async function () {
      await dao.connect(mockGovern).addAssets([tokenA.address]);
      expect(await dao.isAssetSupported(tokenA.address)).to.equal(true);
    });
  });

  describe('createTeam()', function () {
    it('creates team', async function () {
      mockTeam.addTeam.returns(1);
      const tx = await dao.connect(mockGovern).createTeam('title', creator.address, [member.address], 'description');
      const { tokenId: teamId } = await findEventArgs(tx, 'WhitelistTeam');
      expect(await dao.teamWhitelist(teamId)).to.equal(true);
    });
  });
});
