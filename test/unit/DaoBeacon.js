const chai = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('DaoBeacon.sol - test/unit/DaoBeacon.js', async () => {
    let daoBeacon;
    let dao;
    let membership;
    let DaoBeacon;
    beforeEach(async () => {
        dao = await smock.fake('Dao');
        membership = await smock.fake('Membership');
        DaoBeacon = await ethers.getContractFactory('DaoBeacon');

        daoBeacon = await DaoBeacon.deploy('v1', [
            [ethers.utils.id('adam.dao'), dao.address],
            [ethers.utils.id('adam.dao.membership'), membership.address],
        ]);
    });

    it('throws "DaoImplementationNotExist" if dao impl not set', async () => {
        await expect(DaoBeacon.deploy('v2', [])).to.be.revertedWithCustomError(
            DaoBeacon,
            'DaoImplementationNotExist',
        );
    });
    it('throws "InvalidContract" if non contract impl is set', async () => {
        await expect(
            DaoBeacon.deploy('v2', [
                [ethers.utils.id('adam.dao'), ethers.constants.AddressZero],
            ]),
        ).to.be.revertedWithCustomError(DaoBeacon, 'InvalidContract');
    });
    it('name()', async () => {
        expect(await daoBeacon.name()).to.be.deep.equal('v1');
    });
    it('implementation()', async () => {
        expect(
            await daoBeacon.implementation(ethers.utils.id('adam.dao')),
        ).to.be.deep.equal(dao.address);
        expect(
            await daoBeacon.implementation(ethers.utils.id('unknown')),
        ).to.be.deep.equal(ethers.constants.AddressZero);
    });
});
