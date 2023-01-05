const ethers = require('ethers');
const fileReader = require('../utils/fileReader');
const { gasFeeConfig } = require('../utils/getGasInfo');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';

  const dao = await get('Dao');
  const membership = await get('Membership');
  const liquidPool = await get('LiquidPool');
  const memberToken = await get('MemberToken');
  const team = await get('Team');
  const govern = await get('Govern');

  const budgetApprovalsAddress = (await Promise.all([
    get('TransferLiquidERC20BudgetApproval'),
    get('TransferERC721BudgetApproval'),
    get('TransferERC20BudgetApproval'),
    get('UniswapAnyTokenBudgetApproval'),
    get('UniswapLiquidBudgetApproval'),
  ])).map((deployment) => deployment.address);

  const daoBeacon = await deploy('DaoBeacon', {
    from: deployer,
    log: true,
    args: [
      'v2',
      [
        [ethers.utils.id('adam.dao'), dao.address],
        [ethers.utils.id('adam.dao.membership'), membership.address],
        [ethers.utils.id('adam.dao.member_token'), memberToken.address],
        [ethers.utils.id('adam.dao.liquid_pool'), liquidPool.address],
        [ethers.utils.id('adam.dao.govern'), govern.address],
        [ethers.utils.id('adam.dao.team'), team.address],
      ]
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
          ],
        },
      },
    },
  });
};

module.exports.tags = [
  'Adam',
  'phase5',
];
