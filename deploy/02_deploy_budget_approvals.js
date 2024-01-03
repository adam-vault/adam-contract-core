const hre = require('hardhat');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('TransferERC721BudgetApproval', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
    await deploy('TransferERC20BudgetApproval', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
    await deploy('UniswapAnyTokenBudgetApproval', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
    await deploy('VestingERC20BudgetApproval', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
    await deploy('DepositRewardBudgetApproval', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
};

module.exports.tags = ['phase2'];
