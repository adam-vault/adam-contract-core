const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { createTokens } = require('../utils/createContract');

describe('Membership.sol - test/unit/Membership.js', function () {
  let dao, creator, member, member2, member3;
  let membership, membershipImpl;
  let Membership, ERC1967Proxy;

  beforeEach(async function () {
    [creator, member, member2, member3, dao] = await ethers.getSigners();
    Membership = await ethers.getContractFactory('Membership');
    ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');
    membershipImpl = await Membership.deploy();
    const proxy = await ERC1967Proxy.deploy(membershipImpl.address, '0x');
    membership = await ethers.getContractAt('Membership', proxy.address);
    await membership.initialize(dao.address, 'DaoName', 2);
  });

  describe('initialize()', function () {
    it('init with name and symbol', async function () {
      const proxy = await ERC1967Proxy.deploy(membershipImpl.address, '0x');
      const contract = await ethers.getContractAt('Membership', proxy.address);
      await contract.initialize(dao.address, 'DaoName', 1);
      expect(await contract.dao()).to.equal(dao.address);
      expect(await contract.name()).to.equal('DaoName Membership');
      expect(await contract.symbol()).to.equal('MS');
      expect(await contract.maxMemberLimit()).to.equal(ethers.BigNumber.from('1'));
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

    it('throws "Member already created" if member count exceeds limit', async function () {
      await membership.connect(dao).createMember(member.address);

      await expect(membership.connect(dao).createMember(member.address)).to.be.revertedWith('Member already created');
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

  describe('isPassAdmissionToken()', async function () {
    let tokenA, tokenC721, tokenD1155;
    beforeEach(async function () {
      ({ tokenA, tokenC721, tokenD1155 } = await createTokens());
      await membership.connect(dao).addAdmissionToken(tokenA.address, 10, 0);
      await membership.connect(dao).addAdmissionToken(tokenC721.address, 1, 1);
      await membership.connect(dao).addAdmissionToken(tokenD1155.address, 1, 1);
    });

    it('returns true when all pass', async function () {
      await tokenA.mint(member.address, 10);
      await tokenC721.mint(member.address, 1);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await membership.isPassAdmissionToken(member.address)).to.equal(true);
    });
    it('returns false when lack ERC20', async function () {
      await tokenC721.mint(member.address, 1);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await membership.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack ERC721', async function () {
      await tokenA.mint(member.address, 10);
      await tokenD1155.mint(member.address, 1, 1, 0);
      expect(await membership.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack ERC1155', async function () {
      await tokenA.mint(member.address, 10);
      await tokenC721.mint(member.address, 1);
      expect(await membership.isPassAdmissionToken(member.address)).to.equal(false);
    });
    it('returns false when lack all tokens', async function () {
      expect(await membership.isPassAdmissionToken(member.address)).to.equal(false);
    });
  });

  describe('admissionTokensLength()', function () {
    let tokenA, tokenC721, tokenD1155;
    beforeEach(async function () {
      ({ tokenA, tokenC721, tokenD1155 } = await createTokens());
      await membership.connect(dao).addAdmissionToken(tokenA.address, 10, 0);
      await membership.connect(dao).addAdmissionToken(tokenC721.address, 1, 1);
      await membership.connect(dao).addAdmissionToken(tokenD1155.address, 1, 1);
    });

    it('counts admissionTokens', async function () {
      expect(await membership.countAdmissionTokens()).to.equal(ethers.BigNumber.from('3'));
    });
  });
});
