const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const baDeploymentOptions = {
        from: deployer,
        log: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    };

    await deploy('TransferERC721BudgetApproval', baDeploymentOptions);
    await deploy('TransferERC20BudgetApproval', baDeploymentOptions);
    await deploy('UniswapAnyTokenBudgetApproval', baDeploymentOptions);
    await deploy('VestingERC20BudgetApproval', baDeploymentOptions);
    await deploy('SelfClaimERC20BudgetApproval', baDeploymentOptions);
};

module.exports.tags = ['Adam2.0'];
