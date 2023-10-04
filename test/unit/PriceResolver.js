const { ethers } = require('hardhat');
const { expect } = require('chai');

const { parseEther } = ethers.utils;

const { smock } = require('@defi-wonderland/smock');
const { ADDRESS_ETH } = require('../utils/constants');

describe('PriceResolver.sol - test/unit/PriceResolver.js', async () => {
    let creator;
    let accountingSystem;
    let tokenA;
    let tokenB;
    let priceResolver;

    beforeEach(async () => {
        [creator] = await ethers.getSigners();
        priceResolver = await (
            await smock.mock('MockPriceResolver', creator)
        ).deploy();
        accountingSystem = await smock.fake('AccountingSystem');
        await priceResolver.setVariable(
            '_accountingSystem',
            accountingSystem.address,
        );

        tokenA = await smock.fake('TokenA');
        tokenB = await smock.fake('TokenB');
    });

    describe('assetBaseCurrency()', async () => {
        beforeEach(async () => {
            await priceResolver.setVariable('_baseCurrency', tokenA.address);
        });
        it('redirect call to accountingSystem correcly if accountingSystem support the pair', async () => {
            accountingSystem.isSupportedPair.returns(true);
            await priceResolver.assetBaseCurrencyPrice(
                tokenB.address,
                parseEther('1'),
            );
            expect(accountingSystem.isSupportedPair).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
            );
            expect(accountingSystem.assetPrice).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
                parseEther('1'),
            );
        });
        it('redirect call to accountingSystem correcly if accountingSystem not support the pair', async () => {
            accountingSystem.isSupportedPair.returns(false);
            await expect(
                priceResolver.assetBaseCurrencyPrice(
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
            expect(accountingSystem.isSupportedPair).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
            );
            expect(accountingSystem.assetPrice).to.have.callCount(0);
        });
    });

    describe('assetPrice()', async () => {
        it('redirect call to accountingSystem correcly if accountingSystem support the pair', async () => {
            accountingSystem.isSupportedPair.returns(true);
            await priceResolver.assetPrice(
                tokenB.address,
                tokenA.address,
                parseEther('1'),
            );
            expect(accountingSystem.isSupportedPair).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
            );
            expect(accountingSystem.assetPrice).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
                parseEther('1'),
            );
        });
        it('redirect call to accountingSystem correcly if accountingSystem not support the pair', async () => {
            accountingSystem.isSupportedPair.returns(false);
            await expect(
                priceResolver.assetPrice(
                    tokenB.address,
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.be.revertedWithCustomError(priceResolver, 'PairNotSupport');
            expect(accountingSystem.isSupportedPair).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
            );
            expect(accountingSystem.assetPrice).to.have.callCount(0);
        });
    });

    describe('baseCurrencyDecimals()', async () => {
        it('returns the correct value if base currency = Eth', async () => {
            await priceResolver.setVariable('_baseCurrency', ADDRESS_ETH);
            expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(18);
        });

        it('returns the correct value if base currency = ERC 20 token', async () => {
            await priceResolver.setVariable('_baseCurrency', tokenA.address);
            await tokenA.decimals.returns(5);
            expect(await priceResolver.baseCurrencyDecimals()).to.be.equal(5);
        });
    });

    describe('canResolvePrice()', async () => {
        beforeEach(async () => {
            await priceResolver.setVariable('_baseCurrency', tokenA.address);
        });
        it('redirect call to accountingSystem correcly if accountingSystem support the pair', async () => {
            accountingSystem.isSupportedPair.returns(true);
            await priceResolver.canResolvePrice(tokenB.address);
            expect(accountingSystem.isSupportedPair).to.have.been.calledWith(
                tokenB.address,
                tokenA.address,
            );
        });
    });
});
