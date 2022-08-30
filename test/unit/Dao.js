const { deployMockContract } = require('ethereum-waffle');
const { expect } = require('chai');
const { ethers, upgrades, network } = require('hardhat');
const { getContractAddress } = require('@ethersproject/address');
const { createTokens } = require('../utils/createContract');
const findEventArgs = require('../../utils/findEventArgs');

describe('Dao.sol', function () {
  let creator, member, mockGovern;
  let dao, mockAdam, mockMemberShip, lpAsSigner;
  let tokenA, tokenC721, tokenD1155;

  beforeEach(async function () {
    [creator, member, mockGovern] = await ethers.getSigners();

    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    const futureAdamAddress = getContractAddress({
      from: creator.address,
      nonce: await creator.getTransactionCount(),
    });
    await member.sendTransaction({ to: futureAdamAddress, value: ethers.utils.parseEther('100') });

    const Adam = await ethers.getContractFactory('Adam');
    mockAdam = await deployMockContract(creator, Adam.interface.format());
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [mockAdam.address],
    });

    const adamAsSigner = await ethers.getSigner(mockAdam.address);

    const Membership = await ethers.getContractFactory('Membership');
    mockMemberShip = await deployMockContract(creator, Membership.interface.format());
    await mockMemberShip.mock.createMember.returns();
    await mockMemberShip.mock.totalSupply.returns(1);
    await mockMemberShip.mock.isMember.returns(true);

    const futureLPAddress = getContractAddress({
      from: creator.address,
      nonce: await creator.getTransactionCount(),
    });
    await member.sendTransaction({ to: futureLPAddress, value: ethers.utils.parseEther('100') });

    const LiquidPool = await ethers.getContractFactory('LiquidPool');
    const mockLiquidPool = await deployMockContract(creator, LiquidPool.interface.format());
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [mockLiquidPool.address],
    });
    lpAsSigner = await ethers.getSigner(mockLiquidPool.address);

    const GovernFactory = await ethers.getContractFactory('GovernFactory');
    const mockGovernFactory = await deployMockContract(creator, GovernFactory.interface.format());
    await mockGovernFactory.mock.createGovern.returns();

    const Team = await ethers.getContractFactory('Team');
    const mockTeam = await deployMockContract(creator, Team.interface.format());
    await mockTeam.mock.addTeam.returns(1);

    const MemberToken = await ethers.getContractFactory('MemberToken');
    const mockMemberToken = await deployMockContract(creator, MemberToken.interface.format());
    await mockMemberToken.mock.mint.returns();
    await mockMemberToken.mock.initialize.returns();

    const Dao = await ethers.getContractFactory('Dao', { signer: adamAsSigner });
    dao = await upgrades.deployProxy(Dao, [[
      creator.address,
      mockMemberShip.address,
      mockLiquidPool.address,
      mockGovernFactory.address,
      mockTeam.address,
      mockMemberToken.address,
      'Name',
      'Description',
      0,
      [0, 0, 0, 0],
      ['tokenName', 'T1'],
      0,
      [0],
      ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'],
      false,
      [
        [tokenA.address, 10, 0, false],
        [tokenC721.address, 1, 1, false],
        [tokenD1155.address, 1, 1, false],
      ],
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      '',
    ]], { kind: 'uups' });

    await mockGovernFactory.mock.governMap.withArgs(dao.address, 'General').returns(mockGovern.address);
  });

  describe('setFirstDepositTime()', function () {
    it('sets first deposit time when msg.sender is liquid pool', async function () {
      const { blockNumber } = await dao.connect(lpAsSigner).setFirstDepositTime(creator.address);
      const { timestamp } = await ethers.provider.getBlock(blockNumber);
      expect(await dao.firstDepositTime(creator.address)).to.equal(timestamp);
    });
    it('throws "only LP"', async function () {
      await expect(dao.setFirstDepositTime(creator.address)).to.be.revertedWith('only LP');
    });
  });

  describe('canCreateBudgetApproval()', function () {
    it('returns value of adam.budgetApprovals()', async function () {
      await mockAdam.mock.budgetApprovals.returns(true);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(true);

      await mockAdam.mock.budgetApprovals.returns(false);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(false);
    });
  });

  describe('govern()', function () {
    it('returns address from governFactory.governMap()', async function () {
      expect(await dao.govern('General')).to.equal(mockGovern.address);
    });
  });

  describe('byPassGovern()', function () {
    it('return true when it is the only member', async function () {
      await mockMemberShip.mock.totalSupply.returns(1);
      await mockMemberShip.mock.isMember.returns(true);
      expect(await dao.byPassGovern(creator.address)).to.equal(true);
    });

    it('return false when it is more than one member', async function () {
      await mockMemberShip.mock.totalSupply.returns(2);
      await mockMemberShip.mock.isMember.returns(true);
      expect(await dao.byPassGovern(creator.address)).to.equal(false);
    });

    it('return false when it is not member', async function () {
      await mockMemberShip.mock.totalSupply.returns(1);
      await mockMemberShip.mock.isMember.returns(false);
      expect(await dao.byPassGovern(creator.address)).to.equal(false);
    });
  });

  describe('isMember()', function () {
    it('returns value from membership.isMember()', async function () {
      await mockMemberShip.mock.isMember.returns(true);
      expect(await dao.isMember(creator.address)).to.equal(true);

      await mockMemberShip.mock.isMember.returns(false);
      expect(await dao.isMember(creator.address)).to.equal(false);
    });
  });

  describe('updateDaoSetting()', function () {
    it('updates dao setting', async function () {
      await dao.connect(mockGovern).updateDaoSetting([10]);
      expect(await dao.minDepositAmount()).to.equal(10);
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
      const tx = await dao.connect(mockGovern).createTeam('title', creator.address, [member.address], 'description');
      const { tokenId: teamId } = await findEventArgs(tx, 'WhitelistTeam');
      expect(await dao.teamWhitelist(teamId)).to.equal(true);
    });
  });

  describe('isPassAdmissionToken()', function () {
    it('returns true when all pass', async function () {
      await tokenA.mint(member.address, 10);
      await tokenC721.mint(member.address, 1);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await dao.isPassAdmissionToken(member.address)).to.equal(true);
    });
    it('returns false when lack ERC20', async function () {
      await tokenC721.mint(member.address, 1);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await dao.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack ERC721', async function () {
      await tokenA.mint(member.address, 10);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await dao.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack ERC1155', async function () {
      await tokenA.mint(member.address, 10);
      await tokenC721.mint(member.address, 1);
      expect(await dao.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack all tokens', async function () {
      expect(await dao.isPassAdmissionToken(member.address)).to.equal(false);
    });
  });
});
