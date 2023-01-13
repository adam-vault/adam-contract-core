const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers } = require('hardhat');
chai.should();
chai.use(smock.matchers);
const { AddressZero } = ethers.constants;

describe('DaoChildBeaconProxy.sol - test/unit/DaoChildBeaconProxy.js', function () {
  let membership, dao, daoBeacon;
  let DaoChildBeaconProxy;
  beforeEach(async function () {
    membership = await (await (smock.mock('Membership'))).deploy();
    daoBeacon = await smock.fake('DaoBeacon');
    dao = await smock.fake('DaoBeaconProxy');

    dao.daoBeacon.returns(daoBeacon.address);
    daoBeacon.implementation
      .whenCalledWith(ethers.utils.id('adam.dao.membership'))
      .returns(membership.address);

    DaoChildBeaconProxy = await ethers.getContractFactory('DaoChildBeaconProxy');
  });
  describe('constructor()', async function () {
    it('creates new Membership without init data', async function () {
      await expect(DaoChildBeaconProxy.deploy(dao.address, ethers.utils.id('adam.dao.membership'), '0x')).to.not.be.reverted;
    });
    it('creates new Dao with init data', async function () {
      membership.initialize.returns();
      await expect(DaoChildBeaconProxy.deploy(dao.address, ethers.utils.id('adam.dao.membership'), membership.interface.encodeFunctionData('initialize', [
        '', 3,
      ]))).to.not.be.reverted;
    });
    it('throws "InvalidContract" if provides 0x impl address', async function () {
      await expect(DaoChildBeaconProxy.deploy(dao.address, ethers.utils.id('adam.dao'), '0x')).to.be.revertedWithCustomError(DaoChildBeaconProxy, 'InvalidContract');
    });
  });
  describe('_implementation()', async function () {
    it('resolves function via implementaion', async function () {
      const proxy = await DaoChildBeaconProxy.deploy(dao.address, ethers.utils.id('adam.dao.membership'), '0x');
      const implContract = await ethers.getContractAt('Membership', proxy.address);
      expect(await implContract.name()).to.deep.equal('');
    });
  });
});
