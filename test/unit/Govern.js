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
