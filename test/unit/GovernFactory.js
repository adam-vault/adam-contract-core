const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');

describe('GovernFactory.sol', function () {
  let creator;
  let governFactory;

  beforeEach(async function () {
    [creator] = await ethers.getSigners();

    const Govern = await ethers.getContractFactory('MockGovern');
    const govern = await Govern.deploy();
    await govern.deployed();

    const GovernFactory = await ethers.getContractFactory('GovernFactory');
    governFactory = await upgrades.deployProxy(GovernFactory, [govern.address]);
  });

  describe('createGovern()', function () {
    it('creates a new govern', async function () {
      const tx = await governFactory.createGovern('mockName', 0, 0, 0, [0], ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE']);
      const { govern: governAddress } = await findEventArgs(tx, 'CreateGovern');
      expect(await governFactory.governMap(creator.address, 'mockName')).to.equal(governAddress);
    });
  });
});
