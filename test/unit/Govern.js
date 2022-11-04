const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

chai.should();
chai.use(smock.matchers);

describe('Govern.sol - test/unit/Govern.js', function () {
  let creator, owner, unknown, govern, voteToken, nonVotableToken;

  beforeEach(async function () {
    [creator, owner, unknown] = await ethers.getSigners();
    const Govern = await ethers.getContractFactory('Govern', { signer: creator });
    voteToken = await smock.fake('Membership');
    nonVotableToken = await smock.fake('ERC20');

    govern = await upgrades.deployProxy(Govern, [
      owner.address,
      'Name',
      130,
      3000,
      5000,
      voteToken.address,
      5,
    ], { kind: 'uups' });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    beforeEach(async function () {
      const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
      mockV2Impl = await MockUpgrade.deploy();
      await mockV2Impl.deployed();
    });
    it('allows owner to upgrade', async function () {
      await govern.connect(owner).upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', govern.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "not dao" error if upgrade by non dao', async function () {
      await expect(govern.connect(unknown).upgradeTo(mockV2Impl.address)).to.revertedWith('Access denied');
    });
  });

  describe('votingPeriod()', function () {
    it('adding duration with durationInBlock together', async function () {
      expect(await govern.votingPeriod()).to.equal(ethers.BigNumber.from('15'));
    });
  });
  describe('votingDelay()', function () {
    it('returns always 0', async function () {
      expect(await govern.votingDelay()).to.equal(ethers.BigNumber.from('0'));
    });
  });
  describe('proposalThreshold()', function () {
    it('returns always 0', async function () {
      expect(await govern.proposalThreshold()).to.equal(ethers.BigNumber.from('0'));
    });
  });
});
