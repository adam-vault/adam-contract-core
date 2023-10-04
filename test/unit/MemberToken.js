const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('MemberToken.sol - test/unit/MemberToken.js', async () => {
    let member;
    let minter;
    let memberToken;
    let MemberToken;
    let DaoChildBeaconProxy;
    let daoProxy;
    let impl;

    before(async () => {
        [minter, member] = await ethers.getSigners();
        MemberToken = await ethers.getContractFactory('MemberToken');
        DaoChildBeaconProxy = await ethers.getContractFactory(
            'DaoChildBeaconProxy',
        );
    });

    beforeEach(async () => {
        const daoBeacon = await smock.fake('DaoBeacon');
        daoProxy = await smock.fake('DaoBeaconProxy');
        impl = await MemberToken.deploy();

        daoBeacon.implementation.returns(impl.address);
        daoProxy.daoBeacon.returns(daoBeacon.address);

        memberToken = await DaoChildBeaconProxy.deploy(
            daoProxy.address,
            ethers.utils.id('adam.dao.member_token'),
            impl.interface.encodeFunctionData('initialize', [
                'MemberTokenName',
                'MT',
            ]),
        );

        memberToken = await ethers.getContractAt(
            'MemberToken',
            memberToken.address,
        );
    });

    describe('initialize()', async () => {
        it('init with minter, name and symbol', async () => {
            let contract = await DaoChildBeaconProxy.deploy(
                daoProxy.address,
                ethers.utils.id('adam.dao.member_token'),
                impl.interface.encodeFunctionData('initialize', [
                    'MemberTokenName',
                    'MT',
                ]),
            );
            contract = await ethers.getContractAt(
                'MemberToken',
                contract.address,
            );

            expect(await contract.owner()).to.equal(minter.address);
            expect(await contract.name()).to.equal('MemberTokenName');
            expect(await contract.symbol()).to.equal('MT');
        });
    });

    describe('mint()', async () => {
        it('mints when msg.sender is minter', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            expect(await memberToken.balanceOf(member.address)).to.equal(10);
        });

        it('throws "Ownable: caller is not the owner" error if not called by minter', async () => {
            await expect(
                memberToken.connect(member).mint(member.address, 10),
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    describe('getVotes()', async () => {
        it('returns correct votes of non minter', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            expect(await memberToken.getVotes(member.address)).to.equal(10);
        });

        it('returns 0 of minter', async () => {
            await memberToken.connect(minter).mint(minter.address, 10);
            expect(await memberToken.getVotes(minter.address)).to.equal(0);
        });
    });

    describe('getPastVotes()', async () => {
        it('returns correct votes of non minter', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            const blockNumber = await ethers.provider.getBlockNumber();
            await memberToken.connect(minter).mint(member.address, 10);

            expect(
                await memberToken.getPastVotes(member.address, blockNumber),
            ).to.equal(10);
        });

        it('returns 0 of minter', async () => {
            await memberToken.connect(minter).mint(minter.address, 10);
            const blockNumber = await ethers.provider.getBlockNumber();
            await memberToken.connect(minter).mint(minter.address, 10);

            expect(
                await memberToken.getPastVotes(minter.address, blockNumber),
            ).to.equal(0);
        });
    });

    describe('getPastTotalSupply', async () => {
        it('returns total amount without balance of minter', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            await memberToken.connect(minter).mint(minter.address, 10);
            const blockNumber = await ethers.provider.getBlockNumber();
            await memberToken.connect(minter).mint(member.address, 10);

            expect(await memberToken.getPastTotalSupply(blockNumber)).to.equal(
                10,
            );
        });
    });

    describe('delegate', async () => {
        it('delegate fail for Member Token', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            await expect(
                memberToken.connect(member).delegate(minter.address),
            ).to.be.revertedWith('Not support delegate Vote');
        });
    });
    describe('delegateBySig', async () => {
        it('delegateBySig fail for Member Token', async () => {
            await memberToken.connect(minter).mint(member.address, 10);
            await expect(
                memberToken
                    .connect(member)
                    .delegateBySig(
                        minter.address,
                        0,
                        0,
                        0,
                        ethers.utils.formatBytes32String(''),
                        ethers.utils.formatBytes32String(''),
                    ),
            ).to.be.revertedWith('Not support delegate Vote');
        });
    });
});
