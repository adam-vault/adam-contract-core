module.exports = {
    skipFiles: [
        'mocks/MockAggregatorV3.sol',
        'mocks/MockBudgetApprovalExecutee.sol',
        'mocks/MockDaoV2.sol',
        'mocks/MockFeedRegistry.sol',
        'mocks/MockLPDao.sol',
        'mocks/MockPriceResolver.sol',
        'mocks/MockToken.sol',
        'mocks/MockWETH9.sol',

        'tests/TokenA.sol',
        'tests/TokenB.sol',
        'tests/TokenC721.sol',
        'tests/TokenD1155.sol',
    ],
    // solcOptimizerDetails: {
    //     yul: true,
    //     yulDetails: {
    //       stackAllocation: true,
    //     },
    // },
};