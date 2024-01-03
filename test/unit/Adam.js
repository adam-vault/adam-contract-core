const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { ADDRESS_ETH } = require('../utils/constants');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('Adam.sol - test/unit/Adam.js', async () => {
    let deployer;
    let daoCreator;
    let unknown;
    let dao;
    let membership;
    let memberToken;
    let govern;
    let team;
    let budgetApproval;
    let beacon;
    let Adam;
    let DaoBeacon;
    before(async () => {
        [deployer, daoCreator, unknown] = await ethers.getSigners();

        dao = await smock.fake('Dao');
        membership = await smock.fake('Membership');
        memberToken = await smock.fake('MemberToken');
        budgetApproval = await smock.fake('TransferERC20BudgetApproval');
        govern = await smock.fake('Govern');
        team = await smock.fake('Team');
        Adam = await ethers.getContractFactory('Adam', { signer: deployer });
        DaoBeacon = await ethers.getContractFactory('DaoBeacon', {
            signer: deployer,
        });
    });

    beforeEach(async () => {
        beacon = await DaoBeacon.deploy('v1', [
            [ethers.utils.id('adam.dao'), dao.address],
            [ethers.utils.id('adam.dao.membership'), membership.address],
            [ethers.utils.id('adam.dao.member_token'), memberToken.address],
            [ethers.utils.id('adam.dao.govern'), govern.address],
            [ethers.utils.id('adam.dao.team'), team.address],
        ]);
    });

    describe('initialize()', async () => {
        it('init with params successfully', async () => {
            const adam = await upgrades.deployProxy(
                Adam,
                [beacon.address, [budgetApproval.address]],
                { kind: 'uups' },
            );
            expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(
                true,
            );
            expect(
                await adam.budgetApprovals(ethers.constants.AddressZero),
            ).to.be.eq(false);
        });
        it('throws "BudgetApprovalAlreadyInitialized" if budgetApproval duplicated', async () => {
            const tx = upgrades.deployProxy(
                Adam,
                [
                    beacon.address,
                    [budgetApproval.address, budgetApproval.address],
                ],
                { kind: 'uups' },
            );
            await expect(tx).to.be.revertedWithCustomError(
                Adam,
                'BudgetApprovalAlreadyInitialized',
            );
        });
        it('throws "BudgetApprovalAlreadyInitialized" if initialized', async () => {
            const adam = await upgrades.deployProxy(
                Adam,
                [beacon.address, [budgetApproval.address]],
                { kind: 'uups' },
            );

            await expect(
                adam.initialize(beacon.address, [budgetApproval.address]),
            ).to.be.revertedWith(
                'Initializable: contract is already initialized',
            );
        });
    });

    describe('daoBeaconIndex()', async () => {
        let beaconV1;
        let beaconV2;
        let adam;
        beforeEach(async () => {
            beaconV1 = await smock.fake('DaoBeacon');
            beaconV2 = await smock.fake('DaoBeacon');

            adam = await upgrades.deployProxy(
                Adam,
                [beaconV1.address, [budgetApproval.address]],
                { kind: 'uups' },
            );
            await adam.setDaoBeacon(beaconV2.address);
        });
        it('inits first version as index 1', async () => {
            expect(await adam.daoBeacon()).to.be.deep.equal(beaconV2.address);
            expect(
                await adam.daoBeaconIndex(beaconV1.address),
            ).to.be.deep.equal(ethers.BigNumber.from('1'));
        });
        it('inits new daoBeacon incrementally', async () => {
            expect(
                await adam.daoBeaconIndex(beaconV2.address),
            ).to.be.deep.equal(ethers.BigNumber.from('2'));
        });
    });

    describe('setDaoBeacon()', async () => {
        let beaconV1;
        let beaconV2;
        let adam;
        beforeEach(async () => {
            beaconV1 = await smock.fake('DaoBeacon');
            beaconV2 = await smock.fake('DaoBeacon');
            adam = await upgrades.deployProxy(
                Adam,
                [beaconV1.address, [budgetApproval.address]],
                { kind: 'uups' },
            );
        });
        it('updates daoBeacon', async () => {
            await expect(adam.setDaoBeacon(beaconV2.address)).to.not.be
                .reverted;
        });
        it('throws "InvalidContract" if set non contract address', async () => {
            await expect(
                adam.setDaoBeacon(unknown.address),
            ).to.be.revertedWithCustomError(adam, 'InvalidContract');
        });
        it('throws "DaoBeaconAlreadyInitialized" error if contract set before', async () => {
            await expect(
                adam.setDaoBeacon(beaconV1.address),
            ).to.be.revertedWithCustomError(
                adam,
                'DaoBeaconAlreadyInitialized',
            );
        });
        it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
            const tx = adam.connect(unknown).setDaoBeacon(beaconV2.address);
            await expect(tx).to.be.revertedWith(
                'Ownable: caller is not the owner',
            );
        });
    });

    describe('upgradeTo()', async () => {
        let mockV2Impl;
        let adam;
        beforeEach(async () => {
            adam = await upgrades.deployProxy(
                Adam,
                [beacon.address, [budgetApproval.address]],
                { kind: 'uups' },
            );

            const MockUpgrade = await ethers.getContractFactory(
                'MockVersionUpgrade',
            );
            mockV2Impl = await MockUpgrade.deploy();
            await mockV2Impl.deployed();
        });
        it('allows owner to upgrade', async () => {
            await adam.upgradeTo(mockV2Impl.address);
            const v2Contract = await ethers.getContractAt(
                'MockVersionUpgrade',
                adam.address,
            );
            expect(await v2Contract.v2()).to.equal(true);
        });
        it('throws "Ownable: caller is not the owner" error if upgrade by non owner', async () => {
            await expect(
                adam.connect(unknown).upgradeTo(mockV2Impl.address),
            ).to.revertedWith('Ownable: caller is not the owner');
        });
    });

    describe('whitelistBudgetApprovals()', async () => {
        let adam;
        let newBudgetApproval1;
        let newBudgetApproval2;
        beforeEach(async () => {
            adam = await upgrades.deployProxy(
                Adam,
                [beacon.address, [budgetApproval.address]],
                { kind: 'uups' },
            );
            newBudgetApproval1 = await smock.fake(
                'TransferERC20BudgetApproval',
            );
            newBudgetApproval2 = await smock.fake(
                'TransferERC20BudgetApproval',
            );
        });
        it('adds budgetApprovals to whitelist', async () => {
            await adam.whitelistBudgetApprovals([
                newBudgetApproval1.address,
                newBudgetApproval2.address,
            ]);
            expect(
                await adam.budgetApprovals(newBudgetApproval1.address),
            ).to.be.eq(true);
            expect(
                await adam.budgetApprovals(newBudgetApproval2.address),
            ).to.be.eq(true);
        });
        it('remains old budgetApprovals in whitelist after new budgetApprovals add to whitelist', async () => {
            await adam.whitelistBudgetApprovals([
                newBudgetApproval1.address,
                newBudgetApproval2.address,
            ]);
            expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(
                true,
            );
        });
        it('throws "BudgetApprovalAlreadyInitialized" if budgetApproval duplicated', async () => {
            const tx = adam.whitelistBudgetApprovals([
                newBudgetApproval1.address,
                newBudgetApproval2.address,
                budgetApproval.address,
            ]);
            await expect(tx).to.be.revertedWithCustomError(
                adam,
                'BudgetApprovalAlreadyInitialized',
            );
        });
        it('throws "InvalidContract" if address zero is set', async () => {
            const tx = adam.whitelistBudgetApprovals([
                ethers.constants.AddressZero,
            ]);
            await expect(tx).to.be.revertedWithCustomError(
                adam,
                'InvalidContract',
            );
        });
        it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
            const tx = adam.connect(unknown).whitelistBudgetApprovals([]);
            await expect(tx).to.be.revertedWith(
                'Ownable: caller is not the owner',
            );
        });
    });

    describe('abandonBudgetApprovals()', async () => {
        let adam;
        let newBudgetApproval1;
        let newBudgetApproval2;
        beforeEach(async () => {
            newBudgetApproval1 = await smock.fake(
                'TransferERC20BudgetApproval',
            );
            newBudgetApproval2 = await smock.fake(
                'TransferERC20BudgetApproval',
            );
            adam = await upgrades.deployProxy(
                Adam,
                [
                    beacon.address,
                    [budgetApproval.address, newBudgetApproval1.address],
                ],
                { kind: 'uups' },
            );
        });
        it('removes budgetApprovals from whitelist', async () => {
            await adam.abandonBudgetApprovals([
                budgetApproval.address,
                newBudgetApproval1.address,
            ]);
            expect(await adam.budgetApprovals(budgetApproval.address)).to.be.eq(
                false,
            );
            expect(
                await adam.budgetApprovals(newBudgetApproval1.address),
            ).to.be.eq(false);
        });
        it('remains old budgetApprovals in whitelist after budgetApprovals removes from whitelist', async () => {
            await adam.abandonBudgetApprovals([budgetApproval.address]);
            expect(
                await adam.budgetApprovals(newBudgetApproval1.address),
            ).to.be.eq(true);
        });
        it('throws "BudgetApprovalNotFound" if abandon non exist budgetApproval', async () => {
            const tx = adam.abandonBudgetApprovals([
                budgetApproval.address,
                newBudgetApproval2.address,
            ]);
            await expect(tx).to.be.revertedWithCustomError(
                adam,
                'BudgetApprovalNotFound',
            );
        });
        it('throws "Ownable: caller is not the owner" if not called by deployer', async () => {
            const tx = adam.connect(unknown).abandonBudgetApprovals([]);
            await expect(tx).to.be.revertedWith(
                'Ownable: caller is not the owner',
            );
        });
    });

    describe('createDao()', async () => {
        let adamForCreatrDao;

        beforeEach(async () => {
            adamForCreatrDao = await upgrades.deployProxy(
                Adam,
                [beacon.address, [budgetApproval.address]],
                { signer: daoCreator, kind: 'uups' },
            );
        });
        it('createDao successfully', async () => {
            await expect(
                adamForCreatrDao.createDao(
                    'name',
                    'description',
                    ADDRESS_ETH,
                    [],
                    ethers.constants.AddressZero,
                ),
            ).to.not.be.reverted;
        });
        it('emits createDao event', async () => {
            const tx = await adamForCreatrDao.createDao(
                'name',
                'description',
                ADDRESS_ETH,
                [],
                ethers.constants.AddressZero,
            );
            const receipt = await tx.wait();
            const event = receipt.events.find((e) => e.event === 'CreateDao');

            expect(event.args.dao).is.not.empty;
            expect(await adamForCreatrDao.daos(event.args.dao)).to.be.eq(true);
        });
    });
});
