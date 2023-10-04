const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');

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
    let budgetApprovalAddresses;
    let priceGatewayAddresses;
    let ethereumChainlinkPriceGateway;
    let dao;
    let feedRegistry;
    let tokenBEthAggregator;
    let tokenAEthAggregator;
    let SmockERC20;

    function createDao() {
        return adam.createDao(
            ...getCreateDaoParams({
                name: 'A Company',
                priceGateways: [ethereumChainlinkPriceGateway],
                depositTokens: [ADDRESS_ETH, tokenA.address],
                baseCurrency: ADDRESS_ETH,
                creator: creator.address,
            }),
        );
    }

    before(async () => {
        SmockERC20 = await smock.mock('ERC20');
    });

    beforeEach(async () => {
        [creator, daoMember] = await ethers.getSigners();

        await ethers.provider.send('hardhat_setCode', [
            ADDRESS_MOCK_FEED_REGISTRY,
            feedRegistryArticfact.deployedBytecode,
        ]);

        feedRegistry = await ethers.getContractAt(
            'MockFeedRegistry',
            ADDRESS_MOCK_FEED_REGISTRY,
        );
        const MockAggregatorV3 = await ethers.getContractFactory(
            'MockAggregatorV3',
            { signer: creator },
        );

        tokenA = await SmockERC20.deploy('', '');
        tokenB = await SmockERC20.deploy('', '');

        await tokenA.setVariable('_balances', {
            [daoMember.address]: ethers.utils.parseEther('100'),
        });

        tokenAEthAggregator = await MockAggregatorV3.deploy();
        tokenAEthAggregator.setPrice(ethers.utils.parseEther('0.25'));
        await feedRegistry.setPrice(
            tokenA.address,
            ADDRESS_ETH,
            ethers.utils.parseEther('0.25'),
        );
        await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
        await feedRegistry.setAggregator(
            tokenA.address,
            ADDRESS_ETH,
            tokenAEthAggregator.address,
        );

        await tokenB.setVariable('_balances', {
            [daoMember.address]: ethers.utils.parseEther('100'),
        });

        tokenBEthAggregator = await MockAggregatorV3.deploy();
        tokenBEthAggregator.setPrice(ethers.utils.parseEther('0.25'));
        await feedRegistry.setPrice(
            tokenB.address,
            ADDRESS_ETH,
            ethers.utils.parseEther('0.25'),
        );
        await feedRegistry.setDecimal(tokenB.address, ADDRESS_ETH, 18);
        await feedRegistry.setAggregator(
            tokenB.address,
            ADDRESS_ETH,
            tokenBEthAggregator.address,
        );

        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway.address;

        const tx1 = await createDao();
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
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
