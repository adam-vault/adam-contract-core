const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers } = require('hardhat');

chai.should();
chai.use(smock.matchers);
const { AddressZero } = ethers.constants;

describe('DaoBeaconProxy.sol - test/unit/DaoBeaconProxy.js', function () {
  let dao, daoBeacon;
  let DaoBeaconProxy;
  beforeEach(async function () {
    dao = await (await (smock.mock('Dao'))).deploy();
    daoBeacon = await (await (smock.mock('DaoBeacon'))).deploy('', [[ethers.utils.id('adam.dao'), dao.address]]);
    DaoBeaconProxy = await ethers.getContractFactory('DaoBeaconProxy');
  });
  describe('constructor()', async function () {
    it('creates new Dao without init data', async function () {
      daoBeacon.implementation.returns(dao.address);
      await expect(DaoBeaconProxy.deploy(daoBeacon.address, '0x')).to.not.be.reverted;
    });
    it('creates new Dao with init data', async function () {
      dao.initialize.returns();
      await expect(DaoBeaconProxy.deploy(daoBeacon.address, dao.interface.encodeFunctionData('initialize', [
        [
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          'name',
          'desc',
          AddressZero,
          '', '', [],
        ],
        [],
      ]))).to.not.be.reverted;
    });
    it('throws "InvalidContract" if provides 0x impl address', async function () {
      daoBeacon.implementation.returns(AddressZero);
      await expect(DaoBeaconProxy.deploy(daoBeacon.address, '0x')).to.be.revertedWithCustomError(DaoBeaconProxy, 'InvalidContract');
    });
    it('throws "InvalidContract" if provides 0x beacon address', async function () {
      await expect(DaoBeaconProxy.deploy(AddressZero, '0x')).to.be.revertedWithCustomError(DaoBeaconProxy, 'InvalidContract');
    });
  });
  describe('daoBeacon()', async function () {
    it('provides daoBeacon', async function () {
      const proxy = await DaoBeaconProxy.deploy(daoBeacon.address, '0x');
      expect(await proxy.daoBeacon()).to.deep.equal(daoBeacon.address);
    });
  });
  describe('_implementation()', async function () {
    it('resolves function via implementaion', async function () {
      const proxy = await DaoBeaconProxy.deploy(daoBeacon.address, '0x');
      const daoContract = await ethers.getContractAt('Dao', proxy.address);
      expect(await daoContract.name()).to.deep.equal('');
    });
  });
});
