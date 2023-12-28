const { ethers } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const findEventArgs = require('../../utils/findEventArgs');
const { getCreateUniswapBAParams } = require('../../utils/paramsStruct');
const { createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');
const { setMockFeedRegistry } = require('../utils/mockFeedRegistryHelper');

const { parseEther } = ethers.utils;
const { AddressZero } = ethers.constants;

const RECIPIENT_EXECUTEE = '0x0000000000000000000000000000000000000001';
const RECIPIENT_UNISWAP = '0x0000000000000000000000000000000000000002';

describe('UniswapV3Swapper.sol - test/unit/UniswapSwapper.js', async () => {
    let adam;
    let executor;
    let contract;

    const {
        ADDRESS_ETH,
        ADDRESS_WETH,
        ADDRESS_DAI,
        ADDRESS_UNI,
        ADDRESS_V3_DAI,
    } = require('../utils/constants');

    beforeEach(async () => {
        [executor] = await ethers.getSigners();

        await setMockFeedRegistry([
            {
                token1: ADDRESS_ETH,
                token2: ADDRESS_DAI,
                price: parseEther('1'),
                decimal: 8,
            },
            {
                token1: ADDRESS_ETH,
                token2: ADDRESS_UNI,
                price: parseEther('1'),
                decimal: 8,
            },
        ]);

        const {
            adam,
            ethPriceGateway,
            uniswapLiquidBudgetApproval: uniswapLiquidBAImplementation,
        } = await createAdam();

        const tx1 = await adam.createDao(
            ...paramsStruct.getCreateDaoParams({
                priceGateways: [ethPriceGateway.address],
                creator: executor.address,
            }),
        );

        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        const dao = await ethers.getContractAt('Dao', daoAddr);

        const initData =
            uniswapLiquidBAImplementation.interface.encodeFunctionData(
                'initialize',
                getCreateUniswapBAParams({
                    executor: executor.address,
                    allowUnlimitedUsageCount: true,
                    approvers: [],
                    fromTokens: [ADDRESS_ETH, ADDRESS_WETH],
                    toTokens: [ADDRESS_ETH, ADDRESS_WETH],
                    allowAnyAmount: true,
                    totalAmount: ethers.utils.parseEther('0'),
                    amountPercentage: '100',
                    startTime: Math.round(Date.now() / 1000) - 86400,
                    endTime: Math.round(Date.now() / 1000) + 86400,
                    minApproval: 0,
                }),
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
        context('decode V2 Uniswap Router', async () => {
            it('ETH (exact) => DAI', async () => {
                const msgValue = parseEther('0.01');
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000006523fea700000000000000000000000000000000000000000000000000000000000000020b080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000d1a8c7c6ad3dec6400000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f';

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
                ] = await contract.decodeExecute(data, msgValue);

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(amountIn1).to.equal(parseEther('0.01'));
                expect(amountOut1).to.equal(parseEther('0.01'));
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_WETH);

                expect(recipient2).to.equal(RECIPIENT_EXECUTEE);
                expect(amountIn2).to.equal(parseEther('0.01'));
                expect(amountOut2).to.equal('15107544606138297444'); // get in uniswap portal
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_V3_DAI);
            });

            it('ETH => DAI (exact)', async () => {
                const msgValue = BigNumber.from('9928563190415112'); // get in uniswap portal
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065240b7f00000000000000000000000000000000000000000000000000000000000000030b090c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002345f9c2183f0800000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000d02ab486cedc0000000000000000000000000000000000000000000000000000002345f9c2183f0800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000';

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
                ] = await contract.decodeExecute(data, msgValue);

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(amountIn1).to.equal(msgValue);
                expect(amountOut1).to.equal(msgValue);
                expect(tokenIn1).to.equal(ADDRESS_ETH);
                expect(tokenOut1).to.equal(ADDRESS_WETH);

                expect(recipient2).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn2).to.equal(ADDRESS_ETH);
                expect(tokenOut2).to.equal(ADDRESS_V3_DAI);
                expect(amountIn2).to.equal(msgValue);
                expect(amountOut2).to.equal(
                    BigNumber.from('15000000000000000000'),
                );

                expect(recipient3).to.equal(RECIPIENT_EXECUTEE);
                expect(amountIn3).to.equal(parseEther('0'));
                expect(amountOut3).to.equal(parseEther('0'));
                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
            });

            it('WETH (exact) => DAI', async () => {
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065241ca700000000000000000000000000000000000000000000000000000000000000020a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000ffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000654ba26a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad0000000000000000000000000000000000000000000000000000000065241c7200000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000419590f1bcf9e4fd7ab61eb8309f1a3a867d87c93abecd9a61e9e25b2ded72881e53abcf8e1b3377338e65567f28398752b4a3092b2bf400e3b40a0e27f16c241f1b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000001502a838cf3b611100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f46b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000';

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
                ] = await contract.decodeExecute(data, 0);

                expect(tokenIn1).to.equal(AddressZero);
                expect(tokenOut1).to.equal(AddressZero);
                expect(amountIn1).to.equal(BigNumber.from('0'));
                expect(amountOut1).to.equal(BigNumber.from('0'));
                expect(recipient1).to.equal(AddressZero);

                expect(recipient2).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_V3_DAI);
                expect(amountIn2).to.equal(parseEther('0.001'));
                expect(amountOut2).to.equal(
                    BigNumber.from('1513957386698318097'),
                );
            });

            it('WETH => DAI (exact)', async () => {
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000652520db00000000000000000000000000000000000000000000000000000000000000020a010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000ffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000654ca6dd00000000000000000000000000000000000000000000000000000000000000000000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad00000000000000000000000000000000000000000000000000000000652520e500000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000041788447c65f700dd269524564ca8163391c8144ffe9d4ccdee0cf897ea2f9383039a3079a2a72d456b179352aa29acb45b494aac4d59a7f8c319b1990a74d9d301c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000014d1120d7b1600000000000000000000000000000000000000000000000000000003858e28d2a73a00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b6b175474e89094c44da98b954eedeac495271d0f0001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000';

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
                ] = await contract.decodeExecute(data, 0);

                expect(tokenIn1).to.equal(AddressZero);
                expect(tokenOut1).to.equal(AddressZero);
                expect(amountIn1).to.equal(BigNumber.from('0'));
                expect(amountOut1).to.equal(BigNumber.from('0'));
                expect(recipient1).to.equal(AddressZero);

                expect(recipient2).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn2).to.equal(ADDRESS_WETH);
                expect(tokenOut2).to.equal(ADDRESS_V3_DAI);
                expect(amountIn2).to.equal(BigNumber.from('991270546876218'));
                expect(amountOut2).to.equal(
                    BigNumber.from('1500000000000000000'),
                );
            });

            it('DAI (exact) => ETH', async () => {
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065251eef00000000000000000000000000000000000000000000000000000000000000030a080c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001600000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000ffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000654cabb500000000000000000000000000000000000000000000000000000000000000000000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad00000000000000000000000000000000000000000000000000000000652525bd00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004178d3d99420c5a68fec91cfb382f1248f38b4dc030f46ddda8f8dbae7d60e91343246dceae39ea5c15ad0138c537f3dcb03d9f3c34710144b215034dde8def37c1c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000021eeb660980b000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000021eeb660980b0';

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
                ] = await contract.decodeExecute(data, 0);

                expect(tokenIn1).to.equal(AddressZero);
                expect(tokenOut1).to.equal(AddressZero);
                expect(amountIn1).to.equal(BigNumber.from('0'));
                expect(amountOut1).to.equal(BigNumber.from('0'));
                expect(recipient1).to.equal(AddressZero);

                expect(recipient2).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn2).to.equal(ADDRESS_V3_DAI);
                expect(tokenOut2).to.equal(ADDRESS_WETH);
                expect(amountIn2).to.equal(
                    BigNumber.from('1000000000000000000'),
                );
                expect(amountOut2).to.equal(BigNumber.from('596946331467952'));

                expect(recipient3).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn3).to.equal(AddressZero);
                expect(tokenOut3).to.equal(ADDRESS_ETH);
                expect(amountIn3).to.equal(BigNumber.from('0'));
                expect(amountOut3).to.equal(BigNumber.from('596946331467952'));
            });

            it('DAI => ETH (exact)', async () => {
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000065251f2b0000000000000000000000000000000000000000000000000000000000000002090c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000221b262dd80000000000000000000000000000000000000000000000000000df25fa3410ce59e00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000221b262dd8000';

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
                ] = await contract.decodeExecute(data, 0);

                expect(recipient1).to.equal(RECIPIENT_UNISWAP);
                expect(tokenIn1).to.equal(ADDRESS_V3_DAI);
                expect(tokenOut1).to.equal(ADDRESS_WETH);
                expect(amountIn1).to.equal(
                    BigNumber.from('1004970821632714142'),
                );
                expect(amountOut1).to.equal(BigNumber.from('600000000000000'));

                expect(recipient2).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn2).to.equal(AddressZero);
                expect(tokenOut2).to.equal(ADDRESS_ETH);
                expect(amountIn2).to.equal(BigNumber.from('0'));
                expect(amountOut2).to.equal(BigNumber.from('600000000000000'));
            });

            it('DAI  (exact) => UNI', async () => {
                const data =
                    '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000652522eb0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000030546f2ebcee6ac00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b6b175474e89094c44da98b954eedeac495271d0f000bb81f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000000000000000000000';

                const [
                    {
                        tokenIn: tokenIn1,
                        tokenOut: tokenOut1,
                        amountIn: amountIn1,
                        amountOut: amountOut1,
                        recipient: recipient1,
                    },
                ] = await contract.decodeExecute(data, 0);

                expect(recipient1).to.equal(RECIPIENT_EXECUTEE);
                expect(tokenIn1).to.equal(ADDRESS_V3_DAI);
                expect(tokenOut1).to.equal(ADDRESS_UNI);
                expect(amountIn1).to.equal(
                    BigNumber.from('1000000000000000000'),
                );
                expect(amountOut1).to.equal(
                    BigNumber.from('217658166149572268'),
                );
            });
        });
    });
});
