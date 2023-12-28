const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const { createAdam } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');
const { setMockFeedRegistry } = require('../utils/mockFeedRegistryHelper');

const {
    ADDRESS_ETH,
    ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', async () => {
    let adam;
    let tokenA;
    let tokenB;
    let creator;
    let daoMember;
    let ethereumChainlinkPriceGateway;
    let dao;

    async function createDao() {
        const tx = await adam.createDao(
            ...getCreateDaoParams({
                name: 'A Company',
                priceGateways: [ethereumChainlinkPriceGateway],
                depositTokens: [ADDRESS_ETH, tokenA.address],
                baseCurrency: ADDRESS_ETH,
                creator: creator.address,
            }),
        );
        const { dao: daoAddr } = await findEventArgs(tx, 'CreateDao');
        return ethers.getContractAt('Dao', daoAddr);
    }

    beforeEach(async () => {
        [creator, daoMember] = await ethers.getSigners();

        tokenA = await getMockERC20Token([
            {
                address: daoMember.address,
                balance: ethers.utils.parseEther('100'),
            },
        ]);
        tokenB = await getMockERC20Token([
            {
                address: daoMember.address,
                balance: ethers.utils.parseEther('100'),
            },
        ]);

        await setMockFeedRegistry([
            {
                token1: tokenA.address,
                token2: ADDRESS_ETH,
                price: ethers.utils.parseEther('0.25'),
                decimal: 18,
            },
            {
                token1: tokenB.address,
                token2: ADDRESS_ETH,
                price: ethers.utils.parseEther('0.25'),
                decimal: 18,
            },
        ]);

        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway.address;

        dao = await createDao();
    });

    describe('CreateDao()', async () => {
        it('creates Dao successfully with correct param', async () => {
            const accountingSystem = await ethers.getContractAt(
                'AccountingSystem',
                await dao.accountingSystem(),
            );
            expect(
                await accountingSystem.priceGateways(
                    ethereumChainlinkPriceGateway,
                ),
            ).to.be.equal(true);
            expect(await accountingSystem.defaultPriceGateway()).to.be.equal(
                ethereumChainlinkPriceGateway,
            );
        });
        it('creates Liquid successfully with correct param', async () => {
            const accountingSystem = await ethers.getContractAt(
                'AccountingSystem',
                await dao.accountingSystem(),
            );
            const liquidPool = await ethers.getContractAt(
                'LiquidPool',
                await dao.liquidPool(),
            );
            expect(await liquidPool.accountingSystem()).to.be.equal(
                accountingSystem.address,
            );
        });
    });

    describe('Deposit()', async () => {
        it('creates mint correct amount of Liquid Pool token', async () => {
            const liquidPool = await ethers.getContractAt(
                'LiquidPool',
                await dao.liquidPool(),
            );
            await liquidPool.connect(daoMember).deposit(daoMember.address, {
                value: ethers.utils.parseEther('0.5'),
            });
            expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(
                ethers.utils.parseEther('0.5'),
            );
            await liquidPool.connect(daoMember).deposit(daoMember.address, {
                value: ethers.utils.parseEther('0.5'),
            });
            expect(await liquidPool.balanceOf(daoMember.address)).to.be.equal(
                ethers.utils.parseEther('1'),
            );

            await tokenA.setVariable('_balances', {
                [daoMember.address]: ethers.utils.parseEther('1'),
            });
            await tokenA
                .connect(daoMember)
                .approve(liquidPool.address, ethers.utils.parseEther('1'));
            await liquidPool
                .connect(daoMember)
                .depositToken(
                    daoMember.address,
                    tokenA.address,
                    ethers.utils.parseEther('1'),
                );
        });
    });
});

async function getMockERC20Token(addressBalances) {
    const SmockERC20 = await smock.mock('ERC20');
    token = await SmockERC20.deploy('', '');
    addressBalances.forEach(async ({ address, balance }) => {
        await token.setVariable('_balances', {
            [address]: balance,
        });
    });
    return token;
}
