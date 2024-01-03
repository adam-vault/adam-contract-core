const { expect } = require('chai');
const { ethers, testUtils } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const {
    getCreateTransferLiquidErc20TokenBAParams,
} = require('../../utils/paramsStruct');

const { createTokens, createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');
const { ADDRESS_ETH } = require('../utils/constants');
const { setMockFeedRegistry } = require('../utils/mockFeedRegistryHelper');
const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('Integration - TransferLiquidERC20BudgetApproval.sol - test/integration/TransferLiquidERC20BudgetApproval.js', async () => {
    let adam;
    let dao;
    let transferLiquidERC20BAImplementation;
    let budgetApproval;
    let executor;
    let approver;
    let receiver;
    let daoSigner;
    let tokenA;
    let feedRegistry;
    let ethereumChainlinkPriceGateway;

    before(async () => {
        [executor, approver, receiver, daoCreator] = await ethers.getSigners();

        ({ tokenA } = await createTokens());

        feedRegistry = (
            await setMockFeedRegistry([
                {
                    token1: tokenA.address,
                    token2: ADDRESS_ETH,
                    price: parseEther('1'),
                    decimal: 8,
                },
            ])
        ).feedRegistry;

        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway.address;
        transferLiquidERC20BAImplementation =
            result.transferLiquidERC20BudgetApproval;

        const tx1 = await adam.connect(daoCreator).createDao(
            ...paramsStruct.getCreateDaoParams({
                depositTokens: [ADDRESS_ETH, tokenA.address],
                priceGateways: [ethereumChainlinkPriceGateway],
            }),
        );
        const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
        dao = await ethers.getContractAt('Dao', daoAddr);
        daoSigner = await testUtils.address.impersonate(dao.address);
    });

    beforeEach(async () => {
        await testUtils.address.setBalance(dao.address, parseEther('1'));
    });

    describe('On Treasury', async () => {
        let budgetApprovalAddress;
        before(async () => {
            const initData =
                transferLiquidERC20BAImplementation.interface.encodeFunctionData(
                    'initialize',
                    getCreateTransferLiquidErc20TokenBAParams({
                        dao: dao.address,
                        executor: executor.address,
                        approvers: [approver.address],
                        tokens: [ADDRESS_ETH, tokenA.address],
                        toAddresses: [receiver.address],
                        minApproval: 1,
                        usageCount: 10,
                    }),
                );
            await dao.connect(daoCreator).join(daoCreator.address);
            const tx = await dao
                .connect(daoCreator)
                .createBudgetApprovals(
                    [transferLiquidERC20BAImplementation.address],
                    [initData],
                );
            budgetApprovalAddress = (
                await findEventArgs(tx, 'CreateBudgetApproval')
            ).budgetApproval;
            budgetApproval = await ethers.getContractAt(
                'TransferLiquidERC20BudgetApproval',
                budgetApprovalAddress,
            );
        });
        beforeEach(async () => {
            await dao
                .connect(daoCreator)
                .join(daoCreator.address, { value: parseEther('200') });
        });

        it('creates Liquid ERC 20 BA', async () => {
            expect(await dao.budgetApprovals(budgetApprovalAddress)).to.eq(
                true,
            );
        });

        it('transfer ETH should success', async () => {
            const transactionData = abiCoder.encode(
                await budgetApproval.executeParams(),
                [ADDRESS_ETH, receiver.address, parseEther('10')],
            );

            const tx = await budgetApproval
                .connect(executor)
                .createTransaction(
                    [transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    false,
                    '',
                );
            const { id } = await findEventArgs(tx, 'CreateTransaction');

            const originalBalance = await receiver.getBalance();
            await budgetApproval.connect(approver).approveTransaction(id, '');
            await budgetApproval.connect(executor).executeTransaction(id);

            expect(await receiver.getBalance()).to.eq(
                originalBalance.add(parseEther('10')),
            );
        });

        it('transfer ERC 20 should success', async () => {
            await tokenA.mint(dao.address, parseEther('10'));
            const transactionData = abiCoder.encode(
                await budgetApproval.executeParams(),
                [tokenA.address, receiver.address, parseEther('10')],
            );

            await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, 1);

            const tx = await budgetApproval
                .connect(executor)
                .createTransaction(
                    [transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    false,
                    '',
                );
            const { id } = await findEventArgs(tx, 'CreateTransaction');

            await budgetApproval.connect(approver).approveTransaction(id, '');
            await budgetApproval.connect(executor).executeTransaction(id);

            expect(await tokenA.balanceOf(dao.address)).to.eq(parseEther('0'));
            expect(await tokenA.balanceOf(receiver.address)).to.eq(
                parseEther('10'),
            );
        });

        it('transfer 0 amount should not success', async () => {
            await tokenA.mint(dao.address, parseEther('10'));
            const transactionData = abiCoder.encode(
                await budgetApproval.executeParams(),
                [tokenA.address, receiver.address, parseEther('10')],
            );

            await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, 0);

            const tx = await budgetApproval
                .connect(executor)
                .createTransaction(
                    [transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    false,
                    '',
                );
            const { id } = await findEventArgs(tx, 'CreateTransaction');

            await budgetApproval.connect(approver).approveTransaction(id, '');
            await expect(
                budgetApproval.connect(executor).executeTransaction(id),
            ).to.be.revertedWithCustomError(
                budgetApproval,
                'InvalidAmountZero',
            );
        });

        it('transfer multiple ETH should success', async () => {
            const transactionData = abiCoder.encode(
                await budgetApproval.executeParams(),
                [ADDRESS_ETH, receiver.address, parseEther('10')],
            );
            const tx = await budgetApproval
                .connect(executor)
                .createTransaction(
                    [transactionData, transactionData],
                    Math.round(Date.now() / 1000) + 86400,
                    false,
                    '',
                );
            const { id } = await findEventArgs(tx, 'CreateTransaction');

            const originalBalance = await receiver.getBalance();
            await budgetApproval.connect(approver).approveTransaction(id, '');
            await budgetApproval.connect(executor).executeTransaction(id);

            expect(await receiver.getBalance()).to.eq(
                originalBalance.add(parseEther('20')),
            );
        });
    });
});
