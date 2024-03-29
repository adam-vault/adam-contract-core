const ethers = require('ethers');
const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, get, read, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    const deployNetwork = hre.network.name || 'goerli';

    const dao = await get('Dao');
    const membership = await get('Membership');
    const liquidPool = await get('LiquidPool');
    const memberToken = await get('MemberToken');
    const team = await get('Team');
    const govern = await get('Govern');
    const accountingSystem = await get('AccountingSystem');

    const budgetApprovalsAddress = (
        await Promise.all([
            get('TransferLiquidERC20BudgetApproval'),
            get('TransferERC721BudgetApproval'),
            get('TransferERC20BudgetApproval'),
            get('UniswapAnyTokenBudgetApproval'),
            get('UniswapLiquidBudgetApproval'),
            get('VestingERC20BudgetApproval'),
            get('DepositRewardBudgetApproval'),
        ])
    ).map((deployment) => deployment.address);

    let priceGateway;

    if (deployNetwork.includes('mumbai') || deployNetwork.includes('polygon')) {
        priceGateway = await get('PolygonChainlinkPriceGateway');
    } else {
        priceGateway = await get('EthereumChainlinkPriceGateway');
    }

    const daoBeacon = await deploy('DaoBeacon', {
        from: deployer,
        log: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
        args: [
            process.env.DAO_VERSION || 'v3.0.0',
            [
                [ethers.utils.id('adam.dao'), dao.address],
                [ethers.utils.id('adam.dao.membership'), membership.address],
                [ethers.utils.id('adam.dao.member_token'), memberToken.address],
                [ethers.utils.id('adam.dao.liquid_pool'), liquidPool.address],
                [ethers.utils.id('adam.dao.govern'), govern.address],
                [ethers.utils.id('adam.dao.team'), team.address],
                [
                    ethers.utils.id('adam.dao.accounting_system'),
                    accountingSystem.address,
                ],
            ],
        ],
    });

    const adam = await deploy('Adam', {
        from: deployer,
        log: true,
        args: [],
        skipIfAlreadyDeployed: true,
        gasLimit: 5000000,
        ...(await gasFeeConfig()),
        proxy: {
            proxyContract: 'ERC1967Proxy',
            proxyArgs: ['{implementation}', '{data}'],
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [
                        daoBeacon.address,
                        budgetApprovalsAddress,
                        [priceGateway.address],
                    ],
                },
            },
        },
    });

    if ((await read('Adam', 'daoBeacon')) !== daoBeacon.address) {
        await execute(
            'Adam',
            { from: deployer, log: true, ...(await gasFeeConfig()) },
            'setDaoBeacon',
            daoBeacon.address,
        );
    }

    const contractAddresses = {
        adam: adam.address,
        daoBeacon: daoBeacon.address,
    };

    console.log(contractAddresses);

    fileReader.save('deploy-results', 'results.json', {
        network: deployNetwork.split('-')[0],
        block_number: adam.receipt.blockNumber,
        addresses: contractAddresses,
        initdata_addresses: {},
    });
};

module.exports.tags = ['phase3'];
