const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers } = require('hardhat');

chai.should();
chai.use(smock.matchers);
const { AddressZero } = ethers.constants;

describe('DaoBeaconProxy.sol - test/unit/DaoBeaconProxy.js', async () => {
    let dao;
    let daoBeacon;
    let DaoBeaconProxy;
    beforeEach(async () => {
        dao = await (await smock.mock('Dao')).deploy();
        daoBeacon = await (
            await smock.mock('DaoBeacon')
        ).deploy('', [[ethers.utils.id('adam.dao'), dao.address]]);
        DaoBeaconProxy = await ethers.getContractFactory('DaoBeaconProxy');
    });
    describe('constructor()', async () => {
        it('creates new Dao without init data', async () => {
            daoBeacon.implementation.returns(dao.address);
            await expect(DaoBeaconProxy.deploy(daoBeacon.address, '0x')).to.not
                .be.reverted;
        });
        it('creates new Dao with init data', async () => {
            dao.initialize.returns();
            await expect(
                DaoBeaconProxy.deploy(
                    daoBeacon.address,
                    dao.interface.encodeFunctionData('initialize', [
                        AddressZero,
                        'name',
                        'desc',
                        AddressZero,
                        [],
                    ]),
                ),
            ).to.not.be.reverted;
        });
        it('throws "InvalidContract" if provides 0x impl address', async () => {
            daoBeacon.implementation.returns(AddressZero);
            await expect(
                DaoBeaconProxy.deploy(daoBeacon.address, '0x'),
            ).to.be.revertedWithCustomError(DaoBeaconProxy, 'InvalidContract');
        });
        it('throws "InvalidContract" if provides 0x beacon address', async () => {
            await expect(
                DaoBeaconProxy.deploy(AddressZero, '0x'),
            ).to.be.revertedWithCustomError(DaoBeaconProxy, 'InvalidContract');
        });
    });
    describe('daoBeacon()', async () => {
        it('provides daoBeacon', async () => {
            const proxy = await DaoBeaconProxy.deploy(daoBeacon.address, '0x');
            expect(await proxy.daoBeacon()).to.deep.equal(daoBeacon.address);
        });
    });
    describe('_implementation()', async () => {
        it('resolves function via implementaion', async () => {
            const proxy = await DaoBeaconProxy.deploy(daoBeacon.address, '0x');
            const daoContract = await ethers.getContractAt(
                'Dao',
                proxy.address,
            );
            expect(await daoContract.name()).to.deep.equal('');
        });
    });
});
