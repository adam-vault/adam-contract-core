const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('Dao', {
        from: deployer,
        log: true,
        gasLimit: 7000000,
        ...(await gasFeeConfig()),
    });
    await deploy('Team', {
        from: deployer,
        log: true,
        gasLimit: 7000000,
        ...(await gasFeeConfig()),
    });
    await deploy('Membership', {
        from: deployer,
        log: true,
        gasLimit: 6000000,
        ...(await gasFeeConfig()),
    });
    await deploy('LiquidPool', {
        from: deployer,
        log: true,
        gasLimit: 7000000,
        ...(await gasFeeConfig()),
    });
    await deploy('MemberToken', {
        from: deployer,
        log: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
    });
    await deploy('Team', {
        from: deployer,
        log: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
    });
    await deploy('Govern', {
        from: deployer,
        log: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
    });
    await deploy('AccountingSystem', {
        from: deployer,
        log: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
    });
};

module.exports.tags = ['phase1'];
