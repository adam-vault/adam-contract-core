// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const fileReader = require('../utils/fileReader');

const deployBudgetApprovals = async () => {
  const TransferLiquidERC20BudgetApproval = await hre.ethers.getContractFactory('TransferLiquidERC20BudgetApproval');
  const transferLiquidERC20BudgetApproval = await TransferLiquidERC20BudgetApproval.deploy();
  await transferLiquidERC20BudgetApproval.deployed();
  console.log(`Deployed TransferLiquidERC20BudgetApproval ${transferLiquidERC20BudgetApproval.address}`);

  const UniswapBudgetApproval = await hre.ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();
  console.log(`Deployed UniswapBudgetApproval ${uniswapBudgetApproval.address}`);

  const TransferERC721BudgetApproval = await hre.ethers.getContractFactory('TransferERC721BudgetApproval');
  const transferERC721BudgetApproval = await TransferERC721BudgetApproval.deploy();
  await transferERC721BudgetApproval.deployed();
  console.log(`Deployed TransferERC721BudgetApproval ${transferERC721BudgetApproval.address}`);

  const TransferERC20BudgetApproval = await hre.ethers.getContractFactory('TransferERC20BudgetApproval');
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();
  console.log(`Deployed TransferERC20BudgetApproval ${transferERC20BudgetApproval.address}`);

  return [transferLiquidERC20BudgetApproval.address, uniswapBudgetApproval.address, transferERC721BudgetApproval.address, transferERC20BudgetApproval.address];
};

const deployGovernFactory = async () => {
  const GovernFactory = await hre.ethers.getContractFactory('GovernFactory');
  const Govern = await hre.ethers.getContractFactory('Govern');

  const govern = await Govern.deploy();
  await govern.deployed();
  console.log(`Deployed Govern ${govern.address}`);

  const governFactory = await hre.upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  console.log(`Deployed GovernFactory ${governFactory.address}`);

  return [governFactory.address, govern.address];
};

const deployTeam = async () => {
  const Team = await hre.ethers.getContractFactory('Team');
  const team = await hre.upgrades.deployProxy(Team, { kind: 'uups' });
  console.log(`Deployed Team ${team.address}`);

  return team.address;
};

async function main () {
  // Gather Current Block Number
  console.log('Deploy contracts to ', hre.network.name);
  const deployNetwork = hre.network.name ?? 'kovan';

  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log('Current Block Number', blockNumber);

  const NETWORK_CONSTANTS = fileReader.load(`constant/${deployNetwork}.json`, 'utf-8');

  const budgetApprovalsAddress = await deployBudgetApprovals();
  const governInfo = await deployGovernFactory();
  const team = await deployTeam();

  const Dao = await hre.ethers.getContractFactory('Dao');
  const Membership = await hre.ethers.getContractFactory('Membership');
  const Adam = await hre.ethers.getContractFactory('Adam');
  const LiquidPool = await hre.ethers.getContractFactory('LiquidPool');
  const MemberToken = await hre.ethers.getContractFactory('MemberToken');

  const dao = await Dao.deploy();
  await dao.deployed();
  console.log(`Deployed DAO ${dao.address}`);

  const membership = await Membership.deploy();
  await membership.deployed();
  console.log(`Deployed Membership ${membership.address}`);

  const liquidPool = await LiquidPool.deploy();
  await liquidPool.deployed();
  console.log(`Deployed LiquidPool ${liquidPool.address}`);

  const memberToken = await MemberToken.deploy();
  await memberToken.deployed();
  console.log(`Deployed MemberToken ${memberToken.address}`);

  const adam = await hre.upgrades.deployProxy(Adam, [
    dao.address, membership.address, liquidPool.address, memberToken.address,
    budgetApprovalsAddress, governInfo[0],
    team,
  ], { kind: 'uups' });
  await adam.deployed();
  console.log(`Deployed Adam ${adam.address}`);

  // Gather Contract Addresses
  const contractAddresses = {
    adam: adam.address,
    dao: dao.address,
    membership: membership.address,
    memberToken: memberToken.address,
    liquidPool: liquidPool.address,
    governFactory: governInfo[0],
    govern: governInfo[1],
    transferLiquidERC20BudgetApproval: budgetApprovalsAddress[0],
    uniswapBudgetApproval: budgetApprovalsAddress[1],
    transferErc721BudgetApproval: budgetApprovalsAddress[2],
    transferERC20BudgetApproval: budgetApprovalsAddress[3],
    team,
  };
  console.log('Contract Addresses', contractAddresses);

  // Output Deployment Info as file
  fileReader.save('deploy-result', 'results.json', {
    network: deployNetwork,
    block_number: blockNumber,
    addresses: contractAddresses,
    initdata_addresses: {},
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
