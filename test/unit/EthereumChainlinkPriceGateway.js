const { expect } = require('chai');
const { ethers } = require('hardhat');

const { parseEther } = ethers.utils;
const { parseUnits } = require('ethers/lib/utils');

const {
    ADDRESS_ETH,
    ADDRESS_MOCK_FEED_REGISTRY,
    ADDRESS_WETH,
} = require('../utils/constants');

describe('EthereumChainlinkPriceGateway', async () => {
    let creator;
    let unknown;
    let tokenA;
    let tokenB;
    let tokenC;
    let EthereumChainlinkPriceGateway;
    let priceGateway;
    let feedRegistry;
    let tokenAEthAggregator;
    let tokenBEthAggregator;
    const TOKEN_A_DECIMALS = 18;
    const TOKEN_B_DECIMALS = 6;

    beforeEach(async () => {
        [creator, unknown] = await ethers.getSigners();
        EthereumChainlinkPriceGateway = await ethers.getContractFactory(
            'EthereumChainlinkPriceGateway',
            { signer: creator },
        );
        priceGateway = await EthereumChainlinkPriceGateway.deploy();

        const MockToken = await ethers.getContractFactory('MockToken', {
            signer: creator,
        });
        const MockAggregatorV3 = await ethers.getContractFactory(
            'MockAggregatorV3',
            { signer: creator },
        );

        const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
        await ethers.provider.send('hardhat_setCode', [
            ADDRESS_MOCK_FEED_REGISTRY,
            feedRegistryArticfact.deployedBytecode,
        ]);
        feedRegistry = await ethers.getContractAt(
            'MockFeedRegistry',
            ADDRESS_MOCK_FEED_REGISTRY,
        );

        tokenA = await MockToken.deploy();
        tokenAEthAggregator = await MockAggregatorV3.deploy();
        tokenAEthAggregator.setPrice(parseEther('0.25'));
        await feedRegistry.setPrice(
            tokenA.address,
            ADDRESS_ETH,
            parseEther('0.25'),
        );
        await feedRegistry.setDecimal(tokenA.address, ADDRESS_ETH, 18);
        await feedRegistry.setAggregator(
            tokenA.address,
            ADDRESS_ETH,
            tokenAEthAggregator.address,
        );

        tokenB = await MockToken.deploy();
        await tokenB.setDecimals(6);
        tokenBEthAggregator = await MockAggregatorV3.deploy();
        tokenBEthAggregator.setPrice(parseEther('0.5'));
        await feedRegistry.setPrice(
            tokenB.address,
            ADDRESS_ETH,
            parseEther('0.5'),
        );
        await feedRegistry.setDecimal(tokenB.address, ADDRESS_ETH, 18);
        await feedRegistry.setAggregator(
            tokenB.address,
            ADDRESS_ETH,
            tokenBEthAggregator.address,
        );

        tokenC = await MockToken.deploy();
        await tokenC.setDecimals(6);
        const tokenCEthAggregator = await MockAggregatorV3.deploy();
        tokenCEthAggregator.setPrice(parseEther('-1'));
        await feedRegistry.setPrice(
            tokenC.address,
            ADDRESS_ETH,
            parseEther('-1'),
        );
        await feedRegistry.setDecimal(tokenC.address, ADDRESS_ETH, 18);
        await feedRegistry.setAggregator(
            tokenC.address,
            ADDRESS_ETH,
            tokenCEthAggregator.address,
        );
    });

    describe('isSupportedPair()', async () => {
        it('returns fail if asset is not support', async () => {
            expect(
                await priceGateway.isSupportedPair(
                    ADDRESS_ETH,
                    unknown.address,
                ),
            ).to.eq(false);
        });
        it('returns fail if base is not support', async () => {
            expect(
                await priceGateway.isSupportedPair(
                    unknown.address,
                    ADDRESS_ETH,
                ),
            ).to.eq(false);
        });
        it('returns true if both base and asset supported', async () => {
            expect(
                await priceGateway.isSupportedPair(
                    tokenA.address,
                    tokenB.address,
                ),
            ).to.eq(true);
        });
        it('returns true if asset/base = ETH/ WETH, and others is a supported token', async () => {
            expect(
                await priceGateway.isSupportedPair(tokenA.address, ADDRESS_ETH),
            ).to.eq(true);
            expect(
                await priceGateway.isSupportedPair(ADDRESS_ETH, tokenA.address),
            ).to.eq(true);
            expect(
                await priceGateway.isSupportedPair(
                    tokenA.address,
                    ADDRESS_WETH,
                ),
            ).to.eq(true);
            expect(
                await priceGateway.isSupportedPair(
                    ADDRESS_WETH,
                    tokenA.address,
                ),
            ).to.eq(true);
            expect(
                await priceGateway.isSupportedPair(ADDRESS_WETH, ADDRESS_ETH),
            ).to.eq(true);
            expect(
                await priceGateway.isSupportedPair(ADDRESS_ETH, ADDRESS_WETH),
            ).to.eq(true);
        });
    });

    describe('assetPrice(): base currency = ETH', async () => {
        it('asset = 1ETH, should return 1 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    ADDRESS_ETH,
                    ADDRESS_ETH,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('1'));
        });
        it('asset = 1tokenA, should return 0.25 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    ADDRESS_ETH,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('0.25'));
        });
        it('asset = 1tokenB, should return 0.5 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    ADDRESS_ETH,
                    parseUnits('1', 6),
                ),
            ).to.eq(parseEther('0.5'));
        });
    });

    describe('assetPrice(): base currency = tokenA', async () => {
        it('asset = 1ETH, should return 4 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    ADDRESS_ETH,
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('4'));
        });

        it('asset = 1tokenA, should return 1 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('1'));
        });

        it('asset = 1tokenB, should return 2 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    tokenA.address,
                    parseUnits('1', 6),
                ),
            ).to.eq(parseEther('2'));
        });
    });

    describe('assetPrice(): base currency = tokenB', async () => {
        it('asset = 1ETH, should return 2 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    ADDRESS_ETH,
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('2', 6));
        });

        it('asset = 1tokenA, should return 0.5 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('0.5', 6));
        });

        it('asset = 1tokenB, should return 1 base currency', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    tokenB.address,
                    parseUnits('1', 6),
                ),
            ).to.eq(parseUnits('1', 6));
        });
    });

    describe('assetPrice(): base currency = tokenC ,  price < 0', async () => {
        it('asset = 1ETH, should return 0 ', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    tokenC.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('0', 6));
        });
    });

    describe('assetEthPrice(): base currency = tokenC ,  price < 0', async () => {
        it('asset = 1ETH, should return 0 ', async () => {
            expect(
                await priceGateway.assetEthPrice(
                    tokenC.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('0', 6));
        });
    });

    describe('ethAssetPrice(): base currency = tokenC ,  price < 0', async () => {
        it('asset = 1ETH, should return 0 ', async () => {
            expect(
                await priceGateway.ethAssetPrice(
                    tokenC.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('0', 6));
        });
    });

    describe('assetEthPrice()', async () => {
        it('asset = 1ETH, return 1', async () => {
            expect(
                await priceGateway.assetEthPrice(ADDRESS_ETH, parseEther('1')),
            ).to.eq(parseEther('1'));
        });

        it('asset = 1tokenA, return 0.25', async () => {
            expect(
                await priceGateway.assetEthPrice(
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('0.25'));
        });

        it('asset = 1tokenB, return 0.5', async () => {
            expect(
                await priceGateway.assetEthPrice(
                    tokenB.address,
                    parseUnits('1', 6),
                ),
            ).to.eq(parseEther('0.5'));
        });
    });

    describe('ethAssetPrice()', async () => {
        it('give 1ETH, return 1ETH', async () => {
            expect(
                await priceGateway.ethAssetPrice(ADDRESS_ETH, parseEther('1')),
            ).to.eq(parseEther('1'));
        });

        it('give 1ETH, return 4tokenA', async () => {
            expect(
                await priceGateway.ethAssetPrice(
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.eq(parseEther('4'));
        });

        it('give 1ETH, return 2tokenB', async () => {
            expect(
                await priceGateway.ethAssetPrice(
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('2', 6));
        });
    });

    describe('Expiry Timestamp in Chainlink', async () => {
        beforeEach(async () => {
            await feedRegistry.setBlockTimestamp(
                tokenB.address,
                ADDRESS_ETH,
                Math.round(Date.now() / 1000) - 86400,
            );
        });
        it('get ethAssetPrice fail ', async () => {
            await expect(
                priceGateway.ethAssetPrice(tokenB.address, parseEther('1')),
            ).to.be.revertedWithCustomError(priceGateway, 'StaleTimestamp');
        });
        it('get ethAssetPrice fail ', async () => {
            await expect(
                priceGateway.assetEthPrice(tokenB.address, parseEther('1')),
            ).to.be.revertedWithCustomError(priceGateway, 'StaleTimestamp');
        });
        it('get ethAssetPrice fail ', async () => {
            await expect(
                priceGateway.assetPrice(
                    tokenA.address,
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.be.revertedWithCustomError(priceGateway, 'StaleTimestamp');
        });
    });

    describe(`When 1 A = 0.0000001 ETH, 1 B = 0.5 ETH, A with ${TOKEN_A_DECIMALS} decimals, B with ${TOKEN_B_DECIMALS} decimals`, async () => {
        beforeEach(async () => {
            await tokenA.setDecimals(TOKEN_A_DECIMALS);
            tokenAEthAggregator.setPrice(ethers.utils.parseEther('0.0000001'));
            await feedRegistry.setPrice(
                tokenA.address,
                ADDRESS_ETH,
                ethers.utils.parseEther('0.0000001'),
            );

            await tokenB.setDecimals(TOKEN_B_DECIMALS);
            tokenBEthAggregator.setPrice(ethers.utils.parseEther('0.5'));
            await feedRegistry.setPrice(
                tokenB.address,
                ADDRESS_ETH,
                ethers.utils.parseEther('0.5'),
            );
        });

        it('answers 1 A = 0.0000001 ETH', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    ADDRESS_ETH,
                    parseUnits('1', TOKEN_A_DECIMALS),
                ),
            ).to.eq(parseEther('0.0000001'));
            expect(
                await priceGateway.assetEthPrice(
                    tokenA.address,
                    parseUnits('1', TOKEN_A_DECIMALS),
                ),
            ).to.eq(parseEther('0.0000001'));
            expect(
                await priceGateway.ethAssetPrice(
                    tokenA.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('10000000', TOKEN_A_DECIMALS));
        });

        it('answers 1 B = 0.5 ETH', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    ADDRESS_ETH,
                    parseUnits('1', TOKEN_B_DECIMALS),
                ),
            ).to.eq(parseEther('0.5'));
            expect(
                await priceGateway.assetEthPrice(
                    tokenB.address,
                    parseUnits('1', TOKEN_B_DECIMALS),
                ),
            ).to.eq(parseEther('0.5'));
            expect(
                await priceGateway.ethAssetPrice(
                    tokenB.address,
                    parseEther('1'),
                ),
            ).to.eq(parseUnits('2', TOKEN_B_DECIMALS));
        });
        it('answers 1 B = 5000000 A', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    tokenA.address,
                    parseUnits('1', TOKEN_B_DECIMALS),
                ),
            ).to.eq(parseUnits('5000000', TOKEN_A_DECIMALS));
        });

        it('answers 1000000000000000000000000000000000000 B = 5000000000000000000000000000000000000000000 A', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenB.address,
                    tokenA.address,
                    parseUnits(
                        '1000000000000000000000000000000000000',
                        TOKEN_B_DECIMALS,
                    ),
                ),
            ).to.eq(
                parseUnits(
                    '5000000000000000000000000000000000000000000',
                    TOKEN_A_DECIMALS,
                ),
            );
        });

        it('answers 1 A = 0.00000005 B = 0 B', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    tokenB.address,
                    parseUnits('1', TOKEN_A_DECIMALS),
                ),
            ).to.eq(parseUnits('0', TOKEN_B_DECIMALS));
        });

        it('answers 5 A = 0.000001 B', async () => {
            expect(
                await priceGateway.assetPrice(
                    tokenA.address,
                    tokenB.address,
                    parseUnits('5', TOKEN_A_DECIMALS),
                ),
            ).to.eq(parseUnits('0.000001', TOKEN_B_DECIMALS));
        });
    });
});
