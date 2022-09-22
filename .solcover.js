module.exports = {
    skipFiles: [
        'mocks/MockAggregatorV3.sol',
        'mocks/MockBudgetApprovalExecutee.sol',
        'mocks/MockDaoV2.sol',
        'mocks/MockDao.sol',
        'mocks/MockFeedRegistry.sol',
        'mocks/MockLPDao.sol',
        'mocks/MockPriceResolver.sol',
        'mocks/MockToken.sol',
        'mocks/MockWETH9.sol',
        'mocks/MockVersionUpgrade.sol',
        'mocks/MockLiquidPool.sol',
        'mocks/MockGovern.sol',
        'mocks/MockMembership.sol',
        'mocks/MockUniswapRouter.sol',
        'mocks/MockBudgetApproval.sol',
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