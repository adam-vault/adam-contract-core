const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('MemberToken.sol - test/unit/MemberToken.js', function () {
  let dao, member, minter;
  let memberToken, MemberToken;

  beforeEach(async function () {
    [dao, minter, member] = await ethers.getSigners();

    MemberToken = await ethers.getContractFactory('MemberToken');
    // Use creator address to simulate minter address
    memberToken = await upgrades.deployProxy(MemberToken, [minter.address, 'MemberTokenName', 'MT'], { kind: 'uups' });
  });

  describe('initialize()', function () {
    it('init with minter, name and symbol', async function () {
      const contract = await upgrades.deployProxy(MemberToken, [
        minter.address, 'MemberTokenName', 'MT',
      ], { kind: 'uups', signer: dao });

      expect(await contract.minter()).to.equal(minter.address);
      expect(await contract.name()).to.equal('MemberTokenName');
      expect(await contract.symbol()).to.equal('MT');
    });
    it('throws "minter is null" error if set minter as null', async function () {
      await expect(
        upgrades.deployProxy(MemberToken, [
          ethers.constants.AddressZero,
          'MemberTokenName',
          'MT',
        ], { kind: 'uups', signer: dao }),
      ).to.revertedWith('minter is null');
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

  describe('delegate', function () {
    it('delegate fail for Member Token', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await expect(
        memberToken
          .connect(member)
          .delegate(minter.address))
        .to.be.revertedWith('Not support delegate Vote');
    });
  });
  describe('delegateBySig', function () {
    it('delegateBySig fail for Member Token', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await expect(
        memberToken
          .connect(member)
          .delegateBySig(minter.address, 0, 0, 0, ethers.utils.formatBytes32String(''), ethers.utils.formatBytes32String('')))
        .to.be.revertedWith('Not support delegate Vote');
    });
  });
});
