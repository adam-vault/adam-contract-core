const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { BigNumber } = require('ethers');

const { parseEther } = ethers.utils;

describe('Membership.sol - test/unit/Membership.js', async () => {
    let MockMembership;
    let MockERC20;
    let MockERC721;
    let MockERC1155;
    let MockDao;
    let MockLiquidPool;

    let signerDao;
    let signerUnknown;
    let member;
    let member2;
    let member3;
    let membership;
    let dao;

    before(async () => {
        MockMembership = await smock.mock('Membership');
        MockERC20 = await smock.mock('ERC20');
        MockERC721 = await smock.mock('ERC721');
        MockERC1155 = await smock.mock('ERC1155');
        MockDao = await smock.mock('Dao');
        MockLiquidPool = await smock.mock('LiquidPool');
    });

    beforeEach(async () => {
        [signerUnknown, member, member2, member3] = await ethers.getSigners();
        dao = await MockDao.deploy();

        membership = await MockMembership.deploy();
        await membership.setVariables({
            _owner: dao.address,
            _name: 'DaoName Membership',
            _symbol: 'MS',
            maxMemberLimit: 2,
        });

        signerDao = await testUtils.address.impersonate(dao.address);
        await testUtils.address.setBalance(dao.address, parseEther('1'));
    });

    describe('initialize()', async () => {
        let ERC1967Proxy;
        let membershipImpl;
        before(async () => {
            ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');
            membershipImpl = await (
                await ethers.getContractFactory('Membership')
            ).deploy();
        });
        it('init with name and symbol', async () => {
            const proxy = await ERC1967Proxy.deploy(
                membershipImpl.address,
                '0x',
            );
            const contract = await ethers.getContractAt(
                'Membership',
                proxy.address,
            );
            await contract.initialize('DaoName', 1);
            expect(await contract.name()).to.equal('DaoName Membership');
            expect(await contract.symbol()).to.equal('MS');
            expect(await contract.maxMemberLimit()).to.equal(
                ethers.BigNumber.from('1'),
            );
        });
    });

    describe('createMember()', async () => {
        it('creates member when success', async () => {
            await membership.connect(signerDao).createMember(member.address);
            expect(await membership.isMember(member.address)).to.equal(true);
            expect(await membership.ownerOf(1)).to.equal(member.address);
            expect(await membership.totalSupply()).to.equal(1);
        });

        it('throws "Ownable: caller is not the owner" if not called by signerDao', async () => {
            await expect(
                membership.connect(signerUnknown).createMember(member.address),
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });

        it('throws "MemberAlreadyExists" if member count exceeds limit', async () => {
            await membership.connect(signerDao).createMember(member.address);
            await expect(
                membership.connect(signerDao).createMember(member.address),
            ).to.be.revertedWithCustomError(membership, 'MemberAlreadyExists');
        });

        it('throws "MemberLimitExceeds" if member count exceeds limit', async () => {
            await membership.connect(signerDao).createMember(member.address);
            await membership.connect(signerDao).createMember(member2.address);
            await expect(
                membership.connect(signerDao).createMember(member3.address),
            ).to.be.revertedWithCustomError(membership, 'MemberLimitExceeds');
        });

        it('throws "InsufficientAdmissionToken" if not pass admission token', async () => {
            const token = await MockERC20.deploy('', '');
            token.balanceOf.returns(9);

            await membership.setVariables({
                admissionTokens: [token.address],
                admissionTokenSetting: {
                    [token.address]: {
                        minTokenToAdmit: 10,
                        tokenId: 0,
                        active: true,
                        index: 0,
                    },
                },
            });
            await expect(
                membership.connect(signerDao).createMember(member.address),
            ).to.be.revertedWithCustomError(
                membership,
                'InsufficientAdmissionToken',
            );
        });
    });
    describe('setMemberTokenAsAdmissionToken()', async () => {
        let memberToken;
        beforeEach(async () => {
            memberToken = await MockERC20.deploy('', '');
            dao.memberToken.returns(memberToken.address);
        });
        it('adds MemberToken to admission token', async () => {
            await membership
                .connect(signerDao)
                .setMemberTokenAsAdmissionToken(9);

            expect(await membership.admissionTokens(0)).to.be.equal(
                memberToken.address,
            );
            expect(
                (await membership.admissionTokenSetting(memberToken.address))
                    .minTokenToAdmit,
            ).to.be.deep.equal(BigNumber.from('9'));
        });
        it('throws "Ownable: caller is not the owner" if not called by signerDao', async () => {
            await expect(
                membership
                    .connect(signerUnknown)
                    .setMemberTokenAsAdmissionToken(1),
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
        it('throws "OwnerMemberTokenRequired" if no member token provided', async () => {
            dao.memberToken.returns(ethers.constants.AddressZero);
            await expect(
                membership.connect(signerDao).setMemberTokenAsAdmissionToken(1),
            ).to.be.revertedWithCustomError(
                membership,
                'OwnerMemberTokenRequired',
            );
        });
    });

    describe('addAdmissionToken()', async () => {
        let token721;
        beforeEach(async () => {
            token721 = await MockERC721.deploy('', '');
        });
        it('adds token to admission token', async () => {
            await membership
                .connect(signerDao)
                .addAdmissionToken(token721.address, 1, 2);
            expect(await membership.admissionTokens(0)).to.be.equal(
                token721.address,
            );
            expect(
                (await membership.admissionTokenSetting(token721.address))
                    .minTokenToAdmit,
            ).to.be.deep.equal(BigNumber.from('1'));
        });
        it('throws "Ownable: caller is not the owner" if not called by signerDao', async () => {
            await expect(
                membership
                    .connect(signerUnknown)
                    .addAdmissionToken(token721.address, 1, 2),
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
        it('throws "AdmissionTokenAlreadyExists" if duplicated', async () => {
            await membership
                .connect(signerDao)
                .addAdmissionToken(token721.address, 10, 2);
            await expect(
                membership
                    .connect(signerDao)
                    .addAdmissionToken(token721.address, 1, 1),
            ).to.be.revertedWithCustomError(
                membership,
                'AdmissionTokenAlreadyExists',
            );
        });
        it('throws "InvalidContract" if non contract', async () => {
            await expect(
                membership
                    .connect(signerDao)
                    .addAdmissionToken(ethers.constants.AddressZero, 1, 1),
            ).to.be.revertedWithCustomError(membership, 'InvalidContract');
        });
        it('throws "AdmissionTokenLimitExceeds" if more than 3', async () => {
            const tokenA = await MockERC20.deploy('', '');
            const tokenB = await MockERC20.deploy('', '');
            const tokenC = await MockERC20.deploy('', '');
            const tokenD = await MockERC20.deploy('', '');

            await membership
                .connect(signerDao)
                .addAdmissionToken(tokenA.address, 0, 2);
            await membership
                .connect(signerDao)
                .addAdmissionToken(tokenB.address, 0, 2);
            await membership
                .connect(signerDao)
                .addAdmissionToken(tokenC.address, 0, 2);
            await expect(
                membership
                    .connect(signerDao)
                    .addAdmissionToken(tokenD.address, 0, 2),
            ).to.be.revertedWithCustomError(
                membership,
                'AdmissionTokenLimitExceeds',
            );
        });
    });
    describe('removeAdmissionToken()', async () => {
        let tokenA;
        let tokenB;
        let tokenC;
        beforeEach(async () => {
            tokenA = await MockERC20.deploy('', '');
            tokenB = await MockERC20.deploy('', '');
            tokenC = await MockERC20.deploy('', '');

            await membership.setVariables({
                admissionTokens: [
                    tokenA.address,
                    tokenB.address,
                    tokenC.address,
                ],
                admissionTokenSetting: {
                    [tokenA.address]: {
                        minTokenToAdmit: 1,
                        tokenId: 0,
                        active: true,
                        index: 0,
                    },
                    [tokenB.address]: {
                        minTokenToAdmit: 2,
                        tokenId: 0,
                        active: true,
                        index: 1,
                    },
                    [tokenC.address]: {
                        minTokenToAdmit: 3,
                        tokenId: 0,
                        active: true,
                        index: 2,
                    },
                },
            });
        });
        it('removes first token from admission token', async () => {
            await membership
                .connect(signerDao)
                .removeAdmissionToken(tokenA.address);
            expect(await membership.admissionTokens(0)).to.be.deep.equal(
                tokenC.address,
            );
            expect(await membership.admissionTokens(1)).to.be.deep.equal(
                tokenB.address,
            );
            expect(await membership.countAdmissionTokens()).to.be.deep.equal(
                BigNumber.from('2'),
            );

            expect(
                (await membership.admissionTokenSetting(tokenA.address)).active,
            ).to.be.false;
        });
        it('removes last token from admission token', async () => {
            await membership
                .connect(signerDao)
                .removeAdmissionToken(tokenC.address);
            expect(await membership.admissionTokens(0)).to.be.deep.equal(
                tokenA.address,
            );
            expect(await membership.admissionTokens(1)).to.be.deep.equal(
                tokenB.address,
            );
            expect(await membership.countAdmissionTokens()).to.be.deep.equal(
                BigNumber.from('2'),
            );

            expect(
                (await membership.admissionTokenSetting(tokenC.address)).active,
            ).to.be.false;

            await membership
                .connect(signerDao)
                .removeAdmissionToken(tokenB.address);
            expect(await membership.admissionTokens(0)).to.be.deep.equal(
                tokenA.address,
            );
            expect(await membership.countAdmissionTokens()).to.be.deep.equal(
                BigNumber.from('1'),
            );
            expect(
                (await membership.admissionTokenSetting(tokenB.address)).active,
            ).to.be.false;
        });
        it('throws "AdmissionTokenNotExists" if non exists', async () => {
            await expect(
                membership
                    .connect(signerDao)
                    .removeAdmissionToken(ethers.constants.AddressZero),
            ).to.be.revertedWithCustomError(
                membership,
                'AdmissionTokenNotExists',
            );
        });
    });

    describe('tokenURI()', async () => {
        it('returns tokenURI', async () => {
            await membership.connect(signerDao).createMember(member.address);
            expect(await membership.tokenURI(1)).to.equal(
                'data:application/json;base64,eyJuYW1lIjogIkRhb05hbWUgTWVtYmVyc2hpcCAjMSJ9',
            );
        });
    });

    describe('transferFrom()', async () => {
        it('throws "TransferNotAllow"', async () => {
            await membership.connect(signerDao).createMember(member.address);
            await expect(
                membership
                    .connect(member)
                    .transferFrom(member.address, member2.address, 1),
            ).to.be.revertedWithCustomError(membership, 'TransferNotAllow');
        });
    });

    describe('_afterTokenTransfer()', async () => {
        it('delegates vote when minting', async () => {
            const tx = await membership
                .connect(signerDao)
                .createMember(member.address);
            const receipt = await tx.wait();
            expect(receipt.events.find((e) => e.event === 'DelegateChanged')).to
                .not.be.undefined;
        });

        it('skips delegates vote when minting if member was delegrated by someone else', async () => {
            await membership.connect(member).delegate(member2.address);
            const tx = await membership
                .connect(signerDao)
                .createMember(member.address);
            const receipt = await tx.wait();
            expect(receipt.events.find((e) => e.event === 'DelegateChanged')).to
                .be.undefined;
        });
    });

    describe('isPassAdmissionToken()', async () => {
        let token20;
        let token721;
        let token1155;
        beforeEach(async () => {
            token20 = await MockERC20.deploy('', '');
            token721 = await MockERC721.deploy('', '');
            token1155 = await MockERC1155.deploy('');

            await membership
                .connect(signerDao)
                .addAdmissionToken(token20.address, 10, 0);
            await membership
                .connect(signerDao)
                .addAdmissionToken(token721.address, 1, 1);
            await membership
                .connect(signerDao)
                .addAdmissionToken(token1155.address, 1, 1);
        });

        it('returns true when all pass', async () => {
            await token20.setVariables({ _balances: { [member.address]: 10 } });
            await token721.setVariables({
                _balances: { [member.address]: 1 },
                _owners: { 1: member.address },
            });
            await token1155.setVariables({
                _balances: { 1: { [member.address]: 1 } },
            });
            expect(
                await membership.isPassAdmissionToken(member.address),
            ).to.equal(true);
        });
        it('returns false when lack ERC20', async () => {
            await token721.setVariables({
                _balances: { [member.address]: 1 },
                _owners: { 1: member.address },
            });
            await token1155.setVariables({
                _balances: { 1: { [member.address]: 1 } },
            });
            expect(
                await membership.isPassAdmissionToken(member.address),
            ).to.equal(false);
        });
        it('returns false when lack ERC721', async () => {
            await token20.setVariables({ _balances: { [member.address]: 10 } });
            await token1155.setVariables({
                _balances: { 1: { [member.address]: 1 } },
            });
            expect(
                await membership.isPassAdmissionToken(member.address),
            ).to.equal(false);
        });
        it('returns false when lack ERC1155', async () => {
            await token20.setVariables({ _balances: { [member.address]: 10 } });
            await token721.setVariables({
                _balances: { [member.address]: 1 },
                _owners: { 1: member.address },
            });
            expect(
                await membership.isPassAdmissionToken(member.address),
            ).to.equal(false);
        });
        it('returns false when lack all tokens', async () => {
            expect(
                await membership.isPassAdmissionToken(member.address),
            ).to.equal(false);
        });
    });

    describe('countAdmissionTokens()', async () => {
        let token20;
        let token721;
        let token1155;
        beforeEach(async () => {
            token20 = await MockERC20.deploy('', '');
            token721 = await MockERC721.deploy('', '');
            token1155 = await MockERC1155.deploy('');

            await membership
                .connect(signerDao)
                .addAdmissionToken(token20.address, 10, 0);
            await membership
                .connect(signerDao)
                .addAdmissionToken(token721.address, 1, 1);
            await membership
                .connect(signerDao)
                .addAdmissionToken(token1155.address, 1, 1);
        });

        it('counts admissionTokens', async () => {
            expect(await membership.countAdmissionTokens()).to.equal(
                ethers.BigNumber.from('3'),
            );
        });
    });
    describe('quit()', async () => {
        beforeEach(async () => {
            await membership
                .connect(signerDao)
                .createMember(signerUnknown.address);
            await membership.connect(signerDao).createMember(member.address);
            dao.setFirstDepositTime.returns();
        });
        it('quit if no liquidPool', async () => {
            await membership.connect(member).quit(2);
            expect(await membership.isMember(member.address)).to.be.false;
            expect(await membership.totalSupply()).to.deep.equal(
                BigNumber.from('1'),
            );
        });
        it('quit if hv liquidPool but zero balance', async () => {
            const liquidPool = await MockLiquidPool.deploy();
            dao.liquidPool.returns(liquidPool.address);
            await membership.connect(member).quit(2);
            expect(await membership.isMember(member.address)).to.be.false;
            expect(await membership.totalSupply()).to.deep.equal(
                BigNumber.from('1'),
            );
        });
        it('throws "OwnerLiquidPoolBalanceNonZero" if lp still hv balance', async () => {
            const liquidPool = await MockLiquidPool.deploy();
            dao.liquidPool.returns(liquidPool.address);
            liquidPool.balanceOf.returns(1);
            await expect(
                membership.connect(member).quit(2),
            ).to.be.revertedWithCustomError(
                membership,
                'OwnerLiquidPoolBalanceNonZero',
            );
        });
        it('throws "Unauthorized" if non owner', async () => {
            await expect(
                membership.connect(member).quit(1),
            ).to.be.revertedWithCustomError(membership, 'Unauthorized');
        });
    });
});
