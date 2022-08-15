const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('MemberToken.sol', function () {
  let creator, member;
  let memberToken;

  beforeEach(async function () {
    [creator, member] = await ethers.getSigners();

    const MemberToken = await ethers.getContractFactory('MemberToken');
    // Use creator address to simulate minter address
    memberToken = await upgrades.deployProxy(MemberToken, [creator.address, 'MemberTokenName', 'MT']);
  });

  describe('mint()', function () {
    it('should sucess when msg.sender is minter', async function () {
      await memberToken.mint(member.address, 10);

      expect(await memberToken.balanceOf(member.address)).to.equal(10);
    });

    it('should revert when msg.sender is not minter', async function () {
      await expect(memberToken.connect(member).mint(member.address, 10)).to.be.revertedWith('Not minter');
    });
  });

  describe('getVotes()', function () {
    it('should return correct votes of non minter', async function () {
      await memberToken.mint(member.address, 10);

      expect(await memberToken.getVotes(member.address)).to.equal(10);
    });

    it('should return 0 of minter', async function () {
      await memberToken.mint(creator.address, 10);

      expect(await memberToken.getVotes(creator.address)).to.equal(0);
    });
  });

  describe('getPastVotes()', function () {
    it('should return correct votes of non minter', async function () {
      await memberToken.mint(member.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.mint(member.address, 10);

      expect(await memberToken.getPastVotes(member.address, blockNumber)).to.equal(10);
    });

    it('should return 0 of minter', async function () {
      await memberToken.mint(creator.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.mint(creator.address, 10);

      expect(await memberToken.getPastVotes(creator.address, blockNumber)).to.equal(0);
    });
  });

  describe('getPastTotalSupply', function () {
    it('should return total amount without balance of minter', async function () {
      await memberToken.mint(member.address, 10);
      await memberToken.mint(creator.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.mint(member.address, 10);

      expect(await memberToken.getPastTotalSupply(blockNumber)).to.equal(10);
    });
  });
});
