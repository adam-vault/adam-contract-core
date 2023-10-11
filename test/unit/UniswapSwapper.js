const { ethers } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const findEventArgs = require('../../utils/findEventArgs');
const encodeCall = require('../../utils/encodeCall');

const { createAdam, createTokens } = require('../utils/createContract');
const feedRegistry = require('../utils/feedRegistry');

const { parseEther } = ethers.utils;
const { AddressZero } = ethers.constants;

const abiCoder = ethers.utils.defaultAbiCoder;

const paramsStruct = require('../../utils/paramsStruct');

const RECIPIENT_UNISWAP = '0x0000000000000000000000000000000000000002';

describe('UniswapSwapper.sol - test/unit/UniswapSwapper.js', async () => {
    let feedRegistry;
    let adam;
    let executor;
    let contract;
    let ethereumChainlinkPriceGateway;

    const {
        ADDRESS_ETH,
        ADDRESS_MOCK_AGGRGATOR,
        ADDRESS_MOCK_FEED_REGISTRY,
        ADDRESS_WETH,
        ADDRESS_DAI,
        ADDRESS_UNI,
    } = require('../utils/constants');

    beforeEach(async () => {
        ({ tokenA } = await createTokens());
        [executor] = await ethers.getSigners();
        await feedRegistry.setMock();
        await feedRegistry.setFeed(ADDRESS_ETH, ADDRESS_DAI, parseEther('1'));
        await feedRegistry.setFeed(ADDRESS_ETH, ADDRESS_UNI, parseEther('1'));

        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
        const tx1 = await adam.createDao(
            ...paramsStruct.getCreateDaoParams({
                priceGateways: [ethereumChainlinkPriceGateway],
                creator: executor.address,
            }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        const dao = await ethers.getContractAt('Dao', daoAddr);
        const uniswapLiquidBAImplementation =
            result.uniswapLiquidBudgetApproval;
        const initData =
            uniswapLiquidBAImplementation.interface.encodeFunctionData(
                'initialize',
                [
                    [
                        // executor
                        AddressZero,
                        0, // executorTeam
                        // approvers
                        [],
                        0, // approverTeam
                        // minApproval
                        0,
                        // text
                        'Uniswap',
                        // transaction type
                        'Swap',
                        Math.round(Date.now() / 1000) - 86400, // startTime
                        Math.round(Date.now() / 1000) + 86400, // endTime,
                        true,
                        0,
                    ],
                    [ADDRESS_ETH, ADDRESS_WETH, ADDRESS_DAI, ADDRESS_UNI],
                    true,
                    [],
                    // allow any amount
                    true,
                    // allowed total amount
                    parseEther('0'),
                    // allowed amount percentage
                    '100',
                    ADDRESS_ETH, // base currency
                ],
            );
        const tx = await dao.createBudgetApprovals(
            [uniswapLiquidBAImplementation.address],
            [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
            tx,
            'CreateBudgetApproval',
        );
        contract = await ethers.getContractAt(
            'UniswapLiquidBudgetApproval',
            budgetApprovalAddress,
        );
    });

    it('decode transaction data without swap result', async () => {
        context('decode WETH9', async () => {
            it('ETH => WETH', async () => {
                const msgValue = parseEther('0.1');
                const data = '0xd0e30db0';

                const [tokenIn, tokenOut, amount] =
                    await contract.decodeWETH9Call(data, msgValue);

                expect(tokenIn).to.equal(ADDRESS_ETH);
                expect(tokenOut).to.equal(ADDRESS_WETH);
                expect(amount).to.equal(msgValue);
            });

            it('WETH => ETH', async () => {
                const data =
                    '0x2e1a7d4d000000000000000000000000000000000000000000000000016345785d8a0000';

                const [tokenIn, tokenOut, amount] =
                    await contract.decodeWETH9Call(data, 0);

                expect(tokenIn).to.equal(ADDRESS_WETH);
                expect(tokenOut).to.equal(ADDRESS_ETH);
                expect(amount).to.equal(parseEther('0.1'));
            });
        });

        context('decode V2 Uniswap Router', async () => {
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.1');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621360a200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005db3338b89c8ee48136867a9ff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(parseEther('0.1'));
                expect(amountOut1).to.equal(
                    BigNumber.from('7423679244752028155668362406399'),
                );
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.135715855724850170');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621368ac000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000007e37be2022c0914b268000000000000000000000000000000000000000000000000000000001e228da0ade2bfa0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('135715855724850170'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('10000000000000000000000000000000'),
                );

                expect(recipient2).to.equal(AddressZero);
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(AddressZero);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('0'));
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213709500000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005e61879db2759f54b0e3995c000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('7477631271982700022195063184384'),
                );
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213712b00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000001645545a09fc3520000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100298849244922706'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('7500000000000000000000000000000'),
                );
            });

            it('UNI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000000000000000021b63d50268a5d80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c000000000000000000000000000000000000000000000000021b63d50268a5d8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('60000000000000000'));
                expect(amountOut1).to.equal(
                    BigNumber.from('151824778966640088'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(
                    BigNumber.from('151824778966640088'),
                );
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0cd000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a670000000000000000000000000000000000000000000000000214e8348c4f000000000000000000000000000000000000000000000000000000d299cbd738c56a0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000214e8348c4f0000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('59278845877470570'));
                expect(amountOut1).to.equal(
                    BigNumber.from('150000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(
                    BigNumber.from('150000000000000000'),
                );
            });
        });

        context('decode V3 Uniswap Router', async () => {
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.1');
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213634600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(msgValue);
                expect(amountOut1).to.equal(
                    BigNumber.from('13693551211040738738821856344669'),
                );
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.000000000001345821');
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136662000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000000000000000000000000000000000000014891d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('1345821'));
                expect(amountOut1).to.equal(
                    BigNumber.from('100000000000000000000'),
                );

                expect(recipient2).to.equal(AddressZero);
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(AddressZero);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('0'));
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213722a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('13693551211040738738821856344669'),
                );
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621372b100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000000bf36a94c9f363f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('53821821314610751'));
                expect(amountOut1).to.equal(
                    BigNumber.from('7500000000000000000000000000000'),
                );
            });

            it('DAI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214688d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc4735000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc20000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_DAI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('1335249'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('1335249'));
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214df38000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df0000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000023e33e5347d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('39458910193623'));
                expect(amountOut1).to.equal(BigNumber.from('100000000000000'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('100000000000000'));
            });
        });

        context('decode hybrid (V2 + V3) Uniswap Router', async () => {
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.3');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621362ec000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f30000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000000000000000000e06c72447c78d7d9f8bf7a79340000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000003836e4c2245dba427297bea15c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('240000000000000000'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('17780670925216377724444828399924'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('60000000000000000'));
                expect(amountOut2).to.equal(
                    BigNumber.from('4453765843225961921417282756956'),
                );
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.203479691398962913');
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136a14000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000008dfeb5e42718a3748b50000000000000000000000000000000000000000000000000000000021e8ff2205824150000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000002f54e74c0d08367c2e7000000000000000000000000000000000000000000000000000000000b457c1647f3acc000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, msgValue, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('152717707464680469'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('11250000000000000000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('50761983934282444'));
                expect(amountOut2).to.equal(
                    BigNumber.from('3750000000000000000000000000000'),
                );
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146734000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000001cdda4faccd000000000000000000000000000000000000000000780b6875d526532ce7c61e92a00000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000f8b0a10e4700000000000000000000000000000000000000000040de0ac17b104f9a943a869485000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('130000000000000000'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('9510910121553791812234521776800'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('70000000000000000'));
                expect(amountOut2).to.equal(
                    BigNumber.from('5139321076038308400432457094277'),
                );
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146545000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f29597c26d49cf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f1eab8757de498000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('68281423398521295'));
                expect(amountOut1).to.equal(
                    BigNumber.from('5000000000000000000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('68093547353334936'));
                expect(amountOut2).to.equal(
                    BigNumber.from('5000000000000000000000000000000'),
                );
            });

            it('UNI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214cd6600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000104472b43f30000000000000000000000000000000000000000000000000005543df729c000000000000000000000000000000000000000000000000000000f82b3a947a1b10000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000c6f3b40b6c00000000000000000000000000000000000000000000000000000237c024ad815be00000000000000000000000000000000000000000000000000000000000000421f9840a85d5af5bf1d1762f925bdaddc4201f984000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735002710C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000032feb5f41fb76f000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                    {
                        tokenIn: tokenIn3,
                        tokenOut: tokenOut3,
                        amountIn: amountIn3,
                        amountOut: amountOut3,
                        recipient: recipient3,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('1500000000000000'));
                expect(amountOut1).to.equal(BigNumber.from('4365832801460657'));

                expect(recipient2).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn2).to.equal(ADDRESS_UNI);
                expect(tokenOut2).to.equal(ADDRESS_WETH);
                expect(amountIn2).to.equal(BigNumber.from('3500000000000000'));
                expect(amountOut2).to.equal(BigNumber.from('9987973472327102'));

                expect(recipient3).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
                expect(amountIn3).to.equal(BigNumber.from('0'));
                expect(amountOut3).to.equal(
                    BigNumber.from('14353806273787759'),
                );
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214a2ba00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010442712a67000000000000000000000000000000000000000000000000000ffcb9e57d4000000000000000000000000000000000000000000000000000000475b84cdb53f90000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012409b8134600000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000254db1c2244000000000000000000000000000000000000000000000000000000a8bdae12a333f0000000000000000000000000000000000000000000000000000000000000042C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735000bb81f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                    {
                        tokenIn: tokenIn3,
                        tokenOut: tokenOut3,
                        amountIn: amountIn3,
                        amountOut: amountOut3,
                        recipient: recipient3,
                    },
                ] = await contract.decodeUniswapMulticall(data, 0, '0x');

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('1255334330717177'));
                expect(amountOut1).to.equal(BigNumber.from('4500000000000000'));

                expect(recipient2).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_UNI);
                expect(amountIn2).to.equal(BigNumber.from('2968521963877183'));
                expect(amountOut2).to.equal(
                    BigNumber.from('10500000000000000'),
                );

                expect(recipient3).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
                expect(amountIn3).to.equal(BigNumber.from('0'));
                expect(amountOut3).to.equal(
                    BigNumber.from('15000000000000000'),
                );
            });
        });
    });

    it('decode transaction data with swap result', async () => {
        context('decode WETH9', async () => {
            it('ETH => WETH', async () => {
                const msgValue = parseEther('0.1');
                const data = '0xd0e30db0';
                const [tokenIn, tokenOut, amount] =
                    await contract.decodeWETH9Call(data, msgValue);

                expect(tokenIn).to.equal(ADDRESS_ETH);
                expect(tokenOut).to.equal(ADDRESS_WETH);
                expect(amount).to.equal(msgValue);
            });

            it('WETH => ETH', async () => {
                const data =
                    '0x2e1a7d4d000000000000000000000000000000000000000000000000016345785d8a0000';
                const [tokenIn, tokenOut, amount] =
                    await contract.decodeWETH9Call(data, 0);

                expect(tokenIn).to.equal(ADDRESS_WETH);
                expect(tokenOut).to.equal(ADDRESS_ETH);
                expect(amount).to.equal(parseEther('0.1'));
            });
            it('throws "Failed to decode Uniswap bytecode" when bytes not match deposit or withdraw', async () => {
                await expect(
                    contract.decodeWETH9Call('0x5ae401dc', 0),
                ).to.be.revertedWith('Failed to decode Uniswap bytecode');
            });
        });

        context('decode V2 Uniswap Router', async () => {
            const result = '100';
            const mockEncodedResult = abiCoder.encode(
                ['bytes[]'],
                [[abiCoder.encode(['uint256'], [result])]],
            );

            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.1');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621360a200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005db3338b89c8ee48136867a9ff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';
                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('100'));
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.135715855724850170');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621368ac000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000007e37be2022c0914b268000000000000000000000000000000000000000000000000000000001e228da0ade2bfa0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(
                    BigNumber.from('10000000000000000000000000000000'),
                );

                expect(recipient2).to.equal(AddressZero);
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(AddressZero);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('0'));
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213709500000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005e61879db2759f54b0e3995c000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('100'));
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213712b00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000001645545a09fc3520000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(
                    BigNumber.from('7500000000000000000000000000000'),
                );
            });

            it('UNI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000000000000000021b63d50268a5d80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c000000000000000000000000000000000000000000000000021b63d50268a5d8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('60000000000000000'));
                expect(amountOut1).to.equal(BigNumber.from('100'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(
                    BigNumber.from('151824778966640088'),
                );
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0cd000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a670000000000000000000000000000000000000000000000000214e8348c4f000000000000000000000000000000000000000000000000000000d299cbd738c56a0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000214e8348c4f0000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(
                    BigNumber.from('150000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(
                    BigNumber.from('150000000000000000'),
                );
            });
        });

        context('decode V3 Uniswap Router', async () => {
            const result = '100';
            const mockEncodedResult = abiCoder.encode(
                ['bytes[]'],
                [[abiCoder.encode(['uint256'], [result])]],
            );
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.1');
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213634600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('100'));
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.000000000001345821');
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136662000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000000000000000000000000000000000000014891d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(
                    BigNumber.from('100000000000000000000'),
                );

                expect(recipient2).to.equal(AddressZero);
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(AddressZero);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('0'));
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006213722a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('100'));
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621372b100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000000bf36a94c9f363f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(
                    BigNumber.from('7500000000000000000000000000000'),
                );
            });

            it('DAI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214688d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc4735000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc20000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_DAI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(
                    BigNumber.from('100000000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('100'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('1335249'));
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214df38000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df0000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000023e33e5347d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('100'));
                expect(amountOut1).to.equal(BigNumber.from('100000000000000'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('100000000000000'));
            });
        });

        context('decode hybrid (V2 + V3) Uniswap Router', async () => {
            const mockEncodedResult = abiCoder.encode(
                ['bytes[]'],
                [
                    [
                        abiCoder.encode(['uint256'], ['50']),
                        abiCoder.encode(['uint256'], ['50']),
                    ],
                ],
            );
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.3');
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000621362ec000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f30000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000000000000000000e06c72447c78d7d9f8bf7a79340000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000003836e4c2245dba427297bea15c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('240000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('50'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('60000000000000000'));
                expect(amountOut2).to.equal(BigNumber.from('50'));
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = parseEther('0.203479691398962913');
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136a14000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000008dfeb5e42718a3748b50000000000000000000000000000000000000000000000000000000021e8ff2205824150000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000002f54e74c0d08367c2e7000000000000000000000000000000000000000000000000000000000b457c1647f3acc000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                    {
                        tokenIn: tokenIn3,
                        tokenOut: tokenOut3,
                        amountIn: amountIn3,
                        amountOut: amountOut3,
                        recipient: recipient3,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    msgValue,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('50'));
                expect(amountOut1).to.equal(
                    BigNumber.from('11250000000000000000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('50'));
                expect(amountOut2).to.equal(
                    BigNumber.from('3750000000000000000000000000000'),
                );

                expect(recipient3).to.equal(AddressZero);
                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(AddressZero);
                expect(amountIn3).to.equal(BigNumber.from('0'));
                expect(amountOut3).to.equal(BigNumber.from('0'));
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146734000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000001cdda4faccd000000000000000000000000000000000000000000780b6875d526532ce7c61e92a00000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000f8b0a10e4700000000000000000000000000000000000000000040de0ac17b104f9a943a869485000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(
                    BigNumber.from('130000000000000000'),
                );
                expect(amountOut1).to.equal(BigNumber.from('50'));

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
                expect(amountIn2).to.equal(BigNumber.from('70000000000000000'));
                expect(amountOut2).to.equal(BigNumber.from('50'));
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146545000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f29597c26d49cf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f1eab8757de498000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(tokenIn1).to.equal(ADDRESS_WETH);
                expect(tokenOut1).to.equal(ADDRESS_DAI);
                expect(amountIn1).to.equal(BigNumber.from('50'));
                expect(amountOut1).to.equal(
                    BigNumber.from('5000000000000000000000000000000'),
                );

                expect(recipient2).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
                expect(amountIn2).to.equal(BigNumber.from('50'));
                expect(amountOut2).to.equal(
                    BigNumber.from('5000000000000000000000000000000'),
                );
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_DAI);
            });

            it('UNI (exact) => ETH', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214cd6600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000104472b43f30000000000000000000000000000000000000000000000000005543df729c000000000000000000000000000000000000000000000000000000f82b3a947a1b10000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000c6f3b40b6c00000000000000000000000000000000000000000000000000000237c024ad815be00000000000000000000000000000000000000000000000000000000000000421f9840a85d5af5bf1d1762f925bdaddc4201f984000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735002710C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000032feb5f41fb76f000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                    {
                        tokenIn: tokenIn3,
                        tokenOut: tokenOut3,
                        amountIn: amountIn3,
                        amountOut: amountOut3,
                        recipient: recipient3,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('1500000000000000'));
                expect(amountOut1).to.equal(BigNumber.from('50'));

                expect(recipient2).to.equal(RECIPIENT_UNISWAP);
                expect(amountIn2).to.equal(BigNumber.from('3500000000000000'));
                expect(amountOut2).to.equal(BigNumber.from('50'));
                expect(tokenIn2).to.equal(ADDRESS_UNI);
                expect(tokenOut2).to.equal(ADDRESS_WETH);

                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
                expect(amountIn3).to.equal(parseEther('0'));
                expect(amountOut3).to.equal(
                    BigNumber.from('14353806273787759'),
                );
                expect(recipient3).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
            });

            it('UNI => ETH (exact)', async () => {
                const data =
                    '0x5ae401dc000000000000000000000000000000000000000000000000000000006214a2ba00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010442712a67000000000000000000000000000000000000000000000000000ffcb9e57d4000000000000000000000000000000000000000000000000000000475b84cdb53f90000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012409b8134600000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000254db1c2244000000000000000000000000000000000000000000000000000000a8bdae12a333f0000000000000000000000000000000000000000000000000000000000000042C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735000bb81f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                    {
                        tokenIn: tokenIn2,
                        tokenOut: tokenOut2,
                        amountIn: amountIn2,
                        amountOut: amountOut2,
                        recipient: recipient2,
                    },
                    {
                        tokenIn: tokenIn3,
                        tokenOut: tokenOut3,
                        amountIn: amountIn3,
                        amountOut: amountOut3,
                        recipient: recipient3,
                    },
                ] = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    mockEncodedResult,
                );

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_UNI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(BigNumber.from('50'));
                expect(amountOut1).to.equal(BigNumber.from('4500000000000000'));

                expect(recipient2).to.equal(RECIPIENT_UNISWAP);
                expect(amountIn2).to.equal(BigNumber.from('50'));
                expect(amountOut2).to.equal(parseEther('0.010500000000000000'));
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_UNI);

                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
                expect(amountIn3).to.equal(parseEther('0'));
                expect(amountOut3).to.equal(parseEther('0.015'));
                expect(recipient3).to.equal(
                    '0xBfAA947b65A4350f14895980D0c8f420576fC163',
                );
            });
            it('DAI => AVA', async () => {
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000630d78780000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000005a00000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001f40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000018650127cc3dc80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000001043561a882930000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000056bc75e2d6310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000bb8dac17f958d2ee523a2206206994597c13d831ec7000064a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000002b5e3af16b188000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000bb86b175474e89094c44da98b954eedeac495271d0f000064a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000002b5e3af16b188000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc20001f42260fac5e5542a773aa44fbcfedf7c193bc2c599000bb8a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064df2ab5bb000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000001619766be8e0000000000000000000000003c01e0cdc9d7c3b548b4e6e6a558d78ea52c1f9e00000000000000000000000000000000000000000000000000000000';

                const results = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    '0x',
                );
                expect(results[0].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[0].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[0].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[0].amountIn).to.equal(
                    BigNumber.from('50000000000000000000'),
                );
                expect(results[0].amountOut).to.equal(BigNumber.from('0'));

                expect(results[1].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[1].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[1].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[1].amountIn).to.equal(
                    BigNumber.from('450000000000000000000'),
                );
                expect(results[1].amountOut).to.equal(BigNumber.from('0'));

                expect(results[2].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[2].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[2].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[2].amountIn).to.equal(
                    BigNumber.from('300000000000000000000'),
                );
                expect(results[2].amountOut).to.equal(BigNumber.from('0'));

                expect(results[3].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[3].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[3].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[3].amountIn).to.equal(
                    BigNumber.from('100000000000000000000'),
                );
                expect(results[3].amountOut).to.equal(BigNumber.from('0'));

                expect(results[4].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[4].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[4].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[4].amountIn).to.equal(
                    BigNumber.from('50000000000000000000'),
                );
                expect(results[4].amountOut).to.equal(BigNumber.from('0'));

                expect(results[5].recipient).to.equal(RECIPIENT_UNISWAP);
                expect(results[5].tokenIn).to.equal(ADDRESS_WETH);
                expect(results[5].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[5].amountIn).to.equal(
                    BigNumber.from('50000000000000000000'),
                );
                expect(results[5].amountOut).to.equal(BigNumber.from('0'));

                expect(results[6].recipient).to.equal(
                    '0x3c01e0cdc9d7c3b548B4e6E6a558D78eA52C1F9e',
                );
                expect(results[6].tokenIn).to.equal(
                    '0x0000000000000000000000000000000000000000',
                );
                expect(results[6].tokenOut).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[6].amountIn).to.equal(BigNumber.from('0'));
                expect(results[6].amountOut).to.equal(
                    BigNumber.from('1518663548558'),
                );
            });
            it('selfPermit()', async () => {
                const data =
                    '0x5ae401dc00000000000000000000000000000000000000000000000000000000630d7877000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000c4f3995c67000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000017d7840000000000000000000000000000000000000000000000000000000000630d7cc8000000000000000000000000000000000000000000000000000000000000001b9f5f1c31694ad1e8b50d9023cbf1ab69a891c31d5d921385430528f26370f8a4468908dad7dcbac399c3866a468fd2137042efe2297500455d61a0b58020adda000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000104472b43f3000000000000000000000000000000000000000000000000000000001312d000000000000000000000000000000000000000000000000011c288ca98b75dd9610000000000000000000000000000000000000000000000000000000000000080000000000000000000000000165a3e354b4c7cb620133d1e232b5ee57af337f10000000000000000000000000000000000000000000000000000000000000003000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000adb0739822374a05653f513683ddbeba3cc81f2e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4472b43f30000000000000000000000000000000000000000000000000000000004c4b4000000000000000000000000000000000000000000000000049d3ee7af4fd4dbe70000000000000000000000000000000000000000000000000000000000000080000000000000000000000000165a3e354b4c7cb620133d1e232b5ee57af337f10000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000adb0739822374a05653f513683ddbeba3cc81f2e00000000000000000000000000000000000000000000000000000000';
                const results = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    '0x',
                );
                expect(results[0].recipient).to.equal(AddressZero);
                expect(results[0].tokenIn).to.equal(AddressZero);
                expect(results[0].tokenOut).to.equal(AddressZero);
                expect(results[0].amountIn).to.equal(BigNumber.from('0'));
                expect(results[0].amountOut).to.equal(BigNumber.from('0'));

                expect(results[1].recipient).to.equal(
                    '0x165a3e354b4C7cb620133D1e232b5EE57AF337F1',
                );
                expect(results[1].tokenIn).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[1].tokenOut).to.equal(
                    '0xadB0739822374A05653F513683DdBEbA3CC81f2e',
                );
                expect(results[1].amountIn).to.equal(
                    BigNumber.from('320000000'),
                );
                expect(results[1].amountOut).to.equal(
                    BigNumber.from('327612325850513267041'),
                );

                expect(results[2].recipient).to.equal(
                    '0x165a3e354b4C7cb620133D1e232b5EE57AF337F1',
                );
                expect(results[2].tokenIn).to.equal(
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                );
                expect(results[2].tokenOut).to.equal(
                    '0xadB0739822374A05653F513683DdBEbA3CC81f2e',
                );
                expect(results[2].amountIn).to.equal(
                    BigNumber.from('80000000'),
                );
                expect(results[2].amountOut).to.equal(
                    BigNumber.from('85117724747493596135'),
                );
            });

            it('multicall(bytes32,bytes[])', async () => {
                const call1 = encodeCall('refundETH()');
                const data = encodeCall('multicall(bytes32,bytes[])', [
                    ethers.utils.formatBytes32String('text'),
                    [call1],
                ]);
                const results = await contract.decodeUniswapMulticall(
                    data,
                    0,
                    '0x',
                );
                expect(results[0].recipient).to.equal(AddressZero);
                expect(results[0].tokenIn).to.equal(AddressZero);
                expect(results[0].tokenOut).to.equal(AddressZero);
                expect(results[0].amountIn).to.equal(BigNumber.from('0'));
                expect(results[0].amountOut).to.equal(BigNumber.from('0'));
            });

            it('throws "passing too much ETH to uniswap" when too much ETH passed to contract', async () => {
                const call1 = encodeCall('refundETH()');
                const data = encodeCall('multicall(bytes32,bytes[])', [
                    ethers.utils.formatBytes32String('text'),
                    [call1],
                ]);
                await expect(
                    contract.decodeUniswapMulticall(data, 1, '0x'),
                ).to.be.revertedWithCustomError(contract, 'TooMuchETH');
            });

            it('throws "DecodeFailed" when unknown funcsig passed to contract', async () => {
                const call1 = encodeCall('refundETH2()');
                const data = encodeCall('multicall(bytes32,bytes[])', [
                    ethers.utils.formatBytes32String('text'),
                    [call1],
                ]);
                await expect(
                    contract.decodeUniswapMulticall(data, 0, '0x'),
                ).to.be.revertedWithCustomError(contract, 'DecodeFailed');
            });

            it('throws "DecodeWETHDataFail" when not enough ETH pass to contract', async () => {
                const data =
                    '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146545000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f29597c26d49cf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f1eab8757de498000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
                await expect(
                    contract.decodeUniswapMulticall(data, 1, '0x'),
                ).to.be.revertedWithCustomError(contract, 'DecodeWETHDataFail');
            });

            it('throws "Failed to decode Uniswap multicall bytecode" when bytes not match multicall', async () => {
                await expect(
                    contract.decodeUniswapMulticall('0xd0e30db0', 0, '0x'),
                ).to.be.revertedWith(
                    'Failed to decode Uniswap multicall bytecode',
                );
            });
        });
    });
});
