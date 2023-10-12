const chai = require('chai');
const { ethers, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { ADDRESS_UNISWAP_ROUTER } = require('../utils/constants');

const {
    encodeV2SwapExactOut,
    UNISWAP_COMMAND_TYPE,
} = require('../utils/uniswapV3PayloadEncoder');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

const RECIPIENT_EXECUTER = '0x0000000000000000000000000000000000000001';

describe('UniswapAnyTokenBudgetApproval.sol - test/unit/UniswapAnyTokenBudgetApproval.js', async () => {
    let executor;
    let mockToken;
    let mockTokenB;
    let team;
    let executee;
    let mockUniswapRouter;
    let executeeAsSigner;
    let UniswapAnyTokenBudgetApproval;
    let ERC1967Proxy;
    let uniswapBAImpl;

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
            params.allowAllFromTokens ?? true,
            params.fromToken || ethers.constants.AddressZero,
            params.allowAllToTokens ?? true,
            params.toTokens || [],
            params.allowAnyAmount ?? true,
            params.totalAmount || 0,
            params.amountPercentage || 100,
        ];
    }

    function encodeTxData(to, data, value) {
        return abiCoder.encode(
            ['address to', 'bytes data', 'uint256 value'],
            [to, data, value],
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

    function encodeExactInputSwapData(
        tokenIn,
        tokenOut,
        recipient,
        amountIn,
        amountOutMinimum,
    ) {
        const data = mockUniswapRouter.interface.encodeFunctionData(
            'exactInputSingle',
            [[tokenIn, tokenOut, 0, recipient, amountIn, amountOutMinimum, 0]],
        );

        return mockUniswapRouter.interface.encodeFunctionData(
            'multicall(uint256,bytes[])',
            [ethers.constants.MaxUint256, [data]],
        );
    }

    beforeEach(async () => {
        [executor] = await ethers.getSigners();

        team = await smock.fake('Team');
        executee = await smock.fake('MockBudgetApprovalExecutee');
        mockToken = await smock.fake('ERC20');
        mockTokenB = await smock.fake('ERC20');
        mockUniswapV3Router = await smock.fake('MockUniswapV3Router');
        executee.team.returns(team.address);
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [executee.address],
        });
        await network.provider.send('hardhat_setBalance', [
            executee.address,
            '0x10000000000000000000000000000',
        ]);

        executeeAsSigner = await ethers.getSigner(executee.address);
        UniswapAnyTokenBudgetApproval = await ethers.getContractFactory(
            'UniswapAnyTokenBudgetApproval',
            { signer: executeeAsSigner },
        );
        ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', {
            signer: executeeAsSigner,
        });

        uniswapBAImpl = await UniswapAnyTokenBudgetApproval.deploy();
    });

    describe('initialize()', async () => {
        it('init with params with the least setting successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                uniswapBAImpl.address,
                UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser(),
                ),
            );
            const uniswapBA = await ethers.getContractAt(
                'UniswapAnyTokenBudgetApproval',
                contract.address,
            );

            expect(await uniswapBA.name()).to.be.eq(
                'Uniswap Any Token Budget Approval',
            );
            expect(await uniswapBA.allowAllFromTokens()).to.be.eq(true);
            expect(await uniswapBA.fromToken()).to.be.eq(
                ethers.constants.AddressZero,
            );
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
                UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        allowAllFromTokens: false,
                        fromToken: mockToken.address,
                        allowAllToTokens: false,
                        toTokens: [mockToken.address],
                        allowAnyAmount: false,
                        totalAmount: ethers.BigNumber.from('1000'),
                        amountPercentage: 50,
                    }),
                ),
            );
            const uniswapBA = await ethers.getContractAt(
                'UniswapAnyTokenBudgetApproval',
                contract.address,
            );

            expect(await uniswapBA.name()).to.be.eq(
                'Uniswap Any Token Budget Approval',
            );
            expect(await uniswapBA.allowAllFromTokens()).to.be.eq(false);
            expect(await uniswapBA.fromToken()).to.be.eq(mockToken.address);
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
                    UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToTokens: false,
                            toTokens: [mockToken.address, mockToken.address],
                        }),
                    ),
                ),
            ).to.be.revertedWith('Duplicated token in target token list');
        });
    });

    describe('executeParams()', async () => {
        let uniswapBA;
        beforeEach(async () => {
            const contract = await ERC1967Proxy.deploy(
                uniswapBAImpl.address,
                UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser(),
                ),
            );
            uniswapBA = await ethers.getContractAt(
                'UniswapAnyTokenBudgetApproval',
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
                    UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: true,
                            toAddresses: [],
                            allowAllTokens: true,
                            allowAnyAmount: false,
                            totalAmount: 100,
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapAnyTokenBudgetApproval',
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
                    [mockToken.address, mockTokenB.address],
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
                    [mockToken.address, mockTokenB.address],
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
                    [mockToken.address, mockTokenB.address],
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
                    [mockToken.address, mockTokenB.address],
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
                    [mockToken.address, mockTokenB.address],
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
                    [mockToken.address, mockTokenB.address],
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
                    UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            amountPercentage: 25,
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapAnyTokenBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to swap under allow percentage amount', async () => {
                mockToken.balanceOf.returns(200);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    50,
                    10,
                    [mockToken.address, mockTokenB.address],
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
                mockToken.balanceOf.returns(100);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    25,
                    10,
                    [mockToken.address, mockTokenB.address],
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
                mockToken.balanceOf.returns(50);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10,
                    10,
                    [mockToken.address, mockTokenB.address],
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
                mockToken.balanceOf.returns(50);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    40,
                    10,
                    [mockToken.address, mockTokenB.address],
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

        context('allow limited fromToken', async () => {
            let uniswapBA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    uniswapBAImpl.address,
                    UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllFromTokens: false,
                            fromToken: mockToken.address,
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapAnyTokenBudgetApproval',
                    contract.address,
                );
                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to swap fromToken', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10,
                    10,
                    [mockToken.address, mockTokenB.address],
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
                    10,
                    10,
                    [mockTokenB.address, mockToken.address],
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
                    UniswapAnyTokenBudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToTokens: false,
                            toTokens: [mockTokenB.address],
                        }),
                    ),
                );
                uniswapBA = await ethers.getContractAt(
                    'UniswapAnyTokenBudgetApproval',
                    contract.address,
                );
            });

            it('allows user to swap to toTokens', async () => {
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    RECIPIENT_EXECUTER,
                    10,
                    10,
                    [mockToken.address, mockTokenB.address],
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
                    10,
                    10,
                    [mockTokenB.address, mockToken.address],
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
    });
});
