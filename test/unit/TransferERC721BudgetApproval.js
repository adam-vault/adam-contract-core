const chai = require('chai');
const { ethers, upgrades, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('TransferERC721BudgetApprovalV2.sol - test/unit/v2/TransferERC721BudgetApprovalV2.js', async () => {
    let creator;
    let executor;
    let receiver;
    let mockToken;
    let team;
    let executee;
    let executeeAsSigner;
    let TransferERC721BudgetApproval;
    let ERC1967Proxy;
    let transferErc721BAImpl;

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
            params.allowAllToAddresses !== undefined
                ? params.allowAllToAddresses
                : true,
            params.toAddresses || [],
            params.allowAllTokens !== undefined ? params.allowAllTokens : true,
            params.tokens || [],
            params.allowAnyAmount !== undefined ? params.allowAnyAmount : true,
            params.totalAmount || 0,
            params.toTeamIds || [],
        ];
    }

    function encodeTxData(token, receiver, tokenId) {
        return abiCoder.encode(
            ['address token', 'address to', 'uint256 tokenId'],
            [token, receiver, tokenId],
        );
    }

    function encodeTransferData(from, to, tokenId) {
        return mockToken.interface.encodeFunctionData(
            'safeTransferFrom(address,address,uint256)',
            [from, to, tokenId],
        );
    }

    beforeEach(async () => {
        [creator, executor, receiver] = await ethers.getSigners();

        team = await smock.fake('Team');
        executee = await (
            await smock.mock('MockBudgetApprovalExecutee')
        ).deploy();
        executee.team.returns(team.address);

        mockToken = await smock.fake('ERC721');

        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [executee.address],
        });

        await network.provider.send('hardhat_setBalance', [
            executee.address,
            '0x10000000000000000000000000000',
        ]);

        executeeAsSigner = await ethers.getSigner(executee.address);
        TransferERC721BudgetApproval = await ethers.getContractFactory(
            'TransferERC721BudgetApproval',
            { signer: executeeAsSigner },
        );
        ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', {
            signer: executeeAsSigner,
        });

        transferErc721BAImpl = await TransferERC721BudgetApproval.deploy();
    });

    describe('initialize()', async () => {
        it('init with params with the least setting successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                transferErc721BAImpl.address,
                TransferERC721BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        allowAllToAddresses: true,
                        toAddresses: [],
                        allowAllTokens: true,
                        tokens: [],
                        allowAnyAmount: true,
                        totalAmount: 0,
                    }),
                ),
            );
            const transferErc721BA = await ethers.getContractAt(
                'TransferERC721BudgetApproval',
                contract.address,
            );

            expect(await transferErc721BA.name()).to.be.eq(
                'Transfer ERC721 Budget Approval',
            );
            expect(await transferErc721BA.allowAllAddresses()).to.be.eq(true);
            expect(await transferErc721BA.allowAllTokens()).to.be.eq(true);
            expect(await transferErc721BA.tokensLength()).to.be.eq(
                ethers.BigNumber.from('0'),
            );
            expect(await transferErc721BA.allowAnyAmount()).to.be.eq(true);
            expect(await transferErc721BA.totalAmount()).to.be.eq(
                ethers.BigNumber.from('0'),
            );
        });

        it('init with params with complex setting successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                transferErc721BAImpl.address,
                TransferERC721BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        allowAllToAddresses: false,
                        toAddresses: [],
                        toTeamIds: [1],
                        allowAllTokens: false,
                        tokens: [mockToken.address],
                        allowAnyAmount: false,
                        totalAmount: ethers.BigNumber.from('1000'),
                    }),
                ),
            );
            const transferErc721BA = await ethers.getContractAt(
                'TransferERC721BudgetApproval',
                contract.address,
            );

            expect(await transferErc721BA.name()).to.be.eq(
                'Transfer ERC721 Budget Approval',
            );
            expect(await transferErc721BA.allowAllAddresses()).to.be.eq(false);
            expect(await transferErc721BA.toTeamIds(0)).to.be.eq(1);
            expect(await transferErc721BA.toTeamIdsMapping(1)).to.be.eq(true);
            expect(await transferErc721BA.allowAllTokens()).to.be.eq(false);
            expect(await transferErc721BA.allowAnyAmount()).to.be.eq(false);
            expect(await transferErc721BA.totalAmount()).to.be.eq(
                ethers.BigNumber.from('1000'),
            );
        });

        it('throws "RecipientAlreadyAdded" error if toAddresses duplicated', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            toAddresses: [creator.address, creator.address],
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                TransferERC721BudgetApproval,
                'RecipientAlreadyAdded',
            );
        });

        it('throws "TokenAlreadyAdded" error if tokens duplicated', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            tokens: [mockToken.address, mockToken.address],
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                TransferERC721BudgetApproval,
                'TokenAlreadyAdded',
            );
        });

        it('throws "TeamAlreadyAdded" error if toTeams duplicated', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: false,
                            toTeamIds: [10, 10],
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                TransferERC721BudgetApproval,
                'TeamAlreadyAdded',
            );
        });
    });

    describe('executeParams()', async () => {
        let transferErc721BA;
        beforeEach(async () => {
            const contract = await ERC1967Proxy.deploy(
                transferErc721BAImpl.address,
                TransferERC721BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser(),
                ),
            );
            transferErc721BA = await ethers.getContractAt(
                'TransferERC721BudgetApproval',
                contract.address,
            );
        });

        it('describes execute params', async () => {
            expect(await transferErc721BA.executeParams()).to.be.deep.equal([
                'address token',
                'address to',
                'uint256 tokenId',
            ]);
        });
    });

    describe('execute()', async () => {
        context('allow limited absolute amount', async () => {
            let transferErc721BA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: true,
                            toAddresses: [],
                            allowAllTokens: true,
                            tokens: [],
                            allowAnyAmount: false,
                            totalAmount: 3,
                        }),
                    ),
                );
                transferErc721BA = await ethers.getContractAt(
                    'TransferERC721BudgetApproval',
                    contract.address,
                );

                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to transfer under allow amount', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;

                executee.executeByBudgetApproval
                    .atCall(0)
                    .should.be.calledWith(
                        mockToken.address,
                        encodeTransferData(
                            executee.address,
                            receiver.address,
                            1,
                        ),
                        BigNumber.from('0'),
                    );
            });

            it('allows user to transfer equal allow amount', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    2,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;
            });

            it('allows user to transfer amount twice', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    2,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;

                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    3,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;
            });

            it('throws "AmountLimitExceeded" error if the 1st time outflow exceeds amount limit', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    2,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    3,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    4,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.be.revertedWithCustomError(
                    transferErc721BA,
                    'AmountLimitExceeded',
                );
            });

            it('throws "AmountLimitExceeded" error if the 2nd time outflow exceeds amount limit', async () => {
                await transferErc721BA
                    .connect(executor)
                    .createTransaction(
                        [
                            encodeTxData(
                                mockToken.address,
                                receiver.address,
                                1,
                            ),
                            encodeTxData(
                                mockToken.address,
                                receiver.address,
                                2,
                            ),
                        ],
                        Math.round(Date.now() / 1000) + 86400,
                        true,
                        '',
                    );

                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    3,
                                ),
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    4,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.be.revertedWithCustomError(
                    transferErc721BA,
                    'AmountLimitExceeded',
                );
            });
        });

        context('allow limited toAddresses', async () => {
            let transferErc721BA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: false,
                            toAddresses: [receiver.address],
                        }),
                    ),
                );
                transferErc721BA = await ethers.getContractAt(
                    'TransferERC721BudgetApproval',
                    contract.address,
                );

                executee.executeByBudgetApproval.returns('0x');
            });

            it('allows user to transfer to whitelisted address', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;
            });

            it('throws "InvalidRecipient" error if send to non-permitted receiver', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    executor.address,
                                    1,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.be.revertedWithCustomError(
                    transferErc721BA,
                    'InvalidRecipient',
                );
            });
        });

        context('allow limited tokens contract', async () => {
            let transferErc721BA;
            let unknownToken;

            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllTokens: false,
                            tokens: [mockToken.address],
                        }),
                    ),
                );
                transferErc721BA = await ethers.getContractAt(
                    'TransferERC721BudgetApproval',
                    contract.address,
                );

                executee.executeByBudgetApproval.returns('0x');
                unknownToken = await smock.fake('ERC721');
            });

            it('allows user to transfer to whitelisted address', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    1,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;
            });

            it('throws "Token not whitelisted in budget" error if send to non-permitted receiver', async () => {
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    unknownToken.address,
                                    receiver.address,
                                    1,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.be.revertedWithCustomError(
                    transferErc721BA,
                    'InvalidToken',
                );
            });
        });

        context('allow limited toTeamIds', async () => {
            let transferErc721BA;
            beforeEach(async () => {
                const contract = await ERC1967Proxy.deploy(
                    transferErc721BAImpl.address,
                    TransferERC721BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            allowAllToAddresses: false,
                            toTeamIds: [10],
                        }),
                    ),
                );
                transferErc721BA = await ethers.getContractAt(
                    'TransferERC721BudgetApproval',
                    contract.address,
                );
                await executee.setVariables({
                    _budgetApprovals: {
                        [contract.address]: true,
                    },
                });
            });

            it('allows user to transfer to member of whitelisted team', async () => {
                team.balanceOfBatch
                    .whenCalledWith([receiver.address], [10])
                    .returns([1]);

                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    50,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.not.be.reverted;
            });

            it('throws "InvalidRecipient" error if send to non-member of whitelisted team', async () => {
                team.balanceOfBatch
                    .whenCalledWith([receiver.address], [10])
                    .returns([0]);
                await expect(
                    transferErc721BA
                        .connect(executor)
                        .createTransaction(
                            [
                                encodeTxData(
                                    mockToken.address,
                                    receiver.address,
                                    50,
                                ),
                            ],
                            Math.round(Date.now() / 1000) + 86400,
                            true,
                            '',
                        ),
                ).to.be.revertedWithCustomError(
                    transferErc721BA,
                    'InvalidRecipient',
                );
            });
        });
    });
});
