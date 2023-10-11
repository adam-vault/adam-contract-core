const chai = require('chai');
const { ethers, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const {
    ADDRESS_UNISWAP_ROUTER,
    ADDRESS_ETH,
    ADDRESS_WETH,
} = require('../utils/constants');
const {
    encodeV2SwapExactOut,
    encodeV2SwapExactIn,
    encodeWrapETH,
    encodeUnwrapWETH,
    encodePermit2Permit,
    encodeV3SwapExactIn,
    UNISWAP_COMMAND_TYPE,
} = require('../utils/uniswapV3PayloadEncoder');

const { expect } = chai;
const { BigNumber } = ethers;

chai.should();
chai.use(smock.matchers);
const abiCoder = ethers.utils.defaultAbiCoder;

const RECIPIENT_UNISWAP = '0x0000000000000000000000000000000000000002';
const RECIPIENT_EXECUTER = '0x0000000000000000000000000000000000000001';

describe('UniswapV3LiquidBudgetApproval.sol - test/unit/UniswapV3LiquidBudgetApproval.js', async () => {
    let executor;
    let mockToken;
    let mockTokenB;
    let team;
    let executee;
    let mockUniswapV3Router;
    let executeeAsSigner;
    let UniswapV3LiquidBudgetApproval;
    let ERC1967Proxy;
    let uniswapBAImpl;
    let accountingSystem;

    function initializeParser(params = {}) {
        return [
            [
                params.executor || executor.address,
                params.executorTeamId || 0,
                params.approvers || [],
                params.approverTeamId || 0,
                params.minApproval || 0,
                params.text || 'text',
                params.transactionType || 'transactionType',
                params.startTime || Math.round(Date.now() / 1000) - 86400,
                params.endTime || Math.round(Date.now() / 1000) + 86400,
                params.allowUnlimitedUsageCount || true,
                params.usageCount || 0,
            ],
            params.fromTokens || [ADDRESS_ETH],
            params.allowAllToTokens ?? true,
            params.toTokens || [],
            params.allowAnyAmount ?? true,
            params.totalAmount || 0,
            params.amountPercentage || 100,
            params.baseCurrency || ADDRESS_ETH,
        ];
    }

    function encodeTxData(to, data, value) {
        return abiCoder.encode(
            ['address to', 'bytes data', 'uint256 value'],
            [to, data, value],
        );
    }

    function encodePool(tokenIn, fee, tokenOut) {
        return abiCoder.encode(
            ['address tokenIn', 'uint24 fee', 'address tokenOut'],
            [tokenIn, fee, tokenOut],
        );
    }

    function encodeExecuteData(commands, datas) {
        return mockUniswapV3Router.interface.encodeFunctionData(
            'execute(bytes,bytes[],uint256)',
            [commands, datas, ethers.constants.MaxUint256],
        );
    }

    async function executeUniswapBA(budget, executor, calldata, value = 0) {
        return budget
            .connect(executor)
            .createTransaction(
                [encodeTxData(ADDRESS_UNISWAP_ROUTER, calldata, value)],
                Math.round(Date.now() / 1000) + 86400,
                true,
                '',
            );
    }

    beforeEach(async () => {
        [executor] = await ethers.getSigners();

        team = await smock.fake('Team');
        accountingSystem = await smock.fake('AccountingSystem');
        executee = await (
            await smock.mock('MockBudgetApprovalExecutee')
        ).deploy();
        await executee.setVariable(
            '_accountingSystem',
            accountingSystem.address,
        );
        await executee.setVariable('_team', team.address);

        accountingSystem.isSupportedPair
            .whenCalledWith(ADDRESS_ETH, ADDRESS_ETH)
            .returns(accountingSystem.address);
        accountingSystem.assetPrice.returns(([, , amount]) => amount);
        mockToken = await smock.fake('ERC20');
        mockTokenB = await smock.fake('ERC20');
        mockUniswapV3Router = await smock.fake('mockUniswapV3Router');

        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [executee.address],
        });
        await network.provider.send('hardhat_setBalance', [
            executee.address,
            '0x10000000000000000000000000000',
        ]);

        executeeAsSigner = await ethers.getSigner(executee.address);
        UniswapV3LiquidBudgetApproval = await ethers.getContractFactory(
            'UniswapV3LiquidBudgetApproval',
            { signer: executeeAsSigner },
        );
        ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', {
            signer: executeeAsSigner,
        });

        uniswapBAImpl = await UniswapV3LiquidBudgetApproval.deploy();
    });

    describe('initialize()', async () => {
        it('init with params with the least setting successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                uniswapBAImpl.address,
                UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser(),
                ),
            );
            const uniswapBA = await ethers.getContractAt(
                'UniswapV3LiquidBudgetApproval',
                contract.address,
            );

            expect(await uniswapBA.name()).to.be.eq(
                'Uniswap V3 Liquid Budget Approval',
            );
            expect(await uniswapBA.fromTokens(0)).to.be.eq(ADDRESS_ETH);
            expect(await uniswapBA.allowAllToTokens()).to.be.eq(true);
            expect(await uniswapBA.allowAnyAmount()).to.be.eq(true);
            expect(await uniswapBA.totalAmount()).to.be.eq(
                ethers.BigNumber.from('0'),
            );
            expect(await uniswapBA.amountPercentage()).to.be.eq(100);
        });
        it('init with params with complex setting successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                uniswapBAImpl.address,
                UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        fromTokens: [ADDRESS_ETH],
                        allowAllToTokens: false,
                        toTokens: [mockToken.address],
                        allowAnyAmount: false,
                        totalAmount: ethers.BigNumber.from('1000'),
                        amountPercentage: 50,
                        baseCurrency: ADDRESS_ETH,
                    }),
                ),
            );
            const uniswapBA = await ethers.getContractAt(
                'UniswapV3LiquidBudgetApproval',
                contract.address,
            );

            expect(await uniswapBA.name()).to.be.eq(
                'Uniswap V3 Liquid Budget Approval',
            );
            expect(await uniswapBA.fromTokens(0)).to.be.eq(ADDRESS_ETH);
            expect(await uniswapBA.allowAllToTokens()).to.be.eq(false);
            expect(await uniswapBA.toTokensMapping(mockToken.address)).to.be.eq(
                true,
            );
            expect(await uniswapBA.allowAnyAmount()).to.be.eq(false);
            expect(await uniswapBA.totalAmount()).to.be.eq(
                ethers.BigNumber.from('1000'),
            );
            expect(await uniswapBA.amountPercentage()).to.be.eq(50);
        });
        it('throws "Duplicated token in target token list" error if toTokens duplicated', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToTokens: false,
                            toTokens: [mockToken.address, mockToken.address],
                        }),
                    ),
                ),
            ).to.be.revertedWith('Duplicated token');
        });
    });

    describe('executeParams()', async () => {
        let uniswapBA;
        beforeEach(async () => {
            const contract = await ERC1967Proxy.deploy(
                uniswapBAImpl.address,
                UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser(),
                ),
            );
            uniswapBA = await ethers.getContractAt(
                'UniswapV3LiquidBudgetApproval',
                contract.address,
            );
        });
        it('describes execute params', async () => {
            expect(await uniswapBA.executeParams()).to.be.deep.equal([
                'address to',
                'bytes data',
                'uint256 value',
            ]);
        });
    });

    describe('execute()', async () => {
        context('allow limited absolute amount', async () => {
            let uniswapBA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: true,
                            toAddresses: [],
                            allowAnyAmount: false,
                            totalAmount: 100,
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapV3LiquidBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns(
                    '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a',
                );
            });

            it('allows user to swap under allow amount', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    99,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('allows user to swap equal allow amount', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    100,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('allows user to swap amount twice', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    50,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('throws "AmountLimitExceeded" error if the 1st time outflow exceeds amount limit', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    101,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.be.revertedWith('Exceeded max amount');
            });

            it('throws "AmountLimitExceeded" error if the 2nd time outflow exceeds amount limit', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    50,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;

                const encodeV2SwapExactInData2 = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    51,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput2 = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData2],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput2),
                ).to.be.revertedWith('Exceeded max amount');
            });
        });

        context('allow limited percentage of token', async () => {
            let uniswapBA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            fromTokens: [ADDRESS_ETH],
                            amountPercentage: 25,
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapV3LiquidBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to swap under allow percentage amount', async () => {
                await network.provider.send('hardhat_setBalance', [
                    executee.address,
                    '0xC8',
                ]);

                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    50,
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('allows user to swap equal allow percentage amount', async () => {
                await network.provider.send('hardhat_setBalance', [
                    executee.address,
                    '0x64',
                ]);

                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    25, // 25% of 0x64 = 25
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('allows user to swap percentage amount twice', async () => {
                await network.provider.send('hardhat_setBalance', [
                    executee.address,
                    '0x32',
                ]);

                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10, // 25% of 0x32 = 12.5
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('throws "Exceeded percentage" if swap exceeds percentage limit', async () => {
                await network.provider.send('hardhat_setBalance', [
                    executee.address,
                    '0x32',
                ]);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    40, // 25% of 0x32 = 12.5
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.be.revertedWith('Exceeded percentage');
            });
        });

        context('allow limited fromTokens', async () => {
            let uniswapBA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            fromTokens: [ADDRESS_ETH],
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapV3LiquidBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to swap fromToken', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10, // 25% of 0x32 = 12.5
                    10,
                    [ADDRESS_ETH, mockTokenB.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('throws "Source token not whitelisted" if swap not whitelisted token', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10, // 25% of 0x32 = 12.5
                    10,
                    [mockTokenB.address, mockToken.address], // mockTokenB is not whitelisted
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.be.revertedWith('Source token not whitelisted');
            });
        });

        context('allow limited toTokens', async () => {
            let uniswapBA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            fromTokens: [ADDRESS_ETH],
                            allowAllToTokens: false,
                            toTokens: [mockTokenB.address],
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapV3LiquidBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to swap to toTokens', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10, // 25% of 0x32 = 12.5
                    10,
                    [ADDRESS_ETH, mockTokenB.address], // mockTokenB is not whitelisted
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.not.be.reverted;
            });

            it('throws "Target token not whitelisted" error if swap to not whitelisted token', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10, // 25% of 0x32 = 12.5
                    10,
                    [ADDRESS_ETH, mockToken.address], // mockTokenB is not whitelisted
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(uniswapBA, executor, encodeExecuteInput),
                ).to.be.revertedWith('Target token not whitelisted');
            });
        });

        context(
            'decode different combination of executions - Source ETH',
            async () => {
                let uniswapBA;
                beforeEach(async () => {
                    const contract = await ERC1967Proxy.deploy(
                        uniswapBAImpl.address,
                        UniswapV3LiquidBudgetApproval.interface.encodeFunctionData(
                            'initialize',
                            initializeParser({
                                fromTokens: [ADDRESS_ETH],
                                allowAllToTokens: false,
                                toTokens: [mockToken.address],
                            }),
                        ),
                    );
                    uniswapBA = await ethers.getContractAt(
                        'UniswapV3LiquidBudgetApproval',
                        contract.address,
                    );
                    executee.executeByBudgetApproval.returns(
                        '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a',
                    );
                });

                it('ETH (exact) to mockToken', async () => {
                    const encodeWrapETHData = encodeWrapETH(
                        RECIPIENT_UNISWAP,
                        10,
                    );

                    const encodeV2SwapExactOutData = encodeV2SwapExactOut(
                        RECIPIENT_EXECUTER,
                        10, // 25% of 0x32 = 12.5
                        10,
                        [ADDRESS_WETH, mockToken.address], // mockTokenB is not whitelisted
                    );

                    const encodeExecuteInput = encodeExecuteData(
                        UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN +
                            (UNISWAP_COMMAND_TYPE.WRAP_ETH << 8),
                        [encodeWrapETHData, encodeV2SwapExactOutData],
                    );
                    await expect(
                        executeUniswapBA(
                            uniswapBA,
                            executor,
                            encodeExecuteInput,
                            10,
                        ),
                    ).to.not.be.reverted;
                });

                it('ETH to mockToken (exact)', async () => {
                    const encodeWrapETHData = encodeWrapETH(
                        RECIPIENT_UNISWAP,
                        10,
                    );

                    const encodeV2SwapExactInData = encodeV2SwapExactIn(
                        RECIPIENT_EXECUTER,
                        10, // 25% of 0x32 = 12.5
                        10,
                        [ADDRESS_WETH, mockToken.address], // mockTokenB is not whitelisted
                    );

                    const encodeUnwrapWETHData = encodeUnwrapWETH(
                        RECIPIENT_EXECUTER,
                        0,
                    );

                    const encodeExecuteInput = encodeExecuteData(
                        UNISWAP_COMMAND_TYPE.UNWRAP_WETH +
                            (UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_IN << 8) +
                            (UNISWAP_COMMAND_TYPE.WRAP_ETH << 16),
                        [
                            encodeWrapETHData,
                            encodeV2SwapExactInData,
                            encodeUnwrapWETHData,
                        ],
                    );
                    await expect(
                        executeUniswapBA(
                            uniswapBA,
                            executor,
                            encodeExecuteInput,
                            10,
                        ),
                    ).to.not.be.reverted;
                });
            },
        );
    });
});
