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
  let dao, mockAdam, mockMembership, lpAsSigner, mockMemberToken, mockGovernFactory, mockTeam, mockAccountSystem;
  let tokenA, tokenC721, tokenD1155;

  beforeEach(async function () {
    [creator, member, mockGovern] = await ethers.getSigners();

    ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

    mockAdam = await smock.fake('Adam');
    mockMembership = await (await smock.mock('Membership')).deploy();
    const mockLiquidPool = await smock.fake('LiquidPool');
    mockGovernFactory = await smock.fake('GovernFactory');
    mockTeam = await smock.fake('Team');
    mockAccountSystem = await smock.fake('AccountSystem');
    mockMemberToken = await (await smock.mock('MemberToken')).deploy();

    const adamAsSigner = await testUtils.address.impersonate(mockAdam.address);
    await testUtils.address.setBalance(mockAdam.address, ethers.utils.parseEther('1'));
    lpAsSigner = await testUtils.address.impersonate(mockLiquidPool.address);

    mockMembership.createMember.returns();
    mockMembership.totalSupply.returns(1);
    mockMembership.isMember.returns(true);

    mockGovernFactory.createGovern.returns();

    mockMemberToken.mint.returns();
    mockMemberToken.initialize.returns();

    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: adamAsSigner });
    const Dao = await ethers.getContractFactory('Dao', { signer: adamAsSigner });
    const implDao = await Dao.deploy();
    const proxyDao = await ERC1967Proxy.deploy(implDao.address, '0x');

    dao = await ethers.getContractAt('Dao', proxyDao.address, adamAsSigner);
    await dao.initialize([
      creator.address,
      mockMembership.address,
      mockLiquidPool.address,
      mockGovernFactory.address,
      mockTeam.address,
      mockMemberToken.address,
      'Name',
      'Description',
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      'tokenName', 'T1',
      ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'],
      mockAccountSystem.address,
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
      await mockAdam.budgetApprovals.returns(true);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(true);

      await mockAdam.budgetApprovals.returns(false);
      expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(false);
    });
  });

  describe('govern()', function () {
    it('returns address from governFactory.governMap()', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      expect(await dao.govern('General')).to.equal(mockGovern.address);
    });
  });

  describe('admissionTokensLength()', function () {
    it('counts admissionTokens', async function () {
      expect(await dao.admissionTokensLength()).to.equal(ethers.BigNumber.from('3'));
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

  describe('isMember()', function () {
    it('returns value from membership.isMember()', async function () {
      mockMembership.isMember.returns(true);
      expect(await dao.isMember(creator.address)).to.equal(true);

      mockMembership.isMember.returns(false);
      expect(await dao.isMember(creator.address)).to.equal(false);
    });
  });

  describe('setMinDepositAmount()', function () {
    it('updates minDepositAmount', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      await dao.connect(mockGovern).setMinDepositAmount(10);
      expect(await dao.minDepositAmount()).to.equal(10);
    });
  });

  describe('setLocktime()', function () {
    it('updates locktime', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      await dao.connect(mockGovern).setLocktime(123);
      expect(await dao.locktime()).to.equal(123);
    });
  });

  describe('setLogoCID()', function () {
    it('updates Logo CID', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      await dao.connect(mockGovern).setLogoCID('cid');
      expect(await dao.logoCID()).to.equal('cid');
    });
  });

  describe('createGovern()', function () {
    it('calls governFactory and create govern', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      await dao.connect(mockGovern).createGovern('governA', 1, 2, 3, 0, ethers.constants.AddressZero, 0);
      await dao.connect(mockGovern).createGovern('governB', 4, 5, 6, 1, ethers.constants.AddressZero, 5);
      await dao.connect(mockGovern).createGovern('governC', 7, 8, 9, 2, tokenA.address, 6);
      mockGovernFactory.createGovern.atCall(1).should.be.calledWith('governA', 1, 2, 3, await dao.membership(), 0);
      mockGovernFactory.createGovern.atCall(2).should.be.calledWith('governB', 4, 5, 6, await dao.memberToken(), 5);
      mockGovernFactory.createGovern.atCall(3).should.be.calledWith('governC', 7, 8, 9, tokenA.address, 6);
    });
  });

  describe('addAssets()', function () {
    it('adds supported asset', async function () {
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
      await dao.connect(mockGovern).addAssets([tokenA.address]);
      expect(await dao.isAssetSupported(tokenA.address)).to.equal(true);
    });
  });

  describe('createTeam()', function () {
    it('creates team', async function () {
      mockTeam.addTeam.returns(1);
      mockGovernFactory.governMap.whenCalledWith(dao.address, 'General').returns(mockGovern.address);
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
