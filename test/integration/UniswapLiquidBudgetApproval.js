const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { getCreateUniswapBAParams } = require('../../utils/paramsStruct');
const { setMockUniswapRouter } = require('../utils/mockUniswapRouterHelper');
const {
    ADDRESS_ETH,
    ADDRESS_UNISWAP_ROUTER,
    ADDRESS_WETH,
} = require('../utils/constants');

const {
    encodeV2SwapExactOut,
    UNISWAP_COMMAND_TYPE,
} = require('../utils/uniswapV3PayloadEncoder');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - UniswapLiquidBudgetApproval.sol - test/integration/UniswapLiquidBudgetApproval.js', async () => {
    let uniswapLiquidBAImplementation;
    let budgetApproval;
    let uniswapRouter;
    let accountingSystem;
    let team;
    let executor;
    let approver;
    let tokenA;
    let executee;
    let UniswapLiquidBudgetApproval;
    let WETH;

    function encodeTxData(to, data, value) {
        return abiCoder.encode(
            ['address to', 'bytes data', 'uint256 value'],
            [to, data, value],
        );
    }

    function encodeExecuteData(commands, datas) {
        return uniswapRouter.interface.encodeFunctionData(
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

    /*
    instead of creating whole Adam and a Dao to test the budget approval, 
    we can just mock the executee contract and test the budget approval directly
    */
    beforeEach(async () => {
        [executor, approver] = await ethers.getSigners();

        ({ tokenA } = await createTokens());

        UniswapLiquidBudgetApproval = await ethers.getContractFactory(
            'UniswapLiquidBudgetApproval',
            { signer: executor },
        );
        uniswapLiquidBAImplementation =
            await UniswapLiquidBudgetApproval.deploy();

        accountingSystem = await (
            await smock.mock('AccountingSystem')
        ).deploy();
        team = await (await smock.mock('Team')).deploy();
        accountingSystem.isSupportedPair.returns(true);

        executee = await (
            await smock.mock('MockBudgetApprovalExecutee')
        ).deploy();

        await executee.setVariable(
            '_accountingSystem',
            accountingSystem.address,
        );
        await executee.setVariable('_team', team.address);

        uniswapRouter = await setMockUniswapRouter();
        const wethArticfact = require('../../artifacts/contracts/mocks/MockWETH9.sol/MockWETH9');
        await ethers.provider.send('hardhat_setCode', [
            ADDRESS_WETH,
            wethArticfact.deployedBytecode,
        ]);
        WETH = await ethers.getContractAt('MockWETH9', ADDRESS_WETH);
    });

    describe('Create Budget Approval', async () => {
        it('creates Uniswap Budget Appproval', async () => {
            const startTime = Math.round(Date.now() / 1000) - 86400;
            const endTime = Math.round(Date.now() / 1000) + 86400;
            const initData =
                UniswapLiquidBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    getCreateUniswapBAParams({
                        dao: executee.address,
                        executor: executor.address,
                        allowUnlimitedUsageCount: true,
                        approvers: [approver.address],
                        fromTokens: [ADDRESS_ETH, ADDRESS_WETH],
                        toTokens: [ADDRESS_ETH, ADDRESS_WETH],
                        allowAnyAmount: true,
                        totalAmount: ethers.utils.parseEther('0'),
                        amountPercentage: '100',
                        startTime,
                        endTime,
                        minApproval: 1,
                    }),
                );
            const tx = await executee.createBudgetApprovals(
                [uniswapLiquidBAImplementation.address],
                [initData],
            );
            const { budgetApproval: budgetApprovalAddress } =
                await findEventArgs(tx, 'CreateBudgetApproval');

            budgetApproval = await ethers.getContractAt(
                'UniswapLiquidBudgetApproval',
                budgetApprovalAddress,
            );

            expect(await budgetApproval.executee()).to.eq(executee.address);
            expect(await budgetApproval.executor()).to.eq(executor.address);
            expect(
                await budgetApproval.approversMapping(approver.address),
            ).to.eq(true);
            expect(await budgetApproval.minApproval()).to.eq(1);

            expect(await budgetApproval.fromTokens(0)).to.eq(ADDRESS_ETH);
            expect(await budgetApproval.fromTokens(1)).to.eq(ADDRESS_WETH);
            expect(await budgetApproval.fromTokensMapping(ADDRESS_ETH)).to.eq(
                true,
            );
            expect(await budgetApproval.fromTokensMapping(ADDRESS_WETH)).to.eq(
                true,
            );

            expect(await budgetApproval.toTokensMapping(ADDRESS_ETH)).to.eq(
                true,
            );
            expect(await budgetApproval.toTokensMapping(ADDRESS_WETH)).to.eq(
                true,
            );

            expect(await budgetApproval.allowAnyAmount()).to.eq(true);
            expect(await budgetApproval.amountPercentage()).to.eq(100);

            expect(await budgetApproval.startTime()).to.eq(startTime);
            expect(await budgetApproval.endTime()).to.eq(endTime);

            expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(true);
        });
    });

    describe('Execute Transaction', async () => {
        beforeEach(async () => {
            const startTime = Math.round(Date.now() / 1000) - 86400;
            const endTime = Math.round(Date.now() / 1000) + 86400;
            const initData =
                UniswapLiquidBudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    getCreateUniswapBAParams({
                        dao: executee.address,
                        executor: executor.address,
                        allowUnlimitedUsageCount: true,
                        approvers: [],
                        fromTokens: [ADDRESS_ETH, ADDRESS_WETH, tokenA.address],
                        toTokens: [ADDRESS_ETH, ADDRESS_WETH, tokenA.address],
                        allowAnyAmount: true,
                        totalAmount: ethers.utils.parseEther('0'),
                        amountPercentage: '100',
                        startTime,
                        endTime,
                        minApproval: 0,
                    }),
                );

            const tx = await executee.createBudgetApprovals(
                [uniswapLiquidBAImplementation.address],
                [initData],
            );
            const { budgetApproval: budgetApprovalAddress } =
                await findEventArgs(tx, 'CreateBudgetApproval');

            budgetApproval = await ethers.getContractAt(
                'UniswapLiquidBudgetApproval',
                budgetApprovalAddress,
            );
            await tokenA.mint(ADDRESS_UNISWAP_ROUTER, parseEther('100'));
            await WETH.mint(ADDRESS_UNISWAP_ROUTER, parseEther('100'));

            accountingSystem.assetPrice.returns(
                ([asset, baseCurr, amount]) => amount,
            );
        });

        context('Wrap ETH', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    executee.address,
                    parseEther('200'),
                );
                const transactionData = abiCoder.encode(
                    await budgetApproval.executeParams(),
                    [ADDRESS_WETH, '0xd0e30db0', parseEther('10')],
                );

                await budgetApproval.createTransaction(
                    [transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    true,
                    '',
                );

                expect(await WETH.balanceOf(executee.address)).to.eq(
                    parseEther('10'),
                );
            });
        });

        context('Unwrap ETH', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    ADDRESS_WETH,
                    parseEther('200'),
                );
                await WETH.mint(executee.address, parseEther('1'));

                const transactionData = abiCoder.encode(
                    await budgetApproval.executeParams(),
                    [
                        ADDRESS_WETH,
                        '0x2e1a7d4d000000000000000000000000000000000000000000000000016345785d8a0000',
                        0,
                    ],
                );

                await budgetApproval.createTransaction(
                    [transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    true,
                    '',
                );

                expect(await WETH.balanceOf(executee.address)).to.eq(
                    parseEther('0.9'),
                );
            });
        });

        context('ETH => tokenA', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    uniswapRouter.address,
                    parseEther('200'),
                );
                await testUtils.address.setBalance(
                    executee.address,
                    parseEther('200'),
                );

                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    executee.address,
                    200,
                    100,
                    [ADDRESS_WETH, tokenA.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_OUT,
                    [encodeV2SwapExactInData],
                );

                await executeUniswapBA(
                    budgetApproval,
                    executor,
                    encodeExecuteInput,
                    100,
                );

                expect(await tokenA.balanceOf(executee.address)).to.eq(200);
            });
        });

        context('tokenA => ETH', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    uniswapRouter.address,
                    parseEther('200'),
                );
                await testUtils.address.setBalance(
                    executee.address,
                    parseEther('200'),
                );
                await tokenA.mint(executee.address, 200);
                const originalBalance = await ethers.provider.getBalance(
                    executee.address,
                );
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    executee.address,
                    100,
                    200,
                    [tokenA.address, ADDRESS_ETH],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_OUT,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(
                        budgetApproval,
                        executor,
                        encodeExecuteInput,
                    ),
                ).to.not.be.reverted;

                expect(
                    (await ethers.provider.getBalance(executee.address)).sub(
                        originalBalance,
                    ),
                ).to.eq(100);
            });
        });

        context('WETH => tokenA', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    uniswapRouter.address,
                    parseEther('200'),
                );
                await testUtils.address.setBalance(
                    executee.address,
                    parseEther('200'),
                );
                await WETH.mint(executee.address, 100);

                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    executee.address,
                    200,
                    100,
                    [ADDRESS_WETH, tokenA.address],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_OUT,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(
                        budgetApproval,
                        executor,
                        encodeExecuteInput,
                    ),
                ).to.not.be.reverted;

                expect(await tokenA.balanceOf(executee.address)).to.eq(200);
            });
        });

        context('tokenA => WETH', async () => {
            it('executes', async () => {
                await testUtils.address.setBalance(
                    uniswapRouter.address,
                    parseEther('200'),
                );
                await testUtils.address.setBalance(
                    executee.address,
                    parseEther('200'),
                );
                await tokenA.mint(executee.address, 200);
                const encodeV2SwapExactInData = encodeV2SwapExactOut(
                    executee.address,
                    100,
                    200,
                    [tokenA.address, ADDRESS_WETH],
                );

                const encodeExecuteInput = encodeExecuteData(
                    UNISWAP_COMMAND_TYPE.V2_SWAP_EXACT_OUT,
                    [encodeV2SwapExactInData],
                );

                await expect(
                    executeUniswapBA(
                        budgetApproval,
                        executor,
                        encodeExecuteInput,
                    ),
                ).to.not.be.reverted;
                expect(await WETH.balanceOf(executee.address)).to.eq(100);
            });
        });
    });
});
