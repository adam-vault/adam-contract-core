const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Membership.sol', function () {
  let dao, creator, member, member2, member3;
  let membership;
  let Membership;

  beforeEach(async function () {
    [creator, member, member2, member3, dao] = await ethers.getSigners();
    Membership = await ethers.getContractFactory('Membership');
    membership = await upgrades.deployProxy(Membership, [dao.address, 'DaoName', 2], { kind: 'uups', signer: creator });
  });

  describe('initialize()', function () {
    it('init with name and symbol', async function () {
      const contract = await upgrades.deployProxy(Membership, [dao.address, 'DaoName', 1], { kind: 'uups' });
      expect(await contract.dao()).to.equal(dao.address);
      expect(await contract.name()).to.equal('DaoName Membership');
      expect(await contract.symbol()).to.equal('MS');
      expect(await contract.maxMemberLimit()).to.equal(ethers.BigNumber.from('1'));
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
      await membership.connect(dao).upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', membership.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "not dao" error if upgrade by non dao', async function () {
      await expect(membership.connect(creator).upgradeTo(mockV2Impl.address)).to.revertedWith('not dao');
    });
  });

  describe('createMember()', function () {
    it('creates member when success', async function () {
      await membership.connect(dao).createMember(member.address);

      expect(await membership.isMember(member.address)).to.equal(true);
      expect(await membership.ownerOf(1)).to.equal(member.address);
      expect(await membership.totalSupply()).to.equal(1);
    });

    it('throws "not dao" if not called by dao', async function () {
      await expect(membership.connect(member).createMember(member.address)).to.be.revertedWith('not dao');
    });

    it('throws "member count exceed limit" if member count exceeds limit', async function () {
      await membership.connect(dao).createMember(member.address);
      await membership.connect(dao).createMember(member2.address);

      await expect(membership.connect(dao).createMember(member3.address)).to.be.revertedWith('member count exceed limit');
    });
  });

  describe('tokenURI()', function () {
    it('returns tokenURI', async function () {
      await membership.connect(dao).createMember(member.address);

      expect(await membership.tokenURI(1)).to.equal('data:application/json;base64,eyJuYW1lIjogIkRhb05hbWUgTWVtYmVyc2hpcCAjMSJ9');
    });
  });

  describe('transferFrom()', function () {
    it('throws "Membership: Transfer of membership is aboundand"', async function () {
      await membership.connect(dao).createMember(member.address);
      await expect(membership.connect(member).transferFrom(member.address, member2.address, 1)).to.be.revertedWith('Membership: Transfer of membership is aboundand');
    });
  });

  describe('_afterTokenTransfer()', function () {
    it('delegates vote when minting', async function () {
      const tx = await membership.connect(dao).createMember(member.address);
      const receipt = await tx.wait();
      expect(receipt.events.find(e => e.event === 'DelegateChanged')).to.not.be.undefined;
    });

    it('skips delegates vote when minting if member was delegrated by someone else', async function () {
      await membership.connect(member).delegate(member2.address);
      const tx = await membership.connect(dao).createMember(member.address);
      const receipt = await tx.wait();
      expect(receipt.events.find(e => e.event === 'DelegateChanged')).to.be.undefined;
    });
  });
});
