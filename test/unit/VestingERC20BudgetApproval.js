const chai = require('chai');
const { ethers, network, testUtils } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('VestingERC20BudgetApproval.sol - test/unit/v2/VestingERC20BudgetApproval.js', async () => {
    let executor;
    let receiver;
    let team;
    let mockToken;
    let executee;
    let executeeAsSigner;
    let VestingERC20BudgetApproval;
    let ERC1967Proxy;
    let vestingErc20BAImpl;

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
            params.token,
            params.toAddress,
            params.cliffPeriod,
            params.cyclePeriod,
            params.cycleCount,
            params.cycleTokenAmount,
            params.initTokenAmount,
        ];
    }

    function encodeTxData(amount) {
        return abiCoder.encode(['uint256 amount'], [amount]);
    }

    function encodeTransferData(to, amount) {
        return mockToken.interface.encodeFunctionData('transfer', [to, amount]);
    }

    before(async () => {
        [executor, receiver] = await ethers.getSigners();
        VestingERC20BudgetApproval = await ethers.getContractFactory(
            'VestingERC20BudgetApproval',
        );
        vestingErc20BAImpl = await VestingERC20BudgetApproval.deploy();
    });

    beforeEach(async () => {
        executee = await smock.fake('MockBudgetApprovalExecutee');
        mockToken = await smock.fake('ERC20');
        team = await smock.fake('Team');
        executee.team.returns(team.address);
        await testUtils.address.setBalance(
            executee.address,
            ethers.utils.parseEther('1'),
        );

        executeeAsSigner = await testUtils.address.impersonate(
            executee.address,
        );
        ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', {
            signer: executeeAsSigner,
        });
    });

    describe('initialize()', async () => {
        const getNormalParams = () => ({
            token: mockToken.address,
            toAddress: receiver.address,
            cliffPeriod: ethers.BigNumber.from(86400),
            cyclePeriod: ethers.BigNumber.from(86400 * 2),
            cycleCount: ethers.BigNumber.from(3),
            cycleTokenAmount: ethers.BigNumber.from(20),
            initTokenAmount: ethers.BigNumber.from(100),
        });
        it('initialized with normal params successfully', async () => {
            const contract = await ERC1967Proxy.deploy(
                vestingErc20BAImpl.address,
                VestingERC20BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        ...getNormalParams(),
                    }),
                ),
            );
            const vestingErc20BA = await ethers.getContractAt(
                'VestingERC20BudgetApproval',
                contract.address,
            );

            expect(await vestingErc20BA.name()).to.be.eq(
                'Vesting ERC20 Budget Approval',
            );
            expect(await vestingErc20BA.releasedAmount()).to.be.eq(0);
            expect(await vestingErc20BA.remainingAmount()).to.be.eq(160);
            expect(await vestingErc20BA.totalAmount()).to.be.eq(160);
        });
        it('initialized failed for invalid cycle token amount or cycle period', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    vestingErc20BAImpl.address,
                    VestingERC20BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            ...getNormalParams(),
                            ...{ cycleTokenAmount: ethers.BigNumber.from(0) },
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                VestingERC20BudgetApproval,
                'InvalidCycleTokenAmount',
            );
        });
        it('initialized failed for invalid cycle token amount or cycle period', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    vestingErc20BAImpl.address,
                    VestingERC20BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            ...getNormalParams(),
                            ...{ cyclePeriod: ethers.BigNumber.from(0) },
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                VestingERC20BudgetApproval,
                'InvalidCyclePeriod',
            );
        });
        it('initialized ignores cycle token amount and cycle period if no cycle defined', async () => {
            const contract = await ERC1967Proxy.deploy(
                vestingErc20BAImpl.address,
                VestingERC20BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        ...getNormalParams(),
                        ...{
                            cliffPeriod: ethers.BigNumber.from(0),
                            cyclePeriod: ethers.BigNumber.from(0),
                            cycleTokenAmount: ethers.BigNumber.from(0),
                            cycleCount: ethers.BigNumber.from(0),
                        },
                    }),
                ),
            );
            const vestingErc20BA = await ethers.getContractAt(
                'VestingERC20BudgetApproval',
                contract.address,
            );

            expect(await vestingErc20BA.name()).to.be.eq(
                'Vesting ERC20 Budget Approval',
            );
            expect(await vestingErc20BA.releasedAmount()).to.be.eq(0);
            expect(await vestingErc20BA.remainingAmount()).to.be.eq(100);
            expect(await vestingErc20BA.totalAmount()).to.be.eq(100);
        });
        it('initialized failed if vesting period shorter than cliff period', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    vestingErc20BAImpl.address,
                    VestingERC20BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            ...getNormalParams(),
                            ...{
                                cliffPeriod: ethers.BigNumber.from(86400 * 7),
                            },
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                VestingERC20BudgetApproval,
                'VestingPeriodShorterThanCliffPeriod',
            );
        });
        it('initialized failed if vesting period shorter than cliff period', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    vestingErc20BAImpl.address,
                    VestingERC20BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            ...getNormalParams(),
                            ...{
                                cliffPeriod: ethers.BigNumber.from(86400 * 7),
                            },
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                VestingERC20BudgetApproval,
                'VestingPeriodShorterThanCliffPeriod',
            );
        });
        it('initialized failed if total vesting amount is 0', async () => {
            await expect(
                ERC1967Proxy.deploy(
                    vestingErc20BAImpl.address,
                    VestingERC20BudgetApproval.interface.encodeFunctionData(
                        'initialize',
                        initializeParser({
                            ...getNormalParams(),
                            ...{
                                cycleCount: ethers.BigNumber.from(0),
                                cliffPeriod: ethers.BigNumber.from(0),
                                cycleTokenAmount: ethers.BigNumber.from(0),
                                initTokenAmount: ethers.BigNumber.from(0),
                            },
                        }),
                    ),
                ),
            ).to.be.revertedWithCustomError(
                VestingERC20BudgetApproval,
                'InvalidVestingAmount',
            );
        });
    });

    describe('executeParams()', async () => {
        let vestingErc20BA;
        beforeEach(async () => {
            const contract = await ERC1967Proxy.deploy(
                vestingErc20BAImpl.address,
                VestingERC20BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        token: mockToken.address,
                        toAddress: receiver.address,
                        cliffPeriod: ethers.BigNumber.from(86400),
                        cyclePeriod: ethers.BigNumber.from(86400 * 2),
                        cycleCount: ethers.BigNumber.from(3),
                        cycleTokenAmount: ethers.BigNumber.from(20),
                        initTokenAmount: ethers.BigNumber.from(100),
                    }),
                ),
            );
            vestingErc20BA = await ethers.getContractAt(
                'VestingERC20BudgetApproval',
                contract.address,
            );
        });

        it('describes execute params', async () => {
            expect(await vestingErc20BA.executeParams()).to.be.deep.equal([
                'uint256 amount',
            ]);
        });
    });

    describe('Contract Methods', async () => {
        const deployVestingERC20BA = async (
            period,
            {
                cliffPeriod,
                cyclePeriod,
                cycleCount,
                cycleTokenAmount,
                initTokenAmount,
            },
        ) => {
            let startTime;

            switch (period) {
                case 'beforeStart':
                    startTime = Math.round(Date.now() / 1000 + 86400);
                    break;
                case 'firstCycle':
                    startTime = Math.round(
                        Date.now() / 1000 - (cyclePeriod ?? 0) * 0 - 7200,
                    );
                    break;
                case 'secondCycle':
                    startTime = Math.round(
                        Date.now() / 1000 - (cyclePeriod ?? 0) * 1 - 7200,
                    );
                    break;
                case 'thirdCycle':
                    startTime = Math.round(
                        Date.now() / 1000 - (cyclePeriod ?? 0) * 2 - 7200,
                    );
                    break;
                case 'afterVestingPeriod':
                    startTime = Math.round(
                        Date.now() / 1000 -
                            (cyclePeriod ?? 0) * cycleCount -
                            7200,
                    );
                    break;
                case 'oneYearAfterVestingPeriod':
                    startTime = Math.round(
                        Date.now() / 1000 -
                            (cyclePeriod ?? 0) * cycleCount -
                            30 * 86400 * 12,
                    );
                    break;
                default:
                    startTime = undefined;
                    break;
            }

            const contract = await ERC1967Proxy.deploy(
                vestingErc20BAImpl.address,
                VestingERC20BudgetApproval.interface.encodeFunctionData(
                    'initialize',
                    initializeParser({
                        startTime: ethers.BigNumber.from(startTime),
                        token: mockToken.address,
                        toAddress: receiver.address,
                        cliffPeriod: ethers.BigNumber.from(cliffPeriod),
                        cyclePeriod: ethers.BigNumber.from(cyclePeriod),
                        cycleCount: ethers.BigNumber.from(cycleCount),
                        cycleTokenAmount:
                            ethers.BigNumber.from(cycleTokenAmount),
                        initTokenAmount: ethers.BigNumber.from(initTokenAmount),
                    }),
                ),
            );

            const vestingErc20BA = await ethers.getContractAt(
                'VestingERC20BudgetApproval',
                contract.address,
            );
            return vestingErc20BA;
        };

        const testCases = [
            {
                desc: 'No cycle; No cliff; 100 initial token -- releasable after budget start',
                param: {
                    cliffPeriod: 0,
                    cyclePeriod: 0,
                    cycleCount: 0,
                    cycleTokenAmount: 0,
                    initTokenAmount: 100,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 100,
                        totalAmount: 100,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 100,
                        totalAmount: 100,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 100,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 100,
                        totalAmount: 100,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 100,
                    },
                },
            },
            {
                desc: '1 Month vesting period, 1 cycle, No cliff, 0 initial token',
                param: {
                    cliffPeriod: 0,
                    cyclePeriod: 86400 * 30,
                    cycleCount: 1,
                    cycleTokenAmount: 20,
                    initTokenAmount: 0,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 20,
                        totalAmount: 20,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 20,
                        totalAmount: 20,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 0,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 20,
                        totalAmount: 20,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 20,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 20,
                        totalAmount: 20,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 20,
                    },
                },
            },
            {
                desc: 'Two year vesting period; Monthly cycle; No cliff; 0 initial token',
                param: {
                    cliffPeriod: 0,
                    cyclePeriod: 86400 * 30,
                    cycleCount: 24,
                    cycleTokenAmount: 20,
                    initTokenAmount: 0,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 0,
                    },
                    secondCycle: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 20,
                    },
                    thirdCycle: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 40,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 480,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 480,
                        totalAmount: 480,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 480,
                    },
                },
            },
            {
                desc: 'Two year vesting period; Monthly cycle; No cliff; 100 initial token',
                param: {
                    cliffPeriod: 0,
                    cyclePeriod: 86400 * 30,
                    cycleCount: 24,
                    cycleTokenAmount: 20,
                    initTokenAmount: 100,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 100,
                    },
                    secondCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 120,
                    },
                    thirdCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 140,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                },
            },
            {
                desc: 'Three year vesting period; Quarterly cycle; half year cliff; 0 initial token -- start release after 2nd cycle',
                param: {
                    cliffPeriod: 86400 * 30 * 6,
                    cyclePeriod: 86400 * 30 * 3,
                    cycleCount: 12,
                    cycleTokenAmount: 20,
                    initTokenAmount: 0,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    secondCycle: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    thirdCycle: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 40,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 240,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 240,
                        totalAmount: 240,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 240,
                    },
                },
            },
            {
                desc: 'Two year vesting period; Monthly cycle; 2 months cliff; 100 initial token',
                param: {
                    cliffPeriod: 86400 * 30 * 2,
                    cyclePeriod: 86400 * 30,
                    cycleCount: 24,
                    cycleTokenAmount: 20,
                    initTokenAmount: 100,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    secondCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    thirdCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 140,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                },
            },
            {
                desc: 'Two year vesting period; Monthly cycle; 1 year cliff; 100 initial token',
                param: {
                    cliffPeriod: 86400 * 30 * 12,
                    cyclePeriod: 86400 * 30,
                    cycleCount: 24,
                    cycleTokenAmount: 20,
                    initTokenAmount: 100,
                },
                expected: {
                    beforeStart: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    firstCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    secondCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    thirdCycle: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: false,
                        currentReleasableAmount: 0,
                    },
                    afterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                    oneYearAfterVestingPeriod: {
                        remainingAmount: 580,
                        totalAmount: 580,
                        releasedAmount: 0,
                        isCliffPassed: true,
                        currentReleasableAmount: 580,
                    },
                },
            },
        ];

        testCases.forEach((testCase) => {
            context(`Vesting schedule: ${testCase.desc}`, async () => {
                Object.entries(testCase.expected).forEach(
                    ([currentSituation, expectedResult]) => {
                        context(`During: ${currentSituation}`, async () => {
                            let vestingERC20BA;
                            beforeEach(async () => {
                                vestingERC20BA = await deployVestingERC20BA(
                                    currentSituation,
                                    testCase.param,
                                );
                            });

                            it('remainingAmount() returns correct result', async () => {
                                expect(
                                    await vestingERC20BA.remainingAmount(),
                                ).to.be.equal(expectedResult.remainingAmount);
                            });
                            it('totalAmount() returns correct result', async () => {
                                expect(
                                    await vestingERC20BA.totalAmount(),
                                ).to.be.equal(expectedResult.totalAmount);
                            });
                            it('releasedAmount() returns correct result', async () => {
                                expect(
                                    await vestingERC20BA.releasedAmount(),
                                ).to.be.equal(expectedResult.releasedAmount);
                            });
                            it('isCliffPassed() returns correct result', async () => {
                                expect(
                                    await vestingERC20BA.isCliffPassed(),
                                ).to.be.equal(expectedResult.isCliffPassed);
                            });
                            it('currentReleasableAmount() returns correct result', async () => {
                                expect(
                                    await vestingERC20BA.currentReleasableAmount(),
                                ).to.be.equal(
                                    expectedResult.currentReleasableAmount,
                                );
                            });

                            describe('execute()', async () => {
                                if (currentSituation === 'beforeStart') {
                                    it('throws if cliff not passed', async () => {
                                        await expect(
                                            vestingERC20BA
                                                .connect(executor)
                                                .createTransaction(
                                                    [encodeTxData(1)],
                                                    Math.round(
                                                        Date.now() / 1000,
                                                    ) + 86400,
                                                    true,
                                                    'comment',
                                                ),
                                        ).to.be.revertedWithCustomError(
                                            vestingERC20BA,
                                            'BudgetNotStarted',
                                        );
                                    });
                                } else if (!expectedResult.isCliffPassed) {
                                    it('throws if cliff not passed', async () => {
                                        await expect(
                                            vestingERC20BA
                                                .connect(executor)
                                                .createTransaction(
                                                    [encodeTxData(1)],
                                                    Math.round(
                                                        Date.now() / 1000,
                                                    ) + 86400,
                                                    true,
                                                    'comment',
                                                ),
                                        ).to.be.revertedWithCustomError(
                                            vestingERC20BA,
                                            'CliffPeriodNotPassed',
                                        );
                                    });
                                } else {
                                    it('throws if request amount larger than current releasable amount', async () => {
                                        await expect(
                                            vestingERC20BA
                                                .connect(executor)
                                                .createTransaction(
                                                    [
                                                        encodeTxData(
                                                            expectedResult.currentReleasableAmount +
                                                                1,
                                                        ),
                                                    ],
                                                    Math.round(
                                                        Date.now() / 1000,
                                                    ) + 86400,
                                                    true,
                                                    'comment',
                                                ),
                                        ).to.be.revertedWithCustomError(
                                            vestingERC20BA,
                                            'InsufficientReleasableToken',
                                        );
                                    });
                                    if (
                                        expectedResult.currentReleasableAmount >
                                        0
                                    ) {
                                        it('passes if cliff period passed and request amount less than current releasable amount', async () => {
                                            await expect(
                                                vestingERC20BA
                                                    .connect(executor)
                                                    .createTransaction(
                                                        [
                                                            encodeTxData(
                                                                expectedResult.currentReleasableAmount -
                                                                    1,
                                                            ),
                                                        ],
                                                        Math.round(
                                                            Date.now() / 1000,
                                                        ) + 86400,
                                                        true,
                                                        'comment',
                                                    ),
                                            ).to.not.be.reverted;

                                            executee.executeByBudgetApproval
                                                .atCall(0)
                                                .should.be.calledWith(
                                                    mockToken.address,
                                                    encodeTransferData(
                                                        receiver.address,
                                                        expectedResult.currentReleasableAmount -
                                                            1,
                                                    ),
                                                    BigNumber.from('0'),
                                                );
                                        });
                                        it('passes if cliff period passed and request amount equal than current releasable amount', async () => {
                                            await expect(
                                                vestingERC20BA
                                                    .connect(executor)
                                                    .createTransaction(
                                                        [
                                                            encodeTxData(
                                                                expectedResult.currentReleasableAmount,
                                                            ),
                                                        ],
                                                        Math.round(
                                                            Date.now() / 1000,
                                                        ) + 86400,
                                                        true,
                                                        'comment',
                                                    ),
                                            ).to.not.be.reverted;

                                            executee.executeByBudgetApproval
                                                .atCall(0)
                                                .should.be.calledWith(
                                                    mockToken.address,
                                                    encodeTransferData(
                                                        receiver.address,
                                                        expectedResult.currentReleasableAmount,
                                                    ),
                                                    BigNumber.from('0'),
                                                );
                                        });
                                        it('can be released multiple times', async () => {
                                            // Release max - 10 tokens
                                            const toRelease1 =
                                                expectedResult.currentReleasableAmount -
                                                10;
                                            const toRelease2 = 10;

                                            await expect(
                                                vestingERC20BA
                                                    .connect(executor)
                                                    .createTransaction(
                                                        [
                                                            encodeTxData(
                                                                toRelease1,
                                                            ),
                                                        ],
                                                        Math.round(
                                                            Date.now() / 1000,
                                                        ) + 86400,
                                                        true,
                                                        'comment',
                                                    ),
                                            ).to.not.be.reverted;

                                            executee.executeByBudgetApproval
                                                .atCall(0)
                                                .should.be.calledWith(
                                                    mockToken.address,
                                                    encodeTransferData(
                                                        receiver.address,
                                                        toRelease1,
                                                    ),
                                                    BigNumber.from('0'),
                                                );

                                            // currentReleasableAmount should be 10
                                            expect(
                                                await vestingERC20BA.remainingAmount(),
                                            ).to.be.equal(
                                                expectedResult.totalAmount -
                                                    toRelease1,
                                            );
                                            expect(
                                                await vestingERC20BA.totalAmount(),
                                            ).to.be.equal(
                                                expectedResult.totalAmount,
                                            );
                                            expect(
                                                await vestingERC20BA.releasedAmount(),
                                            ).to.be.equal(toRelease1);
                                            expect(
                                                await vestingERC20BA.isCliffPassed(),
                                            ).to.be.equal(
                                                expectedResult.isCliffPassed,
                                            );
                                            expect(
                                                await vestingERC20BA.currentReleasableAmount(),
                                            ).to.be.equal(10);

                                            // Release the remaining 10
                                            await expect(
                                                vestingERC20BA
                                                    .connect(executor)
                                                    .createTransaction(
                                                        [encodeTxData(10)],
                                                        Math.round(
                                                            Date.now() / 1000,
                                                        ) + 86400,
                                                        true,
                                                        'comment',
                                                    ),
                                            ).to.not.be.reverted;

                                            executee.executeByBudgetApproval
                                                .atCall(1)
                                                .should.be.calledWith(
                                                    mockToken.address,
                                                    encodeTransferData(
                                                        receiver.address,
                                                        10,
                                                    ),
                                                    BigNumber.from('0'),
                                                );

                                            // currentReleasableAmount should be 0
                                            expect(
                                                await vestingERC20BA.remainingAmount(),
                                            ).to.be.equal(
                                                expectedResult.totalAmount -
                                                    toRelease1 -
                                                    toRelease2,
                                            );
                                            expect(
                                                await vestingERC20BA.totalAmount(),
                                            ).to.be.equal(
                                                expectedResult.totalAmount,
                                            );
                                            expect(
                                                await vestingERC20BA.releasedAmount(),
                                            ).to.be.equal(
                                                toRelease1 + toRelease2,
                                            );
                                            expect(
                                                await vestingERC20BA.isCliffPassed(),
                                            ).to.be.equal(
                                                expectedResult.isCliffPassed,
                                            );
                                            expect(
                                                await vestingERC20BA.currentReleasableAmount(),
                                            ).to.be.equal(0);
                                        });
                                    }
                                }
                            });
                        });
                    },
                );
            });
        });
    });
});
