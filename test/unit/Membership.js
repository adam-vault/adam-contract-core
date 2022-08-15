const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Membership.sol', function () {
  let creator, member, member2;
  let membership;

  beforeEach(async function () {
    [creator, member, member2] = await ethers.getSigners();

    const Membership = await ethers.getContractFactory('Membership');
    // Use creator address to simulate dao address
    membership = await upgrades.deployProxy(Membership, [creator.address, 'DaoName', 1], { kind: 'uups' });
  });

  describe('createMember()', function () {
    it('should create member when success', async function () {
      await membership.createMember(member.address);

      expect(await membership.isMember(member.address)).to.equal(true);
      expect(await membership.ownerOf(1)).to.equal(member.address);
      expect(await membership.totalSupply()).to.equal(1);
    });

    it('should revert when msg.sender is not dao', async function () {
      await expect(membership.connect(member).createMember(member.address)).to.be.revertedWith('access denied');
    });

    it('should revert when exceed maxMemberLimit', async function () {
      await membership.createMember(member.address);

      await expect(membership.createMember(member2.address)).to.be.revertedWith('member count exceed limit');
    });
  });

  describe('tokenURI()', function () {
    it('should return tokenURI', async function () {
      await membership.createMember(member.address);

      expect(await membership.tokenURI(1)).to.equal('data:application/json;base64,eyJuYW1lIjogIkRhb05hbWUgTWVtYmVyc2hpcCAjMSJ9');
    });
  });

  describe('transferFrom()', function () {
    it('should revert', async function () {
      await membership.createMember(member.address);
      await expect(membership.connect(member).transferFrom(member.address, creator.address, 1)).to.be.revertedWith('Membership: Transfer of membership is aboundand');
    });
  });
});
