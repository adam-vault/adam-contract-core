const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const { createTokens } = require('../utils/createContract');
const findEventArgs = require('../../utils/findEventArgs');

chai.should();
chai.use(smock.matchers);

describe('Dao.sol - test/unit/Dao.js', async () => {
    let creator;
    let member;
    let mockGovern;
    let dao;
    let mockAdam;
    let mockMembership;
    let lpAsSigner;
    let mockMemberToken;
    let mockTeam;
    let tokenA;
    let tokenC721;
    let tokenD1155;
    let mockGovernImp;

    beforeEach(async () => {
        [creator, member, mockGovern] = await ethers.getSigners();

        ({ tokenA, tokenC721, tokenD1155 } = await createTokens());

        mockAdam = await smock.fake('Adam');
        mockMembership = await (await smock.mock('Membership')).deploy();
        mockGovernImp = await (await smock.mock('Govern')).deploy();
        const mockLiquidPool = await smock.fake('LiquidPool');
        mockTeam = await smock.fake('Team');
        mockMemberToken = await (await smock.mock('MemberToken')).deploy();

        const adamAsSigner = await testUtils.address.impersonate(
            mockAdam.address,
        );
        await testUtils.address.setBalance(
            mockAdam.address,
            ethers.utils.parseEther('1'),
        );

        mockMembership.totalSupply.returns(1);
        mockMembership.isMember.returns(true);
        mockMemberToken.mint.returns();
        mockMemberToken.initialize.returns();

        const DaoBeaconProxy = await ethers.getContractFactory(
            'DaoBeaconProxy',
            { signer: adamAsSigner },
        );
        const Dao = await ethers.getContractFactory('Dao', {
            signer: adamAsSigner,
        });
        const implDao = await Dao.deploy();

        const DaoBeacon = await ethers.getContractFactory('DaoBeacon', {
            signer: adamAsSigner,
        });
        const beacon = await DaoBeacon.deploy('v1', [
            [ethers.utils.id('adam.dao'), implDao.address],
            [ethers.utils.id('adam.dao.membership'), mockMembership.address],
            [ethers.utils.id('adam.dao.member_token'), mockMemberToken.address],
            [ethers.utils.id('adam.dao.liquid_pool'), mockLiquidPool.address],
            [ethers.utils.id('adam.dao.govern'), mockGovernImp.address],
            [ethers.utils.id('adam.dao.team'), mockTeam.address],
        ]);
        const proxyDao = await DaoBeaconProxy.deploy(beacon.address, '0x');

        dao = await ethers.getContractAt('Dao', proxyDao.address, adamAsSigner);
        await mockMembership.setVariable('_owner', proxyDao.address);
        await mockMembership.setVariable('maxMemberLimit', 1);

        await dao.initialize(
            creator.address,
            'Name',
            'Description',
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            [
                Dao.interface.encodeFunctionData('createPlugin', [
                    ethers.utils.id('adam.dao.membership'),
                    mockMembership.interface.encodeFunctionData('initialize', [
                        'DaoName',
                        1000,
                    ]),
                ]),
                Dao.interface.encodeFunctionData('createPlugin', [
                    ethers.utils.id('adam.dao.team'),
                    '0x',
                ]),
                Dao.interface.encodeFunctionData('createPlugin', [
                    ethers.utils.id('adam.dao.member_token'),
                    mockMemberToken.interface.encodeFunctionData('initialize', [
                        'tokenName',
                        'T1',
                    ]),
                ]),
                Dao.interface.encodeFunctionData('createPlugin', [
                    ethers.utils.id('adam.dao.liquid_pool'),
                    mockLiquidPool.interface.encodeFunctionData('initialize', [
                        ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'],
                        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                    ]),
                ]),
                Dao.interface.encodeFunctionData('createGovern', [
                    'General',
                    0,
                    0,
                    0,
                    ethers.constants.AddressZero,
                    0,
                ]),
                Dao.interface.encodeFunctionData('executePlugin', [
                    ethers.utils.id('adam.dao.membership'),
                    mockMembership.interface.encodeFunctionData(
                        'addAdmissionToken',
                        [tokenA.address, 10, 0],
                    ),
                    0,
                ]),
                Dao.interface.encodeFunctionData('executePlugin', [
                    ethers.utils.id('adam.dao.membership'),
                    mockMembership.interface.encodeFunctionData(
                        'addAdmissionToken',
                        [tokenC721.address, 1, 1],
                    ),
                    0,
                ]),
                Dao.interface.encodeFunctionData('executePlugin', [
                    ethers.utils.id('adam.dao.membership'),
                    mockMembership.interface.encodeFunctionData(
                        'addAdmissionToken',
                        [tokenD1155.address, 1, 1],
                    ),
                    0,
                ]),
            ],
        );

        lpAsSigner = await testUtils.address.impersonate(
            await dao.liquidPool(),
        );
    });

    describe('setFirstDepositTime()', async () => {
        it('sets first deposit time when msg.sender is liquid pool', async () => {
            await testUtils.address.setBalance(
                lpAsSigner.address,
                ethers.utils.parseEther('1'),
            );
            await dao
                .connect(lpAsSigner)
                .setFirstDepositTime(creator.address, 10);
            expect(await dao.firstDepositTime(creator.address)).to.equal(10);
        });
        it('throws "Unauthorized"', async () => {
            await expect(
                dao.setFirstDepositTime(creator.address, 0),
            ).to.be.revertedWithCustomError(dao, 'Unauthorized');
        });
    });

    describe('canCreateBudgetApproval()', async () => {
        it('returns value of adam.budgetApprovals()', async () => {
            await mockAdam.budgetApprovals.returns(true);
            expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(
                true,
            );

            await mockAdam.budgetApprovals.returns(false);
            expect(await dao.canCreateBudgetApproval(creator.address)).to.equal(
                false,
            );
        });
    });

    describe('liquidPool()', async () => {
        it('returns address from dao.plugins()', async () => {
            expect(await dao.liquidPool()).to.be.equal(
                await dao.plugins(ethers.utils.id('adam.dao.liquid_pool')),
            );
        });
    });

    describe('govern()', async () => {
        it('returns address from dao.govern()', async () => {
            expect(await dao.govern('General')).to.be.not.equal(
                ethers.constants.AddressZero,
            );
        });
    });

    describe('byPassGovern()', async () => {
        it('return true when it is the only member', async () => {
            mockMembership.totalSupply.returns(1);
            mockMembership.isMember.returns(true);
            expect(await dao.byPassGovern(creator.address)).to.equal(true);
        });

        it('return false when it is more than one member', async () => {
            mockMembership.totalSupply.returns(2);
            mockMembership.isMember.returns(true);
            expect(await dao.byPassGovern(creator.address)).to.equal(false);
        });

        it('return false when it is not member', async () => {
            mockMembership.totalSupply.returns(1);
            mockMembership.isMember.returns(false);
            expect(await dao.byPassGovern(creator.address)).to.equal(false);
        });
    });

    describe('setMinDepositAmount()', async () => {
        it('updates minDepositAmount', async () => {
            await dao.connect(mockGovern).setMinDepositAmount(10);
            expect(await dao.minDepositAmount()).to.equal(10);
        });
    });

    describe('setDescription()', async () => {
        it('updates description', async () => {
            await dao.connect(mockGovern).setDescription('desc');
            expect(await dao.description()).to.equal('desc');
        });
    });

    describe('setLocktime()', async () => {
        it('updates locktime', async () => {
            await dao.connect(mockGovern).setLocktime(123);
            expect(await dao.locktime()).to.equal(123);
        });
    });

    describe('setLogoCID()', async () => {
        it('updates Logo CID', async () => {
            await dao.connect(mockGovern).setLogoCID('cid');
            expect(await dao.logoCID()).to.equal('cid');
        });
    });

    describe('createGovern()', async () => {
        it('calls dao and create govern', async () => {
            const tx = await dao
                .connect(mockGovern)
                .createGovern(
                    'governA',
                    2,
                    3,
                    0,
                    ethers.constants.AddressZero,
                    0,
                );
            const tx2 = await dao
                .connect(mockGovern)
                .createGovern(
                    'governB',
                    5,
                    6,
                    1,
                    ethers.constants.AddressZero,
                    5,
                );
            const tx3 = await dao
                .connect(mockGovern)
                .createGovern('governC', 8, 9, 2, tokenA.address, 6);
            expect(await dao.govern('governA')).to.equal(
                await findEventArgs(tx, 'CreateGovern', 'govern'),
            );
            expect(await dao.govern('governB')).to.equal(
                await findEventArgs(tx2, 'CreateGovern', 'govern'),
            );
            expect(await dao.govern('governC')).to.equal(
                await findEventArgs(tx3, 'CreateGovern', 'govern'),
            );
        });
    });

    describe('addAssets()', async () => {
        it('adds supported asset', async () => {
            await dao.connect(mockGovern).addAssets([tokenA.address]);
            expect(await dao.isAssetSupported(tokenA.address)).to.equal(true);
        });
    });
});
