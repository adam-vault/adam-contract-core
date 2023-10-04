const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');

const { createTokens } = require('../utils/createContract');
const {
    getCreateTransferLiquidErc20TokenBAParams,
} = require('../../utils/paramsStruct');

const { ADDRESS_ETH } = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferLiquidERC20BudgetApprovalV2.sol - test Chainlink Fixed Price limit - test/unit/v2/TransferLiquidERC20BudgetApprovalV2-fixedAmountLimit.js', async () => {
    let transferLiquidERC20BAImplementation;
    let budgetApproval;
    let executor;
    let executee;
    let approver;
    let receiver;
    let team;
    let accountingSystem;
    let tokenA;

    beforeEach(async () => {
        [executor, approver, receiver] = await ethers.getSigners();

        ({ tokenA } = await createTokens());
        const TransferLiquidERC20BudgetApproval =
            await ethers.getContractFactory(
                'TransferLiquidERC20BudgetApproval',
                { signer: executor },
            );
        const Team = await ethers.getContractFactory('Team', {
            sign: executor,
        });

        team = await Team.deploy();
        accountingSystem = await smock.fake('AccountingSystem');
        accountingSystem.isSupportedPair
            .whenCalledWith(tokenA.address, ADDRESS_ETH)
            .returns(true);
        accountingSystem.isSupportedPair
            .whenCalledWith(ADDRESS_ETH, ADDRESS_ETH)
            .returns(true);
        accountingSystem.assetPrice.returns(([, , amount]) => amount);
        transferLiquidERC20BAImplementation =
            await TransferLiquidERC20BudgetApproval.deploy();
        executee = await (
            await smock.mock('MockBudgetApprovalExecutee')
        ).deploy();
        await executee.setVariable(
            '_accountingSystem',
            accountingSystem.address,
        );
        await executee.setVariable('_team', team.address);

        const initData =
            TransferLiquidERC20BudgetApproval.interface.encodeFunctionData(
                'initialize',
                getCreateTransferLiquidErc20TokenBAParams({
                    dao: executor.address,
                    executor: executor.address,
                    approvers: [approver.address],
                    tokens: [ADDRESS_ETH, tokenA.address],
                    toAddresses: [receiver.address],
                    minApproval: 1,
                    usageCount: 10,
                    team: team.address,
                    totalAmount: ethers.utils.parseEther('1'),
                }),
            );
        const tx = await executee.createBudgetApprovals(
            [transferLiquidERC20BAImplementation.address],
            [initData],
        );
        const { budgetApproval: budgetApprovalAddress } = await findEventArgs(
            tx,
            'CreateBudgetApproval',
        );
        budgetApproval = await ethers.getContractAt(
            'TransferLiquidERC20BudgetApproval',
            budgetApprovalAddress,
        );
    });

    it('can send 1 Eth', async () => {
        await executor.sendTransaction({
            to: executee.address,
            value: ethers.utils.parseEther('1'),
        });

        const transactionData = abiCoder.encode(
            await budgetApproval.executeParams(),
            [ADDRESS_ETH, receiver.address, parseEther('1')],
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

        expect(await budgetApproval.tokensLength()).to.eq(
            ethers.BigNumber.from('2'),
        );
        expect(await receiver.getBalance()).to.eq(
            originalBalance.add(ethers.utils.parseEther('1')),
        );
    });
    it('cannot send 1.1 Eth', async () => {
        await executor.sendTransaction({
            to: executee.address,
            value: ethers.utils.parseEther('1.1'),
        });

        const transactionData = abiCoder.encode(
            await budgetApproval.executeParams(),
            [ADDRESS_ETH, receiver.address, parseEther('1.1')],
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

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(
            budgetApproval.connect(executor).executeTransaction(id),
        ).to.be.revertedWithCustomError(budgetApproval, 'AmountLimitExceeded');
    });

    it('can send 10 Token', async () => {
        accountingSystem.assetPrice
            .whenCalledWith(tokenA.address, ADDRESS_ETH, parseEther('10'))
            .returns(parseEther('1'));
        await tokenA.mint(executee.address, ethers.utils.parseEther('100'));

        const transactionData = abiCoder.encode(
            await budgetApproval.executeParams(),
            [tokenA.address, receiver.address, parseEther('10')],
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

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await budgetApproval.connect(executor).executeTransaction(id);

        expect(await tokenA.balanceOf(receiver.address)).to.eq(
            ethers.utils.parseEther('10'),
        );
    });
    it('cannot send 11 Token', async () => {
        await tokenA.mint(executee.address, ethers.utils.parseEther('100'));

        const transactionData = abiCoder.encode(
            await budgetApproval.executeParams(),
            [tokenA.address, receiver.address, parseEther('11')],
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

        await budgetApproval.connect(approver).approveTransaction(id, '');
        await expect(
            budgetApproval.connect(executor).executeTransaction(id),
        ).to.be.revertedWithCustomError(budgetApproval, 'AmountLimitExceeded');
    });
});
