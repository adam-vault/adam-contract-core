const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { parseEther } = ethers.utils;
const { parseUnits } = require('ethers/lib/utils');
const { setMockFeedRegistry } = require('../utils/mockFeedRegistryHelper');

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
    const TOKEN_C_DECIMALS = 6;

    beforeEach(async () => {
        [creator, unknown] = await ethers.getSigners();
        EthereumChainlinkPriceGateway = await ethers.getContractFactory(
            'EthereumChainlinkPriceGateway',
            { signer: creator },
        );
        priceGateway = await EthereumChainlinkPriceGateway.deploy();

        tokenA = await getMockERC20Token(TOKEN_A_DECIMALS);
        tokenB = await getMockERC20Token(TOKEN_B_DECIMALS);
        tokenC = await getMockERC20Token(TOKEN_C_DECIMALS);
        const { feedRegistry: _feedRegistry, aggregators } =
            await setMockFeedRegistry([
                {
                    token1: tokenA.address,
                    token2: ADDRESS_ETH,
                    price: parseEther('0.25'),
                    decimal: 18,
                },
                {
                    token1: tokenB.address,
                    token2: ADDRESS_ETH,
                    price: parseEther('0.5'),
                    decimal: 18,
                },
                {
                    token1: tokenC.address,
                    token2: ADDRESS_ETH,
                    price: parseEther('-1'),
                    decimal: 18,
                },
            ]);
        feedRegistry = _feedRegistry;
        tokenAEthAggregator = aggregators[0];
        tokenBEthAggregator = aggregators[1];
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

async function getMockERC20Token(decimal) {
    const SmockERC20 = await smock.mock('MockToken');
    token = await SmockERC20.deploy();
    await token.setDecimals(decimal);
    return token;
}
