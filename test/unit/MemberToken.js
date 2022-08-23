const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('MemberToken.sol', function () {
  let dao, member, minter;
  let memberToken, MemberToken;

  beforeEach(async function () {
    [dao, minter, member] = await ethers.getSigners();

    MemberToken = await ethers.getContractFactory('MemberToken');
    // Use creator address to simulate minter address
    memberToken = await upgrades.deployProxy(MemberToken, [minter.address, 'MemberTokenName', 'MT']);
  });

  describe('initialize()', function () {
    it('init with minter, name and symbol', async function () {
      const contract = await upgrades.deployProxy(MemberToken, [minter.address, 'MemberTokenName', 'MT'], { kind: 'uups', signer: dao });
      expect(await contract.minter()).to.equal(minter.address);
      expect(await contract.name()).to.equal('MemberTokenName');
      expect(await contract.symbol()).to.equal('MT');
    });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    beforeEach(async function () {
      const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
      mockV2Impl = await MockUpgrade.deploy();
      await mockV2Impl.deployed();
    });
    it('allows owner to upgrade', async function () {
      await memberToken.connect(dao).upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', memberToken.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "not dao" error if upgrade by non dao', async function () {
      await expect(memberToken.connect(minter).upgradeTo(mockV2Impl.address)).to.revertedWith('not dao');
    });
  });

  describe('mint()', function () {
    it('mints when msg.sender is minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      expect(await memberToken.balanceOf(member.address)).to.equal(10);
    });

    it('throws "Not minter" error if not called by minter', async function () {
      await expect(memberToken.connect(member).mint(member.address, 10)).to.be.revertedWith('Not minter');
    });
  });

  describe('getVotes()', function () {
    it('returns correct votes of non minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      expect(await memberToken.getVotes(member.address)).to.equal(10);
    });

    it('returns 0 of minter', async function () {
      await memberToken.connect(minter).mint(minter.address, 10);
      expect(await memberToken.getVotes(minter.address)).to.equal(0);
    });
  });

  describe('getPastVotes()', function () {
    it('returns correct votes of non minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(member.address, 10);

      expect(await memberToken.getPastVotes(member.address, blockNumber)).to.equal(10);
    });

    it('returns 0 of minter', async function () {
      await memberToken.connect(minter).mint(minter.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(minter.address, 10);

      expect(await memberToken.getPastVotes(minter.address, blockNumber)).to.equal(0);
    });
  });

  describe('getPastTotalSupply', function () {
    it('returns total amount without balance of minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await memberToken.connect(minter).mint(minter.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(member.address, 10);

      expect(await memberToken.getPastTotalSupply(blockNumber)).to.equal(10);
    });
  });
});
