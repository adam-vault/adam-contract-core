const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

chai.should();
chai.use(smock.matchers);

describe('Govern.sol - test/unit/Govern.js', async () => {
    let creator;
    let owner;
    let unknown;
    let govern;
    let voteToken;
    let nonVotableToken;

    beforeEach(async () => {
        [creator, owner, unknown] = await ethers.getSigners();
        const Govern = await ethers.getContractFactory('Govern', {
            signer: creator,
        });
        const DaoChildBeaconProxy = await ethers.getContractFactory(
            'DaoChildBeaconProxy',
            { signer: creator },
        );
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
                'Name',
                3000,
                5000,
                voteToken.address,
                5,
            ]),
        );
        govern = await ethers.getContractAt('Govern', govern.address);
    });

    describe('votingPeriod()', async () => {
        it('adding duration with durationInBlock together', async () => {
            expect(await govern.votingPeriod()).to.equal(
                ethers.BigNumber.from('5'),
            );
        });
    });
    describe('votingDelay()', async () => {
        it('returns always 0', async () => {
            expect(await govern.votingDelay()).to.equal(
                ethers.BigNumber.from('0'),
            );
        });
    });
    describe('proposalThreshold()', async () => {
        it('returns always 0', async () => {
            expect(await govern.proposalThreshold()).to.equal(
                ethers.BigNumber.from('0'),
            );
        });
    });
});
