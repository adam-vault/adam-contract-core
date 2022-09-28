const fileReader = require('../utils/fileReader');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployNetwork = hre.network.name || 'kovan';

  const dao = await get('Dao');
  const membership = await get('Membership');
  const liquidPool = await get('LiquidPool');
  const memberToken = await get('MemberToken');
  const team = await get('Team');
  const governFactory = await get('GovernFactory');
  const govern = await get('Govern');

  const budgetApprovalsAddress = (
    await Promise.all([
      get('TransferLiquidERC20BudgetApproval'),
      get('LiquidUniswapBudgetApproval'),
      get('TransferERC721BudgetApproval'),
      get('TransferERC20BudgetApproval'),
      get('UniswapBudgetApproval'),
    ])
  ).map((deployment) => deployment.address);

  const adam = await deploy('Adam', {
    from: deployer,
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    gasLimit: 5000000,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            dao.address,
            membership.address,
            liquidPool.address,
            memberToken.address,
            budgetApprovalsAddress,
            governFactory.address,
            team.address,
          ],
        },
      },
    },
  });

  const contractAddresses = {
    adam: adam.address,
    dao: dao.address,
    membership: membership.address,
    governFactory: governFactory.address,
    govern: govern.address,
    memberToken: memberToken.address,
    liquidPool: liquidPool.address,
    transferLiquidERC20BudgetApproval: budgetApprovalsAddress[0],
    liquidUniswapBudgetApproval: budgetApprovalsAddress[1],
    transferErc721BudgetApproval: budgetApprovalsAddress[2],
    transferERC20BudgetApproval: budgetApprovalsAddress[3],
    uniswapBudgetApproval: budgetApprovalsAddress[4],
    team: team.address,
  };

  console.log(contractAddresses);

  fileReader.save('deploy-results', 'results.json', {
    network: deployNetwork.split('-')[0],
    block_number: adam.receipt.blockNumber,
    addresses: contractAddresses,
    initdata_addresses: {},
  });
};

module.exports.tags = [
  'Adam',
  'phase5',
];
