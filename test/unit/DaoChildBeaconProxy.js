const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers } = require('hardhat');

chai.should();
chai.use(smock.matchers);
const { AddressZero } = ethers.constants;

describe('DaoChildBeaconProxy.sol - test/unit/DaoChildBeaconProxy.js', async () => {
    let membership;
    let dao;
    let daoBeacon;
    let DaoChildBeaconProxy;
    beforeEach(async () => {
        membership = await (await smock.mock('Membership')).deploy();
        daoBeacon = await smock.fake('DaoBeacon');
        dao = await smock.fake('DaoBeaconProxy');

        dao.daoBeacon.returns(daoBeacon.address);
        daoBeacon.implementation
            .whenCalledWith(ethers.utils.id('adam.dao.membership'))
            .returns(membership.address);

        DaoChildBeaconProxy = await ethers.getContractFactory(
            'DaoChildBeaconProxy',
        );
    });
    describe('constructor()', async () => {
        it('creates new Membership without init data', async () => {
            await expect(
                DaoChildBeaconProxy.deploy(
                    dao.address,
                    ethers.utils.id('adam.dao.membership'),
                    '0x',
                ),
            ).to.not.be.reverted;
        });
        it('creates new Dao with init data', async () => {
            membership.initialize.returns();
            await expect(
                DaoChildBeaconProxy.deploy(
                    dao.address,
                    ethers.utils.id('adam.dao.membership'),
                    membership.interface.encodeFunctionData('initialize', [
                        '',
                        3,
                    ]),
                ),
            ).to.not.be.reverted;
        });
        it('throws "InvalidContract" if provides 0x impl address', async () => {
            await expect(
                DaoChildBeaconProxy.deploy(
                    dao.address,
                    ethers.utils.id('adam.dao'),
                    '0x',
                ),
            ).to.be.revertedWithCustomError(
                DaoChildBeaconProxy,
                'InvalidContract',
            );
        });
    });
    describe('_implementation()', async () => {
        it('resolves function via implementaion', async () => {
            const proxy = await DaoChildBeaconProxy.deploy(
                dao.address,
                ethers.utils.id('adam.dao.membership'),
                '0x',
            );
            const implContract = await ethers.getContractAt(
                'Membership',
                proxy.address,
            );
            expect(await implContract.name()).to.deep.equal('');
        });
    });
});
