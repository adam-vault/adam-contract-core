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
    const DaoChildBeaconProxy = await ethers.getContractFactory('DaoChildBeaconProxy', { signer: creator });
    const daoBeacon = await smock.fake('DaoBeacon');
    const dao = await smock.fake('DaoBeaconProxy');
    const impl = await Govern.deploy();

    daoBeacon.implementation.returns(impl.address);
    dao.daoBeacon.returns(daoBeacon.address);

    voteToken = await smock.fake('Membership');
    nonVotableToken = await smock.fake('ERC20');
    govern = await DaoChildBeaconProxy.deploy(
      dao.address,
      ethers.utils.id('adam.dao.govern'),
      impl.interface.encodeFunctionData('initialize', [
        owner.address,
        'Name',
        130,
        3000,
        5000,
        voteToken.address,
        5,
      ]),
    );
    govern = await ethers.getContractAt('Govern', govern.address);
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
